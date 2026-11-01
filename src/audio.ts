import type { WeatherPhase } from './weather';

/** Call unlock() from a pointer/keyboard gesture. Other methods never create a context. */
type Motif = { root: number; chord: number[]; melody: number[]; bass: number[]; beat: number };
type Layer = {
  bus: GainNode;
  sources: Set<AudioScheduledSourceNode>;
  nodes: Set<AudioNode>;
  timer?: ReturnType<typeof setInterval>;
  cleanup?: ReturnType<typeof setTimeout>;
  next: number;
  step: number;
};

const MOTIFS: readonly Motif[] = [
  { root: 48, chord: [0, 4, 7, 11], melody: [12, 16, 19, 23, 19, 16, 14, 7], bass: [0, 7, 9, 5], beat: 0.48 },
  { root: 45, chord: [0, 3, 7, 10], melody: [12, 7, 15, 19, 17, 15, 10, 7], bass: [0, 0, 5, 7], beat: 0.58 },
  { root: 50, chord: [0, 5, 7, 12], melody: [19, 17, 12, 14, 7, 12, 17, 14], bass: [0, 5, 0, 7], beat: 0.65 },
  { root: 42, chord: [0, 3, 6, 10], melody: [12, 13, 18, 15, 10, 6, 13, 12], bass: [0, 1, 6, 0], beat: 0.36 },
  { root: 53, chord: [0, 4, 7, 9], melody: [12, 16, 21, 19, 16, 14, 9, 12], bass: [0, 9, 5, 7], beat: 0.52 },
];

const frequency = (note: number) => 440 * 2 ** ((note - 69) / 12);
const level = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) / 100 : 0;

