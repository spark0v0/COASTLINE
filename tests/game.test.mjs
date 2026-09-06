import test from "node:test";
import assert from "node:assert/strict";
import { Car, Race } from "../src/physics.js";
import { WorldData } from "../src/world-data.js";
import { RoutePilot } from "../src/pilot.js";
import { distance, segmentPoint } from "../src/math.js";

const flat = {
  spawn: { x: 0, z: 0, yaw: 0 },
  height: () => 2,
  nearestRoad: () => ({ d: 0, width: 18 }),
  collide: () => {},
};
function drive(car, seconds, input) {
  for (let i = 0; i < Math.round(seconds * 120); i++)
    car.step(1 / 120, typeof input === "function" ? input(car) : input);
  return car;
}

test("usable acceleration, braking without idle creep, bounded reverse", () => {
  const c = drive(new Car(flat), 4, { throttle: true });
  assert(c.speed > 35 && c.speed < 65);
  drive(c, 2, (car) => ({ brake: car.forwardSpeed > 0.5 }));
  assert(c.speed < 1);
  drive(c, 1.5, { brake: true });
  assert(c.forwardSpeed < -5 && c.speed <= 11.01);
  const idle = drive(new Car(flat), 4, {});
  assert.equal(idle.speed, 0);
});
test("nitro is faster, consumed, recovers and does not pulse at empty", () => {
  const c = drive(new Car(flat), 4, { throttle: true }),
    boost = drive(new Car(flat), 4, { throttle: true, nitro: true });
  assert(boost.speed > c.speed * 1.2);
  assert(boost.nitro < 15);
  drive(boost, 1, { throttle: true, nitro: true });
  assert.equal(boost.nitroLocked, true);
  assert.equal(boost.boost, false);
  drive(boost, 2, {});
  assert(boost.nitro > 15);
});
test("turning, controllable drift and grip recovery", () => {
  const c = drive(new Car(flat), 2.5, { throttle: true });
  drive(c, 0.8, { throttle: true, handbrake: true, right: true });
  assert(c.x > 0);
  assert(c.drift > 0.35);
  drive(c, 1.5, {});
  assert(c.drift < 0.2);
  assert(Number.isFinite(c.y));
});
test("grass slows the vehicle", () => {
  const grass = { ...flat, nearestRoad: () => ({ d: 20, width: 18 }) },
    road = drive(new Car(flat), 5, { throttle: true }),
    off = drive(new Car(grass), 5, { throttle: true });
  assert(off.speed < road.speed * 0.6);
  assert(off.offroad);
});
test("race countdown, sequential swept checkpoints, penalties, finish and restart", () => {
  const r = new Race([
    { x: 0, z: -10, radius: 3 },
    { x: 0, z: -30, radius: 3 },
  ]);
  r.start();
  assert.equal(r.step(1, { x: 0, z: 0 }, { x: 0, z: -50 }), undefined ?? "");
  assert.equal(r.index, 0);
  r.step(2.01, { x: 0, z: 0 }, { x: 0, z: 0 });
  assert.equal(r.state, "running");
  r.step(0.1, { x: 0, z: -20 }, { x: 0, z: -40 });
  assert.equal(r.index, 0, "Cannot skip the first gate");
  r.step(0.1, { x: 0, z: 0 }, { x: 0, z: -20 });
  assert.equal(r.index, 1);
  r.resetPenalty();
  assert.equal(r.penalty, 3);
  r.step(0.1, { x: 0, z: -20 }, { x: 0, z: -40 });
  assert.equal(r.state, "finished");
  assert.equal(r.index, 2);
  r.start();
  assert.equal(r.elapsed, 0);
  assert.equal(r.index, 0);
  assert.equal(r.penalty, 0);
});

test("connected roads stay on the island and terrain is genuinely elevated", () => {
  const w = new WorldData();
  assert(w.route.every((p) => w.inside(p.x, p.z)));
  assert(w.height(-190, -240) > 40);
  assert(w.routeLength > 1600 && w.routeLength < 2000);
  const reached = new Set([0]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of w.paths) {
      if (reached.has(p.id)) continue;
      const connected = p.points.some((pt) =>
        w.roads.some(
          (r) =>
            reached.has(r.id) &&
            segmentPoint(pt.x, pt.z, r.a, r.b).d < (p.width + r.width) / 2,
        ),
      );
      if (connected) {
        reached.add(p.id);
        changed = true;
      }
    }
  }
  assert.equal(reached.size, w.paths.length);
});
test("high speed building collision blocks the whole car and reversing recovers", () => {
  const w = new WorldData();
  w.grid.clear();
  w.obstacles = [];
  w.register({ type: "box", x: 0, z: 0, w: 2, d: 30, h: 5, yaw: 0 });
  const c = new Car(w);
  c.reset({ x: -12, z: 0, yaw: Math.PI / 2 });
  c.vx = 78;
  drive(c, 0.3, { throttle: true });
  assert(c.x <= -3.12, `Car penetrated wall: ${c.x}`);
  const impactX = c.x;
  drive(c, 2, { brake: true });
  assert(c.x < impactX - 3, "Reverse should move away from collision");
});
test("rotated guardrail collision does not tunnel at nitro speed", () => {
  const w = new WorldData();
  w.grid.clear();
  w.obstacles = [];
  const yaw = 0.55;
  w.register({ type: "box", x: 0, z: 0, w: 0.4, d: 30, h: 1, yaw });
  const nx = Math.cos(yaw),
    nz = Math.sin(yaw),
    c = new Car(w);
  c.reset({ x: -nx * 12, z: -nz * 12, yaw: Math.atan2(nx, -nz) });
  c.vx = nx * 78;
  c.vz = nz * 78;
  drive(c, 0.3, { throttle: true });
  assert(c.x * nx + c.z * nz < -2.1);
  assert(Number.isFinite(c.speed));
});
test("full timed lap driven through normal physics and all 16 checkpoints", () => {
  const w = new WorldData(),
    c = new Car(w),
    r = new Race(w.checkpoints),
    p = new RoutePilot(w);
  c.reset(w.start);
  r.start();
  let hits = 0,
    rescues = 0,
    minimumSpeed = Infinity;
  for (let i = 0; i < 120 * 180 && r.state !== "finished"; i++) {
    if (r.state !== "countdown") {
      c.step(1 / 120, p.input(c));
      if (c.impact > 0.1) hits++;
      if (c.rescued) {
        rescues++;
        c.rescued = false;
      }
    }
    r.step(1 / 120, c.previous, c);
    assert(Number.isFinite(c.x + c.z + c.y));
  }
  console.log(
    JSON.stringify({
      lap: r.state,
      checkpoints: r.index,
      time: r.elapsed,
      progress: p.progress,
      position: [c.x, c.z],
      hits,
      rescues,
      distance: c.distance,
    }),
  );
  assert.equal(r.state, "finished");
  assert.equal(r.index, 16);
  assert.equal(rescues, 0);
  assert(c.distance > w.routeLength * 0.95);
  assert(hits < 30, "Route driver should not rely on wall impacts");
});
