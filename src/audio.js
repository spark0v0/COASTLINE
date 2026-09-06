import { rng, damp } from "./math.js";
export class AudioEngine {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.rpm = 45;
    this.volume = 0.7;
  }
  async start() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        const c = (this.ctx = new Audio());
        this.master = c.createGain();
        this.master.gain.value = 0.24 * this.volume;
        const compressor = c.createDynamicsCompressor();
        this.master.connect(compressor);
        compressor.connect(c.destination);
        this.voices = [];
        for (let i = 0; i < 3; i++) {
          const oscillator = c.createOscillator(),
            gain = c.createGain(),
            filter = c.createBiquadFilter();
          oscillator.type = i === 1 ? "triangle" : "sawtooth";
          filter.type = "lowpass";
          filter.frequency.value = 350;
          gain.gain.value = i === 0 ? 0.17 : i === 1 ? 0.19 : 0.035;
          oscillator.connect(filter);
          filter.connect(gain);
          gain.connect(this.master);
          oscillator.start();
          this.voices.push({ oscillator, gain, filter });
        }
        const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate),
          channel = buffer.getChannelData(0),
          random = rng(349);
        for (let i = 0; i < channel.length; i++) channel[i] = random() * 2 - 1;
        this.noise = c.createBufferSource();
        this.noise.buffer = buffer;
        this.noise.loop = true;
        this.noiseFilter = c.createBiquadFilter();
        this.noiseFilter.type = "bandpass";
        this.noiseFilter.frequency.value = 850;
        this.noiseGain = c.createGain();
        this.noiseGain.gain.value = 0;
        this.noise.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.master);
        this.noise.start();
      }
      await this.ctx.resume();
    } catch {
      this.enabled = false;
    }
  }
  update(car, input, dt) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const c = this.ctx,
      t = c.currentTime,
      speed = Math.abs(car.forwardSpeed),
      gear = Math.min(5, 1 + Math.floor(speed / 12.5)),
      rpm = 43 + speed * 3.6 - (gear - 1) * 28;
    this.rpm = damp(this.rpm, rpm + (input.throttle ? 9 : 0), 10, dt);
    for (let i = 0; i < 3; i++) {
      this.voices[i].oscillator.frequency.setTargetAtTime(
        this.rpm * [1, 0.51, 2.01][i],
        t,
        0.035,
      );
      this.voices[i].filter.frequency.setTargetAtTime(
        220 + speed * 8 + (input.throttle ? 100 : 0),
        t,
        0.06,
      );
    }
    this.voices[0].gain.gain.setTargetAtTime(
      input.throttle ? 0.17 : 0.09,
      t,
      0.07,
    );
    this.noiseGain.gain.setTargetAtTime(
      car.drift * 0.13 +
        (car.boost ? 0.12 : 0) +
        (car.braking && speed > 10 ? 0.035 : 0) +
        speed * 0.00035,
      t,
      0.07,
    );
    this.noiseFilter.frequency.setTargetAtTime(
      car.drift > 0.15 ? 1500 : car.boost ? 800 : 390,
      t,
      0.07,
    );
  }
  beep(frequency = 600, duration = 0.12) {
    if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.value = frequency;
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(c.currentTime + duration);
  }
  crash() {
    if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
    this.beep(65, 0.09);
  }
  suspend() {
    if (this.ctx?.state === "running") this.ctx.suspend().catch(() => {});
  }
}
