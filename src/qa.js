import { RoutePilot } from "./pilot.js";
import { distance, formatTime } from "./math.js";

export function setupQA(game) {
  const panel = document.createElement("aside");
  panel.className = "qa-panel";
  panel.innerHTML =
    '<b>开发验证 · 实际物理输入</b><div><button id="qa-city">城市</button><button id="qa-coast">海岸</button><button id="qa-mountain">山路</button><button id="qa-drive">驾驶套件</button><button id="qa-collision">碰撞套件</button><button id="qa-lap">完整计时赛</button><button id="qa-stop">停止</button><button id="qa-hide">收起面板</button></div><pre id="qa-output"></pre><div id="qa-report"></div>';
  document.body.append(panel);
  let name = "空闲",
    report = [],
    pilot = null;
  const $ = (id) => document.getElementById(id);
  const setReport = (text) => {
    report.push(text);
    $("qa-report").textContent = report.join("\n");
  };
  const reset = (p) => {
    game.scriptedDriver = null;
    game.race.cancel();
    game.car.reset(p);
    game.car.nitro = 100;
    game.car.distance = 0;
    game.car.topSpeed = 0;
    game.snap = true;
    game.effects.reset();
    game.updateMode();
    game.panel("play");
  };
  $("qa-city").onclick = () => {
    name = "城市";
    reset(game.world.start);
  };
  $("qa-coast").onclick = () => {
    name = "海岸";
    reset(game.world.spawn);
  };
  $("qa-mountain").onclick = () => {
    name = "山路";
    reset(game.world.pointAt(game.world.routeLength * 0.4));
  };
  $("qa-stop").onclick = () => {
    game.scriptedDriver = null;
    game.panel("pause");
    name = "已停止";
  };
  $("qa-hide").onclick = () => {
    panel.hidden = true;
  };
  document.addEventListener("keydown", (e) => {
    if (e.code === "Backquote") panel.hidden = !panel.hidden;
  });
  $("qa-lap").onclick = () => {
    name = "完整计时赛";
    report = [];
    pilot = new RoutePilot(game.world);
    // Start tracking from the event's actual grid position, not the route origin.
    pilot.progress = game.selectedEvent.start.s;
    game.startRace();
    game.scriptedDriver = () => pilot.input(game.car);
    setReport("通过普通转向/油门输入驾驶；无位置传送。");
  };
  $("qa-collision").onclick = () => {
    name = "碰撞套件";
    report = [];
    const b = game.world.buildings.reduce((m, c) =>
        c.w * c.d > m.w * m.d ? c : m,
      ),
      edge = b.x - b.w / 2;
    reset({ x: edge - 9, z: b.z, yaw: Math.PI / 2 });
    game.car.vx = 65;
    let phase = 0,
      t = 0,
      maxImpact = 0,
      atWall = 0,
      rail = null,
      normal = null;
    game.scriptedDriver = (dt) => {
      t += dt;
      const c = game.car;
      maxImpact = Math.max(maxImpact, c.impact);
      if (phase === 0) {
        if (t > 0.5) {
          setReport(
            `建筑高速碰撞：${c.x < edge - 2 && maxImpact > 0.3 ? "PASS" : "FAIL"}`,
          );
          atWall = c.x;
          phase++;
          t = 0;
        }
        return { throttle: true };
      }
      if (phase === 1) {
        if (t > 1.6) {
          setReport(`碰撞后倒车恢复：${c.x < atWall - 2 ? "PASS" : "FAIL"}`);
          rail =
            game.world.rails.find((r) => r.x > 195 && Math.abs(r.z) < 30) ||
            game.world.rails[0];
          const near = game.world.nearestRoad(rail.x, rail.z),
            nx = Math.cos(rail.yaw),
            nz = Math.sin(rail.yaw),
            side =
              Math.sign((near.x - rail.x) * nx + (near.z - rail.z) * nz) || 1;
          normal = { x: nx * side, z: nz * side };
          c.reset({
            x: rail.x + normal.x * 9,
            z: rail.z + normal.z * 9,
            yaw: Math.atan2(-normal.x, normal.z),
          });
          c.vx = -normal.x * 65;
          c.vz = -normal.z * 65;
          game.snap = true;
          phase++;
          t = 0;
          maxImpact = 0;
        }
        return { brake: true };
      }
      if (phase === 2) {
        if (t > 0.5) {
          const gap = (c.x - rail.x) * normal.x + (c.z - rail.z) * normal.z;
          setReport(
            `护栏高速碰撞：${gap > 2 && maxImpact > 0.3 ? "PASS" : "FAIL"}`,
          );
          game.scriptedDriver = null;
          game.panel("pause");
          name = "碰撞套件完成";
        }
        return { throttle: true };
      }
      return {};
    };
  };
  $("qa-drive").onclick = () => {
    name = "驾驶套件";
    report = [];
    reset(game.world.start);
    let phase = 0,
      t = 0,
      normalSpeed = 0,
      driftMax = 0,
      brakeStart = 0;
    const finishPhase = () => {
      phase++;
      t = 0;
    };
    game.scriptedDriver = (dt) => {
      t += dt;
      const c = game.car;
      if (phase === 0) {
        if (t >= 4) {
          normalSpeed = c.speed;
          setReport(
            `加速 ${Math.round(c.speed * 3.6)} km/h：${c.speed > 30 ? "PASS" : "FAIL"}`,
          );
          finishPhase();
        }
        return { throttle: true };
      }
      if (phase === 1) {
        if (t >= 2) {
          setReport(
            `刹车 ${Math.round(c.speed * 3.6)} km/h：${c.speed < 3 ? "PASS" : "FAIL"}`,
          );
          finishPhase();
        }
        return { brake: c.forwardSpeed > 0.6 };
      }
      if (phase === 2) {
        if (t >= 1.5) {
          setReport(`倒车：${c.forwardSpeed < -3 ? "PASS" : "FAIL"}`);
          game.car.reset(game.world.start);
          game.car.nitro = 100;
          finishPhase();
        }
        return { brake: true };
      }
      if (phase === 3) {
        if (t >= 4) {
          setReport(
            `氮气 ${Math.round(c.speed * 3.6)} km/h / 剩余 ${Math.round(c.nitro)}%：${c.speed > normalSpeed * 1.15 && c.nitro < 25 ? "PASS" : "FAIL"}`,
          );
          game.car.reset(game.world.start);
          finishPhase();
        }
        return { throttle: true, nitro: true };
      }
      if (phase === 4) {
        if (t >= 2) {
          finishPhase();
        }
        return { throttle: true };
      }
      if (phase === 5) {
        driftMax = Math.max(driftMax, c.drift);
        if (t >= 0.75) {
          setReport(
            `手刹甩尾 ${driftMax.toFixed(2)}：${driftMax > 0.35 ? "PASS" : "FAIL"}`,
          );
          finishPhase();
        }
        return { throttle: true, right: true, handbrake: true };
      }
      if (phase === 6) {
        if (t >= 1.5) {
          setReport(`恢复抓地：${c.drift < 0.2 ? "PASS" : "FAIL"}`);
          game.scriptedDriver = null;
          game.panel("pause");
          name = "驾驶套件完成";
        }
        return {};
      }
      return {};
    };
  };
  let lapReported = false;
  game.onUpdate = () => {
    if (
      name === "完整计时赛" &&
      game.race.state === "finished" &&
      !lapReported
    ) {
      setReport(
        `${game.race.points.length}/${game.race.points.length} 检查点完成：PASS · ${formatTime(game.race.elapsed)}`,
      );
      lapReported = true;
    }
    if (game.race.state === "countdown") lapReported = false;
    const c = game.car;
    $("qa-output").textContent = JSON.stringify(
      {
        测试: name,
        状态: game.mode,
        FPS: game.fps,
        kmh: Math.round(c.speed * 3.6),
        nitro: Math.round(c.nitro),
        drift: +c.drift.toFixed(2),
        x: +c.x.toFixed(1),
        z: +c.z.toFixed(1),
        height: +c.y.toFixed(2),
        区域: game.world.region(c.x, c.z),
        路面: c.offroad ? "草地" : "道路",
        比赛: game.race.state,
        检查点: game.race.index,
        用时: +game.race.elapsed.toFixed(2),
        物理步数: game.steps,
        ...game.view.stats(),
        音频: game.audio.ctx?.state || "未启动",
      },
      null,
      1,
    );
  };
}
