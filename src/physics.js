import { clamp, damp, distance, segmentPoint } from "./math.js";

export class Car {
  constructor(world) {
    this.world = world;
    this.nitro = 100;
    this.distance = 0;
    this.topSpeed = 0;
    this.nitroLocked = false;
    this.reset(world.spawn);
  }
  reset(p) {
    this.x = p.x;
    this.z = p.z;
    this.yaw = p.yaw || 0;
    this.y = this.world.height(p.x, p.z) + 0.075;
    this.vx = this.vz = this.speed = this.forwardSpeed = this.steer = 0;
    this.drift =
      this.pitch =
      this.roll =
      this.bodyPitch =
      this.impact =
      this.wheelSpin =
        0;
    this.boost = this.offroad = this.rescued = this.braking = false;
    this.previous = { x: p.x, z: p.z };
  }
  step(dt, input = {}) {
    this.previous = { x: this.x, z: this.z };
    this.impact = Math.max(0, this.impact - dt * 2);
    const fx = Math.sin(this.yaw),
      fz = -Math.cos(this.yaw),
      rx = Math.cos(this.yaw),
      rz = Math.sin(this.yaw);
    let forward = this.vx * fx + this.vz * fz,
      lateral = this.vx * rx + this.vz * rz;
    const road = this.world.nearestRoad(this.x, this.z);
    this.offroad = road.d > road.width * 0.5 + 0.6;
    const speed = Math.abs(forward),
      throttle = input.throttle ? 1 : 0,
      brake = input.brake ? 1 : 0;
    if (!input.nitro || this.nitro > 18) this.nitroLocked = false;
    this.boost = !!(
      input.nitro &&
      throttle &&
      forward > 3 &&
      this.nitro > 0 &&
      !this.offroad &&
      !this.nitroLocked
    );
    this.nitro = clamp(
      this.nitro +
        (this.boost ? -24 : input.handbrake && speed > 10 ? 12 : 8) * dt,
      0,
      100,
    );
    if (this.nitro === 0) this.nitroLocked = true;
    let acceleration = 0;
    if (throttle)
      acceleration += forward < -1 ? 28 : 16.5 + (this.boost ? 15 : 0);
    if (brake) acceleration -= forward > 1 ? 31 : 8;
    acceleration -=
      Math.sign(forward) *
      (0.6 +
        0.0048 * speed * speed +
        speed * 0.025 +
        (this.offroad ? speed * 0.68 : 0));
    if (input.handbrake && speed > 2) acceleration -= Math.sign(forward) * 5.5;
    if (!throttle && !brake && speed < 0.08) forward = 0;
    else forward += acceleration * dt;
    forward = clamp(forward, -11, this.boost ? 78 : 62);
    this.braking = !!((brake && forward > 0.5) || input.handbrake);
    const turn = Number.isFinite(input.steer)
      ? clamp(input.steer, -1, 1)
      : (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.steer = damp(this.steer, turn, 8.5, dt);
    const steering = this.steer * (0.56 / (1 + speed * 0.075));
    const yawRate =
      (forward / 2.65) *
      Math.tan(steering) *
      0.77 *
      (input.handbrake && speed > 7 ? 1.45 : 1);
    this.vx = fx * forward + rx * lateral;
    this.vz = fz * forward + rz * lateral;
    this.yaw += yawRate * dt;
    const nx = Math.sin(this.yaw),
      nz = -Math.cos(this.yaw),
      sx = Math.cos(this.yaw),
      sz = Math.sin(this.yaw);
    forward = this.vx * nx + this.vz * nz;
    lateral = this.vx * sx + this.vz * sz;
    const grip = input.handbrake && speed > 7 ? 1.9 : this.offroad ? 5 : 11;
    lateral *= Math.exp(-grip * dt);
    this.vx = nx * forward + sx * lateral;
    this.vz = nz * forward + sz * lateral;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.world.collide(this);
    if (this.rescued) return;
    const front = this.world.height(this.x + nx * 1.34, this.z + nz * 1.34);
    const back = this.world.height(this.x - nx * 1.34, this.z - nz * 1.34);
    const left = this.world.height(this.x - sx, this.z - sz),
      right = this.world.height(this.x + sx, this.z + sz);
    this.y = (front + back) * 0.5 + (this.offroad ? 0.025 : 0.08);
    this.pitch = damp(this.pitch, Math.atan2(front - back, 2.68), 18, dt);
    this.roll = damp(this.roll, Math.atan2(right - left, 2), 18, dt);
    this.bodyPitch = damp(
      this.bodyPitch,
      clamp(-acceleration * 0.002, -0.04, 0.05),
      6,
      dt,
    );
    this.bodyRoll = damp(
      this.bodyRoll || 0,
      clamp(yawRate * speed * 0.0014, -0.065, 0.065),
      7,
      dt,
    );
    this.forwardSpeed = this.vx * nx + this.vz * nz;
    this.speed = Math.hypot(this.vx, this.vz);
    this.drift =
      input.handbrake && this.speed > 7
        ? clamp(Math.abs(lateral) / 6 + 0.12, 0, 1)
        : clamp((Math.abs(lateral) - 2.6) / 8, 0, 1);
    this.wheelSpin += (this.forwardSpeed * dt) / 0.37;
    this.distance += distance(this, this.previous);
    this.topSpeed = Math.max(this.topSpeed, this.speed * 3.6);
  }
}

export class Race {
  constructor(points) {
    this.points = points;
    this.cancel();
  }
  start() {
    this.state = "countdown";
    this.index = this.elapsed = this.penalty = 0;
    this.countdown = 3;
    this.splits = [];
  }
  cancel() {
    this.state = "idle";
    this.index = this.elapsed = this.penalty = this.countdown = 0;
    this.splits = [];
  }
  resetPenalty() {
    if (this.state === "running") {
      this.penalty += 3;
      this.elapsed += 3;
    }
  }
  step(dt, previous, current) {
    if (this.state === "countdown") {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.state = "running";
        return "go";
      }
      return "";
    }
    if (this.state !== "running") return "";
    this.elapsed += dt;
    const p = this.points[this.index];
    const yaw = p.yaw || 0,
      fx = Math.sin(yaw),
      fz = -Math.cos(yaw);
    const before = (previous.x - p.x) * fx + (previous.z - p.z) * fz;
    const after = (current.x - p.x) * fx + (current.z - p.z) * fz;
    const crossed = before <= 0 && after > 0;
    const fraction = crossed ? clamp(-before / (after - before), 0, 1) : 0;
    const crossingX = previous.x + (current.x - previous.x) * fraction;
    const crossingZ = previous.z + (current.z - previous.z) * fraction;
    if (crossed && Math.hypot(crossingX - p.x, crossingZ - p.z) <= p.radius) {
      this.splits.push(this.elapsed);
      this.index++;
      if (this.index === this.points.length) {
        this.state = "finished";
        return "finish";
      }
      return "checkpoint";
    }
    return "";
  }
}