/** Dependency-free, reusable audio engine. dispose() releases everything; unlock() can restart it. */
export class GameAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private musicBus?: GainNode;
  private sfxBus?: GainNode;
  private noise?: AudioBuffer;
  private layers = new Set<Layer>();
  private active?: Layer;
  private atmosphere?: Layer;
  private effects?: Layer;
  private scene = 'menu';
  private music = 0.5;
  private sfx = 0.65;
  private muted = false;
  private lastEffect = -Infinity;
  private weatherPhase: WeatherPhase = 'CLEAR';

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.context) {
      const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      let context: AudioContext;
      try { context = new Constructor(); } catch { return; }
      this.context = context;
      this.master = context.createGain();
      this.musicBus = context.createGain();
      this.sfxBus = context.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(context.destination);
      this.setLevels(this.music * 100, this.sfx * 100, this.muted);
      this.noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
      const samples = this.noise.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < samples.length; i++) {
        const white = Math.random() * 2 - 1;
        brown = (brown + white * 0.02) / 1.02;
        samples[i] = brown * 2.5 + white * 0.18;
      }
      this.effects = this.createLayer(this.sfxBus);
      this.startScene();
      if (this.weatherPhase !== 'CLEAR') this.playWeatherCue(this.weatherPhase);
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
  }

  /** Exact application screens map to five original motifs. */
  setScene(scene: string): void {
    const next = scene.trim().toLowerCase() || 'menu';
    if (next === this.scene) return;
    this.scene = next;
    if (this.context) this.startScene();
  }

  setLevels(music: number, sfx: number, muted: boolean): void {
    this.music = level(music);
    this.sfx = level(sfx);
    this.muted = muted;
    const now = this.context?.currentTime ?? 0;
    // These buses have no automation: zero takes effect immediately, including scheduled voices.
    this.master?.gain.setValueAtTime(muted ? 0 : 1, now);
    this.musicBus?.gain.setValueAtTime(this.music, now);
    this.sfxBus?.gain.setValueAtTime(this.sfx, now);
  }

  setWeatherPhase(phase: WeatherPhase): void {
    if (phase === this.weatherPhase) return;
    this.weatherPhase = phase;
    if (phase === 'EXTREME_STORM') this.effect('thunder');
    else if (phase === 'LIGHT_RAIN' || phase === 'HEAVY_RAIN' || phase === 'RECOVERY') this.effect('rain');
  }

  effect(kind = 'click'): void {
    const context = this.context;
    const layer = this.effects;
    if (!context || !layer || context.state !== 'running' || this.muted || this.sfx === 0) return;
    const now = context.currentTime;
    if (now - this.lastEffect < 0.035) return;
    this.lastEffect = now;
    if (/thunder|storm|explosion/.test(kind)) {
      this.rumble(layer, now, 2.6);
    } else if (kind === 'transition') {
      [48, 55, 62].forEach((note,i)=>this.tone(layer,note,now+i*.12,.7,.055,'sine',.08));
    } else if (kind === 'investment') {
      [69, 76].forEach((note,i)=>this.tone(layer,note,now+i*.08,.22,.09,'triangle'));
    } else if (kind === 'star') {
      [76, 81, 88].forEach((note, i) => this.tone(layer, note, now + i * 0.055, 0.24, 0.075, 'sine'));
    } else if (kind === 'achievement') {
      [72, 79, 84, 91].forEach((note, i) => this.tone(layer, note, now + i * 0.07, 0.34, 0.075, 'triangle'));
    } else if (kind === 'ending-victory') {
      [60, 67, 72, 76, 79].forEach((note, i) => this.tone(layer, note, now + i * 0.12, 0.6, 0.06, 'sine'));
    } else if (kind === 'ending-failure') {
      [52, 48, 45].forEach((note, i) => this.tone(layer, note, now + i * 0.14, 0.5, 0.055, 'triangle'));
    } else if (/rain|splash/.test(kind)) {
      this.weather(layer, now, 0.8);
    } else if (/success|victory|win/.test(kind)) {
      [72, 76, 79, 84].forEach((note, i) => this.tone(layer, note, now + i * 0.09, 0.4, 0.1, 'sine'));
    } else if (/error|fail|damage/.test(kind)) {
      this.tone(layer, 43, now, 0.25, 0.12, 'triangle');
      this.tone(layer, 37, now + 0.12, 0.3, 0.1, 'triangle');
    } else {
      this.tone(layer, kind === 'hover' ? 81 : 76, now, 0.1, 0.09, 'sine');
    }
  }

  dispose(): void {
    for (const layer of this.layers) this.release(layer);
    this.master?.disconnect();
    this.musicBus?.disconnect();
    this.sfxBus?.disconnect();
    const context = this.context;
    this.context = undefined;
    this.master = this.musicBus = this.sfxBus = undefined;
    this.noise = undefined;
    this.active = this.effects = this.atmosphere = undefined;
    this.lastEffect = -Infinity;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }

  private createLayer(destination: AudioNode): Layer {
    const bus = this.context!.createGain();
    bus.connect(destination);
    const layer: Layer = { bus, sources: new Set(), nodes: new Set(), next: this.context!.currentTime, step: 0 };
    this.layers.add(layer);
    return layer;
  }

  private release(layer: Layer): void {
    clearInterval(layer.timer);
    clearTimeout(layer.cleanup);
    for (const source of layer.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* Already ended. */ }
      source.disconnect();
    }
    for (const node of layer.nodes) node.disconnect();
    layer.sources.clear();
    layer.nodes.clear();
    layer.bus.disconnect();
    this.layers.delete(layer);
  }

  private track(layer: Layer, source: AudioScheduledSourceNode, nodes: AudioNode[]): void {
    layer.sources.add(source);
    nodes.forEach(node => layer.nodes.add(node));
    source.onended = () => {
      source.disconnect();
      layer.sources.delete(source);
      nodes.forEach(node => { node.disconnect(); layer.nodes.delete(node); });
    };
  }

  private tone(layer: Layer, note: number, at: number, duration: number, volume: number, type: OscillatorType, attack = 0.015, detune = 0): void {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency(note);
    oscillator.detune.value = detune;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + attack);
    gain.gain.setTargetAtTime(0, at + Math.max(attack, duration * 0.55), duration * 0.15);
    gain.gain.linearRampToValueAtTime(0, at + duration);
    oscillator.connect(gain).connect(layer.bus);
    this.track(layer, oscillator, [gain]);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  }

  private weather(layer: Layer, at: number, duration?: number): void {
    const context = this.context!;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noise!;
    source.loop = true;
    filter.type = duration ? 'lowpass' : 'highpass';
    filter.frequency.value = duration ? 220 : 650;
    gain.gain.setValueAtTime(duration ? 0 : 0.16, at);
    if (duration) {
      gain.gain.linearRampToValueAtTime(0.65, at + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    }
    source.connect(filter).connect(gain).connect(layer.bus);
    this.track(layer, source, [filter, gain]);
    source.start(at, Math.random() * 2);
    if (duration) source.stop(at + duration + 0.05);
  }

  private rumble(layer: Layer, at: number, duration: number): void {
    this.weather(layer, at, duration);
    this.tone(layer, 27, at, duration, 0.18, 'sine', 0.15);
  }

  private playWeatherCue(phase: WeatherPhase): void {
    if (phase === 'EXTREME_STORM') this.effect('thunder');
    else if (phase !== 'CLEAR') this.effect('rain');
  }

  private startScene(): void {
    const context = this.context!;
    const now = context.currentTime;
    // Keep at most one outgoing scene, even when navigation changes rapidly.
    for (const layer of this.layers) if (layer !== this.active && layer !== this.effects && layer !== this.atmosphere) this.release(layer);
    for (const outgoing of [this.active, this.atmosphere]) {
      if (!outgoing) continue;
      clearInterval(outgoing.timer);
      outgoing.bus.gain.cancelAndHoldAtTime(now);
      outgoing.bus.gain.linearRampToValueAtTime(0, now + 1.2);
      outgoing.cleanup = setTimeout(() => this.release(outgoing), 1300);
    }
    const layer = this.createLayer(this.musicBus!);
    this.active = layer;
    layer.bus.gain.setValueAtTime(0, now);
    layer.bus.gain.linearRampToValueAtTime(1, now + 1.2);
    const storm = this.scene === 'stress' || this.scene === 'replay';
    const rain = storm || ['menu', 'intro', 'reversal', 'credits'].includes(this.scene);
    const index = ({menu:0,credits:0,intro:1,reversal:1,stress:3,replay:3,plan:2,results:4} as Record<string,number>)[this.scene] ?? 0;
    const motif = MOTIFS[index];
    const atmosphere = this.createLayer(this.sfxBus!);
    this.atmosphere = atmosphere;
    atmosphere.bus.gain.setValueAtTime(0, now);
    atmosphere.bus.gain.linearRampToValueAtTime(1, now + 1.2);
    if (rain) this.weather(atmosphere, now);
    const schedule = () => {
      if (context.state !== 'running') return;
      // Skip elapsed beats after a suspended/background tab; never replay a backlog.
      if (layer.next < context.currentTime) layer.next = context.currentTime + 0.025;
      while (layer.next < context.currentTime + 0.2) {
        const at = layer.next;
        const step = layer.step++;
        if (step % 8 === 0) {
          for (const interval of motif.chord) {
            this.tone(layer, motif.root + interval, at, motif.beat * 9, 0.025, 'sine', 0.65, -5);
            this.tone(layer, motif.root + interval + 12, at, motif.beat * 9, 0.012, 'triangle', 0.8, 5);
          }
        }
        if (step % 2 === 0) this.tone(layer, motif.root - 12 + motif.bass[(step / 2) % motif.bass.length], at, motif.beat * 1.9, 0.09, 'sine', 0.04);
        this.tone(layer, motif.root + motif.melody[step % motif.melody.length], at, motif.beat * 1.4, 0.045, 'sine', 0.025);
        if (storm && step % 24 === 12) this.rumble(atmosphere, at, 3.5);
        layer.next += motif.beat;
      }
    };
    schedule();
    layer.timer = setInterval(schedule, 80);
  }
}

export const gameAudio = new GameAudio();
