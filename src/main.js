import { WorldData } from "./world-data.js";
import { Car, Race } from "./physics.js";
import { GameRenderer } from "./renderer.js";
import { AudioEngine } from "./audio.js";
import { Effects } from "./effects.js";
import { angleDiff, distance, formatTime } from "./math.js";

const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.world = new WorldData();
    this.car = new Car(this.world);
    this.race = new Race(this.world.checkpoints);
    this.selectedEvent = this.world.events[0];
    this.discovered = new Set();
    this.view = new GameRenderer($("game"), this.world);
    this.audio = new AudioEngine();
    this.effects = new Effects(this.view.scene, this.world);
    this.mode = "welcome";
    this.keys = new Set();
    this.accumulator = 0;
    this.last = performance.now();
    this.lastDraw = 0;
    this.lastUI = 0;
    this.scheduled = null;
    this.timerKind = "raf";
    this.snap = true;
    this.simTime = 0;
    this.toastUntil = 0;
    this.goUntil = 0;
    this.best = null;
    this.fps = 0;
    this.fpsCounter = 0;
    this.fpsStart = this.last;
    this.raceTopSpeed = 0;
    this.countLast = -1;
    this.scriptedDriver = null;
    this.steps = 0;
    this.draws = 0;
    this.onUpdate = null;
    this.settings = {
      quality: "standard",
      sound: true,
      volume: 0.7,
      infiniteNitro: false,
    };
    try {
      const settings = JSON.parse(
        localStorage.getItem("coastline.preferences") || "null",
      );
      if (settings) {
        this.settings.quality = settings.quality === "low" ? "low" : "standard";
        this.settings.sound = settings.sound !== false;
        this.settings.infiniteNitro = settings.infiniteNitro === true;
        this.settings.volume = Number.isFinite(settings.volume)
          ? Math.max(0, Math.min(1, settings.volume))
          : 0.7;
      }
      const best = Number(
        localStorage.getItem("coastline.best.v3." + this.selectedEvent.id),
      );
      if (Number.isFinite(best) && best > 0) this.best = best;
      this.discovered = new Set(
        JSON.parse(localStorage.getItem("coastline.discoveries.v3") || "[]"),
      );
    } catch {}
    this.audio.enabled = this.settings.sound;
    this.audio.volume = this.settings.volume;
    this.view.setQuality(this.settings.quality);
    this.effects.low = this.settings.quality === "low";
    $("quality-select").value = this.settings.quality;
    $("sound-toggle").checked = this.settings.sound;
    this.car.infiniteNitro = this.settings.infiniteNitro;
    $("infinite-nitro-toggle").checked = this.settings.infiniteNitro;
    $("volume-slider").value = Math.round(this.settings.volume * 100);
    $("island-size").textContent =
      (this.world.routeLength / 1000).toFixed(1) + " km 环岛公路";
    this.createEvents();
    this.makeMinimap();
    this.bind();
    this.updateMode();
    this.updateHUD();
    this.panel("welcome");
    this.ready = this.view.ready.then(() => {
      $("loading-screen").hidden = true;
      const warnings = [
        this.view.vehicle.assetError,
        this.view.environmentError,
      ].filter(Boolean);
      if (warnings.length) {
        $("asset-note").hidden = false;
        $("asset-note").textContent =
          warnings.join("；") +
          "。可继续驾驶，检查资源目录后刷新可恢复完整效果。";
      }
    });
    this.render(0.1);
    this.schedule();
  }
  activeRace() {
    return this.race.state === "running" || this.race.state === "countdown";
  }
  controls() {
    return {
      throttle: this.keys.has("KeyW") || this.keys.has("ArrowUp"),
      brake: this.keys.has("KeyS") || this.keys.has("ArrowDown"),
      left: this.keys.has("KeyA") || this.keys.has("ArrowLeft"),
      right: this.keys.has("KeyD") || this.keys.has("ArrowRight"),
      handbrake: this.keys.has("Space"),
      nitro: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"),
    };
  }
  toast(text) {
    $("toast").textContent = text;
    $("toast").classList.add("show");
    this.toastUntil = performance.now() + 2600;
  }
  panel(next) {
    this.mode = next;
    this.keys.clear();
    this.accumulator = 0;
    $("modal").hidden = next === "play";
    $("welcome-panel").hidden = next !== "welcome" && next !== "help";
    $("pause-panel").hidden = next !== "pause";
    $("result-panel").hidden = next !== "result";
    $("event-panel").hidden = next !== "events";
    $("hud").inert = next !== "play";
    $("settings-button").disabled = next !== "play";
    document.body.classList.toggle(
      "in-menu",
      next === "welcome" || next === "help",
    );
    // The welcome button doubles as the way back out of the help screen.
    $("play-button").innerHTML =
      next === "help"
        ? "返回设置 <span>→</span>"
        : "出发，自由驾驶 <span>↗</span>";
    document.body.classList.remove("boosting");
    if (next === "play") {
      this.audio.start();
      document.activeElement?.blur();
    } else {
      this.audio.suspend();
      const first =
        next === "pause"
          ? $("resume-button")
          : next === "result"
            ? $("retry-button")
            : next === "events"
              ? $("event-list").querySelector("button")
              : $("play-button");
      first.focus({ preventScroll: true });
    }
    this.last = performance.now();
    this.updateHUD();
    this.schedule();
  }
  freeDrive() {
    this.race.cancel();
    this.scriptedDriver = null;
    this.updateMode();
    this.panel("play");
    this.toast("自由驾驶 · 迷你地图金线为晴湾花园路，沿路驶向海湾");
  }
  startRace() {
    this.race.points = this.selectedEvent.points;
    this.loadBest();
    this.car.reset(this.selectedEvent.start);
    this.car.nitro = 100;
    this.car.nitroLocked = false;
    this.race.start();
    this.raceAssisted = this.settings.infiniteNitro;
    this.raceTopSpeed = 0;
    this.countLast = -1;
    this.snap = true;
    this.effects.reset();
    $("race-progress").textContent = "0 / " + this.race.points.length;
    this.updateMode();
    this.panel("play");
    this.toast(
      this.selectedEvent.name +
        " · " +
        (this.selectedEvent.length / 1000).toFixed(1) +
        " km · " +
        this.race.points.length +
        " 个检查点 · 金牌 " +
        formatTime(this.selectedEvent.medals.gold),
    );
  }
  loadBest() {
    this.best = null;
    try {
      const v = Number(
        localStorage.getItem("coastline.best.v3." + this.selectedEvent.id),
      );
      if (v > 0 && Number.isFinite(v)) this.best = v;
    } catch {}
  }
  createEvents() {
    const list = $("event-list");
    list.replaceChildren();
    for (const event of this.world.events) {
      const button = document.createElement("button");
      button.className = "event-card";
      let best = null,
        medal = 0;
      try {
        best = Number(localStorage.getItem("coastline.best.v3." + event.id));
        medal =
          Number(localStorage.getItem("coastline.medal.v1." + event.id)) || 0;
      } catch {}
      button.innerHTML =
        '<span class="event-number">' +
        String(this.world.events.indexOf(event) + 1).padStart(2, "0") +
        "</span><span><strong>" +
        event.name +
        "</strong><small>" +
        event.subtitle +
        "</small><em>" +
        (event.length / 1000).toFixed(1) +
        " km · " +
        event.count +
        " 检查点 · 最佳 " +
        (best > 0 ? formatTime(best) : "等待挑战") +
        (medal ? " · " + ["", "🥉", "🥈", "🥇"][medal] : "") +
        "</em></span><b>↗</b>";
      button.onclick = () => {
        this.selectedEvent = event;
        this.scriptedDriver = null;
        this.startRace();
      };
      list.append(button);
    }
  }
  chooseEvent() {
    this.createEvents();
    this.eventReturn = this.mode;
    this.panel("events");
  }
  medalRank(elapsed) {
    const m = this.selectedEvent.medals;
    if (!m) return 0;
    return elapsed <= m.gold
      ? 3
      : elapsed <= m.silver
        ? 2
        : elapsed <= m.bronze
          ? 1
          : 0;
  }
  finish() {
    const r = this.race,
      record =
        !this.raceAssisted && (this.best === null || r.elapsed < this.best);
    if (record) {
      this.best = r.elapsed;
      try {
        localStorage.setItem(
          "coastline.best.v3." + this.selectedEvent.id,
          String(this.best),
        );
      } catch {}
    }
    const medal = this.medalRank(r.elapsed);
    if (medal > 0 && !this.raceAssisted) {
      try {
        const key = "coastline.medal.v1." + this.selectedEvent.id;
        if (medal > (Number(localStorage.getItem(key)) || 0))
          localStorage.setItem(key, String(medal));
      } catch {}
    }
    $("result-time").textContent = formatTime(r.elapsed);
    $("best-time").textContent = formatTime(this.best);
    $("result-speed").textContent = Math.round(this.raceTopSpeed) + " km/h";
    $("result-penalty").textContent = "+" + r.penalty + " 秒";
    $("result-medal").textContent = ["—", "🥉 铜牌", "🥈 银牌", "🥇 金牌"][
      medal
    ];
    $("result-route").textContent =
      this.selectedEvent.name + " · 所有检查点已通过";
    $("record-label").textContent = this.raceAssisted
      ? "无限氮气挑战完成 · 本次不计入普通纪录"
      : record
        ? "新个人纪录 · 把这一圈留给海风。"
        : "挑战完成。再次出发，刷新自己的纪录。";
    this.panel("result");
    this.scriptedDriver = null;
  }
  resetToRoad() {
    if (this.mode !== "play") return;
    const p = this.activeRace()
      ? this.world.pointAt(
          this.race.index === 0
            ? this.selectedEvent.start.s
            : this.race.points[this.race.index - 1].s,
        )
      : this.world.safeReset(this.car);
    this.race.resetPenalty();
    this.car.reset(p);
    this.effects.reset();
    this.snap = true;
    this.toast(
      this.race.state === "running"
        ? "回到上一个检查点 · 罚时 +3 秒"
        : "已回到道路",
    );
  }
  setQuality(value) {
    this.settings.quality = value === "low" ? "low" : "standard";
    this.view.setQuality(this.settings.quality);
    this.effects.low = this.settings.quality === "low";
    this.saveSettings();
    this.updateHUD();
  }
  saveSettings() {
    try {
      localStorage.setItem(
        "coastline.preferences",
        JSON.stringify(this.settings),
      );
    } catch {}
  }
  updateMode() {
    const racing = this.activeRace();
    $("mode-label").textContent = racing ? this.selectedEvent.name : "海岛漫游";
    $("race-button").hidden = racing;
    $("race-stats").hidden = !racing;
    $("checkpoint-hint").hidden = !racing;
    $("objective").textContent = racing
      ? "跟随青色路线。漏过检查点时返回补过；R 重置罚时 3 秒。"
      : "穿过棕榈街道，沿着海岸，把日常留在身后。";
  }
  bind() {
    const toggleFullscreen = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        this.toast("当前窗口不支持全屏，可在独立浏览器中打开游戏");
      }
    };
    $("fullscreen-button").onclick = toggleFullscreen;
    $("play-button").onclick = () => {
      if (this.mode === "help") {
        this.panel("pause");
        return;
      }
      if (this.mode === "welcome") {
        this.car.reset(this.world.scenicRoute.start);
        this.snap = true;
        this.effects.reset();
      }
      this.freeDrive();
    };
    $("welcome-race").onclick = () => this.chooseEvent();
    $("race-button").onclick = () => this.chooseEvent();
    $("event-close").onclick = () =>
      this.panel(this.eventReturn === "welcome" ? "welcome" : "play");
    $("choose-race-button").onclick = () => this.chooseEvent();
    $("resume-button").onclick = () => this.panel("play");
    $("settings-button").onclick = () => this.panel("pause");
    $("restart-button").onclick = () => {
      this.scriptedDriver = null;
      this.startRace();
    };
    $("free-button").onclick = () => this.freeDrive();
    $("scenic-drive-button").onclick = () => {
      this.car.reset(this.world.scenicRoute.start);
      this.effects.reset();
      this.snap = true;
      this.freeDrive();
      this.toast("晴湾花园路 · 沿金线穿过住宅街，海岸左转，前往观景停靠点");
    };
    $("retry-button").onclick = () => {
      this.scriptedDriver = null;
      this.startRace();
    };
    $("explore-button").onclick = () => this.freeDrive();
    $("help-button").onclick = () => this.panel("help");
    $("quality-select").onchange = (e) => this.setQuality(e.target.value);
    $("infinite-nitro-toggle").onchange = (e) => {
      const enabled = e.target.checked;
      this.settings.infiniteNitro = enabled;
      this.car.infiniteNitro = enabled;
      if (enabled) {
        this.car.nitro = 100;
        this.car.nitroLocked = false;
        if (this.activeRace()) this.raceAssisted = true;
      }
      this.saveSettings();
      this.updateHUD();
    };
    $("volume-slider").oninput = (e) => {
      this.settings.volume = Number(e.target.value) / 100;
      this.audio.volume = this.settings.volume;
      if (this.audio.master)
        this.audio.master.gain.value = 0.24 * this.audio.volume;
      this.saveSettings();
    };
    $("sound-toggle").onchange = (e) => {
      this.settings.sound = e.target.checked;
      this.audio.enabled = e.target.checked;
      if (!e.target.checked) this.audio.suspend();
      else if (this.mode === "play") this.audio.start();
      this.saveSettings();
    };
    const driving = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "ShiftLeft",
      "ShiftRight",
    ];
    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyF" && !e.repeat) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (e.code === "Escape") {
        e.preventDefault();
        if (e.repeat) return;
        if (this.mode === "play") this.panel("pause");
        else if (this.mode === "pause") this.panel("play");
        else if (this.mode === "help") this.panel("pause");
        else if (this.mode === "events")
          this.panel(this.eventReturn === "welcome" ? "welcome" : "play");
        return;
      }
      if (e.code === "Tab" && this.mode !== "play") {
        const panel = $("modal").querySelector("section:not([hidden])"),
          buttons = Array.from(
            panel.querySelectorAll("button,input,select"),
          ).filter((el) => !el.disabled),
          first = buttons[0],
          last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (this.mode !== "play") return;
      if (driving.includes(e.code)) {
        e.preventDefault();
        this.keys.add(e.code);
      }
      if (e.code === "KeyR" && !e.repeat) {
        e.preventDefault();
        this.resetToRoad();
      }
    });
    document.addEventListener("keyup", (e) => this.keys.delete(e.code));
    // QA sessions drive the car from scripts, so they must survive focus loss.
    const qaMode = new URLSearchParams(location.search).has("qa");
    window.addEventListener("blur", () => {
      this.keys.clear();
      if (this.mode === "play" && !qaMode) this.panel("pause");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (this.mode === "play" && !qaMode) this.panel("pause");
        this.audio.suspend();
        this.cancelSchedule();
      } else {
        this.last = performance.now();
        this.schedule();
      }
    });
    window.addEventListener("resize", () => {
      this.view.resize();
      this.snap = true;
      this.render(0.1);
    });
    $("game").addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.panel("pause");
      this.fatal(
        "显卡绘图上下文已中断，请刷新页面重新进入。已保存的个人纪录会保留。",
      );
    });
  }
  makeMinimap() {
    this.map = $("minimap");
    this.ctx = this.map.getContext("2d");
    this.mapBase = document.createElement("canvas");
    this.mapBase.width = this.map.width;
    this.mapBase.height = this.map.height;
    const ctx = this.mapBase.getContext("2d");
    ctx.fillStyle = "#1d4850";
    ctx.fillRect(0, 0, this.map.width, this.map.height);
    ctx.beginPath();
    this.world.shore.forEach((p, i) => {
      const q = this.mapPoint(p.x, p.z);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.fillStyle = "#4a6657";
    ctx.fill();
    ctx.strokeStyle = "#a5ac85";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (this.world.lake) {
      ctx.beginPath();
      this.world.lake.shore.forEach((p, i) => {
        const q = this.mapPoint(p.x, p.z);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.closePath();
      ctx.fillStyle = "#579eae";
      ctx.fill();
      ctx.strokeStyle = "#b1cfb3";
      ctx.stroke();
    }
    for (const path of this.world.paths) {
      ctx.beginPath();
      path.points.forEach((p, i) => {
        const q = this.mapPoint(p.x, p.z);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.lineWidth = path.width * 0.17;
      ctx.strokeStyle = "#263f42";
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#b5c6ab";
      ctx.stroke();
    }
    ctx.font = '9px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = "#cedec1";
    for (const region of this.world.regions) {
      const q = this.mapPoint(region.x, region.z);
      ctx.fillText(
        region.name.replace("老城", "").replace("山道", "").replace("海岸", ""),
        q.x - 15,
        q.y - 6,
      );
    }
  }
  mapPoint(x, z) {
    return {
      x:
        12 +
        ((x - this.world.bounds.minX) /
          (this.world.bounds.maxX - this.world.bounds.minX)) *
          (this.map.width - 24),
      y:
        9 +
        ((z - this.world.bounds.minZ) /
          (this.world.bounds.maxZ - this.world.bounds.minZ)) *
          (this.map.height - 18),
    };
  }
  drawMap() {
    const ctx = this.ctx;
    ctx.drawImage(this.mapBase, 0, 0);
    if (!this.activeRace() && this.world.scenicRoute) {
      ctx.beginPath();
      this.world.scenicRoute.points.forEach((p, i) => {
        const q = this.mapPoint(p.x, p.z);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.lineWidth = 2.1;
      ctx.strokeStyle = "#dbc691";
      ctx.stroke();
    }
    if (this.activeRace()) {
      ctx.beginPath();
      this.selectedEvent.route.forEach((p, i) => {
        const q = this.mapPoint(p.x, p.z);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.lineWidth = 1.7;
      ctx.strokeStyle = "#7de6cf";
      ctx.stroke();
      this.race.points.forEach((p, i) => {
        const q = this.mapPoint(p.x, p.z);
        ctx.beginPath();
        ctx.arc(q.x, q.y, i === this.race.index ? 4 : 1.7, 0, Math.PI * 2);
        ctx.fillStyle =
          i < this.race.index
            ? "#529481"
            : i === this.race.index
              ? "#eaff97"
              : "#bcdcb8";
        ctx.fill();
      });
    }
    if (!this.activeRace())
      for (const d of this.world.discoveries) {
        const q = this.mapPoint(d.x, d.z);
        ctx.fillStyle = this.discovered.has(d.id) ? "#e7ecb1" : "#c3d7d0";
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    if (!this.activeRace()) {
      const colors = {
        cafe: "#e9a788",
        surf: "#80c7d0",
        market: "#e4c782",
        transit: "#b5c8ce",
        service: "#a6bd8b",
        view: "#e5d9b6",
        tennis: "#92ccc2",
        orchard: "#d3b77c",
        allotment: "#b8c98c",
        park: "#afc4b6",
      };
      for (const place of [
        ...(this.world.places || []),
        ...(this.world.openSpaces || []),
      ]) {
        const q = this.mapPoint(place.x, place.z);
        ctx.fillStyle = colors[place.kind];
        ctx.fillRect(q.x - 1.8, q.y - 1.8, 3.6, 3.6);
      }
    }
    const p = this.mapPoint(this.car.x, this.car.z);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.car.yaw);
    ctx.beginPath();
    ctx.moveTo(0, -6.2);
    ctx.lineTo(4.4, 4.8);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.4, 4.8);
    ctx.closePath();
    ctx.fillStyle = "#f5ffa9";
    ctx.strokeStyle = "#243a3b";
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  updateHUD() {
    const car = this.car,
      r = this.race,
      now = performance.now();
    $("speed").textContent = String(Math.round(car.speed * 3.6)).padStart(
      3,
      "0",
    );
    $("speed-bar").style.width = Math.min(100, (car.speed / 78) * 100) + "%";
    $("nitro-value").textContent = this.settings.infiniteNitro
      ? "∞ 无限"
      : Math.round(car.nitro) + "%";
    $("nitro-bar").style.width = car.nitro + "%";
    $("gear").textContent =
      car.forwardSpeed < -0.3
        ? "R"
        : car.speed < 0.5
          ? "N"
          : Math.min(6, Math.floor(car.speed / 12.5) + 1);
    const region = this.world.region(car.x, car.z);
    $("region-label").textContent = region;
    $("map-location").textContent = region;
    if (this.mode === "play" && !this.activeRace()) {
      let nearby = null,
        nearest = 90;
      for (const place of [
        ...(this.world.places || []),
        ...(this.world.openSpaces || []),
      ]) {
        const d = distance(car, place);
        if (d < nearest) {
          nearby = place;
          nearest = d;
        }
      }
      if (nearby) {
        $("map-location").textContent = nearby.name;
        this.visitedPlaces ||= new Set();
        if (
          nearest < 55 &&
          !this.visitedPlaces.has(nearby.name) &&
          now > this.toastUntil
        ) {
          this.visitedPlaces.add(nearby.name);
          this.toast("途经 " + nearby.name + " · 海岛慢游");
        }
      }
    }
    $("discovery-count").textContent =
      this.discovered.size + " / " + this.world.discoveries.length + " 风景";
    if (this.mode === "play" && !this.activeRace()) {
      for (const d of this.world.discoveries)
        if (!this.discovered.has(d.id) && distance(car, d) < 48) {
          this.discovered.add(d.id);
          this.toast("发现 " + d.name + " · " + d.description);
          this.audio.beep(990, 0.18);
          try {
            localStorage.setItem(
              "coastline.discoveries.v3",
              JSON.stringify([...this.discovered]),
            );
          } catch {}
          break;
        }
      const unseen = this.world.discoveries
        .filter((d) => !this.discovered.has(d.id))
        .sort((a, b) => distance(car, a) - distance(car, b))[0];
      $("objective").textContent = unseen
        ? "下一处风景：" +
          unseen.name +
          " · " +
          (distance(car, unseen) / 1000).toFixed(1) +
          " km"
        : "风景已收集。挑选一场比赛，留下你的最佳纪录。";
      const trail = this.world.scenicRoute;
      let nearest = 35,
        index = -1;
      trail.points.forEach((p, i) => {
        const d = distance(car, p);
        if (d < nearest) {
          nearest = d;
          index = i;
        }
      });
      if (index >= 0) {
        const at = trail.stations[index];
        const section =
          at < 175
            ? "林荫住宅"
            : at < 380
              ? "社区花园"
              : at < 590
                ? "海湾展开"
                : at < trail.length - 80
                  ? "沿海弯道"
                  : "观景停靠点";
        $("region-label").textContent = section;
        $("map-location").textContent = "晴湾花园路";
        $("objective").textContent =
          at > trail.length - 80
            ? "沿支路停靠，回望晴湾海岸。"
            : "跟随金线 · 距观景点约 " + Math.round(trail.length - at) + " 米";
      }
    }
    $("surface-label").textContent = car.offroad
      ? car.sand
        ? "沙地 · 松软高速"
        : "草地 · 抓地降低"
      : "柏油路面";
    $("drift-label").style.opacity = car.drift > 0.2 ? "1" : "0";
    $("distance-travelled").textContent =
      (car.distance / 1000).toFixed(1) + " km";
    $("quality-label").textContent =
      this.settings.quality === "low" ? "低画质 · 限帧 30" : "标准画质";
    document.body.classList.toggle(
      "boosting",
      car.boost && this.mode === "play",
    );
    if (this.activeRace()) {
      $("race-time").textContent = formatTime(r.elapsed);
      $("race-progress").textContent = r.index + " / " + r.points.length;
      $("race-bar").style.width = (r.index / r.points.length) * 100 + "%";
      const p = r.points[r.index];
      $("checkpoint-distance").textContent =
        Math.round(distance(car, p)) + " m";
      $("checkpoint-arrow").style.transform =
        `rotate(${angleDiff(Math.atan2(p.x - car.x, -(p.z - car.z)), car.yaw)}rad)`;
      const heading = angleDiff(
        Math.atan2(p.x - car.x, -(p.z - car.z)),
        car.yaw,
      );
      const bend = angleDiff(
        this.world.pointAt(Math.min(this.world.routeLength, p.s + 14)).yaw,
        car.yaw,
      );
      $("turn-hint").textContent =
        Math.abs(heading) > 2.1
          ? "检查点在后方 · 请返回"
          : Math.abs(bend) > 0.52
            ? bend > 0
              ? "前方右弯 · 注意减速"
              : "前方左弯 · 注意减速"
            : "沿路线前进";
    }
    if (r.state === "countdown" && this.mode === "play") {
      $("countdown").textContent = Math.ceil(r.countdown);
      const n = Math.ceil(r.countdown);
      if (n !== this.countLast) {
        this.countLast = n;
        this.audio.beep(440, 0.1);
      }
    } else $("countdown").textContent = now < this.goUntil ? "出发" : "";
    if (now > this.toastUntil) $("toast").classList.remove("show");
    this.drawMap();
  }
  step(dt) {
    const controls = this.scriptedDriver
      ? this.scriptedDriver(dt)
      : this.controls();
    if (this.mode !== "play") return;
    this.steps++;
    this.simTime += dt;
    const car = this.car;
    if (this.race.state !== "countdown") {
      const impact = car.impact;
      car.step(dt, controls);
      if (car.impact > 0.35 && impact < 0.2) this.audio.crash();
      if (car.rescued) {
        car.rescued = false;
        if (this.activeRace()) {
          this.race.resetPenalty();
          car.reset(
            this.world.pointAt(
              this.race.index === 0
                ? this.selectedEvent.start.s
                : this.race.points[this.race.index - 1].s,
            ),
          );
        }
        this.snap = true;
        this.effects.reset();
        this.toast(
          this.activeRace() ? "已返回赛道 · 罚时 +3 秒" : "已自动回到安全道路",
        );
      }
      this.raceTopSpeed = Math.max(this.raceTopSpeed, car.speed * 3.6);
    }
    const event = this.race.step(dt, car.previous, car);
    if (event === "go") {
      this.goUntil = performance.now() + 800;
      this.audio.beep(880, 0.18);
    }
    if (event === "checkpoint") {
      this.audio.beep(740 + this.race.index * 17, 0.12);
      this.toast(
        `检查点 ${this.race.index} / ${this.race.points.length} · 继续前进`,
      );
    }
    if (event === "finish") {
      this.finish();
      return;
    }
    this.effects.step(dt, car);
    this.audio.update(car, controls, dt);
  }
  render(dt) {
    this.effects.update();
    this.view.render(
      this.car,
      this.race,
      this.mode,
      dt,
      this.simTime,
      this.snap,
    );
    this.snap = false;
    this.draws++;
  }
  cancelSchedule() {
    if (this.scheduled !== null) {
      if (this.timerKind === "raf") cancelAnimationFrame(this.scheduled);
      else clearTimeout(this.scheduled);
      this.scheduled = null;
    }
  }
  schedule() {
    if (this.scheduled !== null || document.hidden || this.failed) return;
    if (this.mode === "play") {
      this.timerKind = "raf";
      this.scheduled = requestAnimationFrame((now) => this.frame(now));
    } else {
      this.timerKind = "timer";
      this.scheduled = setTimeout(() => this.frame(performance.now()), 220);
    }
  }
  frame(now) {
    this.scheduled = null;
    if (document.hidden || this.failed) return;
    try {
      const elapsed = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      if (this.mode === "play") {
        this.accumulator += elapsed;
        let n = 0;
        while (this.accumulator >= 1 / 120 && n < 12 && this.mode === "play") {
          this.step(1 / 120);
          this.accumulator -= 1 / 120;
          n++;
        }
      }
      const minimum =
        this.mode === "play"
          ? this.settings.quality === "low"
            ? 1000 / 30
            : 1000 / 60
          : 210;
      if (now - this.lastDraw >= minimum - 1) {
        this.render(Math.min((now - this.lastDraw) / 1000, 0.22));
        this.lastDraw = now;
        this.fpsCounter++;
      }
      if (now - this.lastUI > 80) {
        this.updateHUD();
        this.onUpdate?.();
        this.lastUI = now;
      }
      if (now - this.fpsStart > 1000) {
        this.fps = Math.round((this.fpsCounter * 1000) / (now - this.fpsStart));
        this.fpsCounter = 0;
        this.fpsStart = now;
      }
    } catch (error) {
      console.error(error);
      this.fatal(error.message);
    }
    this.schedule();
  }
  fatal(message) {
    $("loading-screen").hidden = true;
    this.failed = true;
    this.cancelSchedule();
    this.audio.suspend();
    $("fatal").hidden = false;
    $("fatal-message").textContent = message;
  }
}

try {
  const game = new Game();
  // Optional in-browser verification panel: append ?qa=1 to the URL.
  if (new URLSearchParams(location.search).has("qa")) {
    window.__game = game;
    import("./qa.js").then((m) => m.setupQA(game)).catch(() => {});
  }
} catch (error) {
  console.error(error);
  $("loading-screen").hidden = true;
  $("fatal").hidden = false;
  $("fatal-message").textContent = error.stack || error.message;
}
