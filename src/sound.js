/**
 * Sound & Procedural Audio Synthesis Module
 * Implements 100% self-contained Web Audio API synthesis for alert chimes
 * and continuous ambient soundscapes (Rain, Ocean Waves, White/Pink Noise).
 */

export class SoundEngine {
  constructor(options = {}) {
    this.audioCtx = null;
    this.soundEnabled = options.soundEnabled !== false;
    this.soundVolume = options.soundVolume !== undefined ? options.soundVolume : 0.7;
    this.ambientVolume = options.ambientVolume !== undefined ? options.ambientVolume : 0.4;
    this.currentAmbient = null; // { type, sourceNodes, gainNode, stopFn }
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
  }

  setSoundVolume(vol) {
    this.soundVolume = Math.max(0, Math.min(1, Number(vol)));
  }

  setAmbientVolume(vol) {
    this.ambientVolume = Math.max(0, Math.min(1, Number(vol)));
    if (this.currentAmbient && this.currentAmbient.gainNode) {
      const ctx = this.getAudioContext();
      if (ctx) {
        this.currentAmbient.gainNode.gain.setValueAtTime(this.ambientVolume, ctx.currentTime);
      }
    }
  }

  /**
   * Play completion chimes
   */
  playChime(tone = 'calm') {
    if (!this.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.soundVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (tone === 'bell') {
        // Bell chime: 2 resonant notes
        const frequencies = [880.0, 1108.73];
        frequencies.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);

          gain.gain.setValueAtTime(0.001, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.15 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 2.0);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 2.1);
        });
      } else if (tone === 'digital') {
        // Crisp modern beep sequence
        const frequencies = [587.33, 880.0, 1174.66];
        frequencies.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          gain.gain.setValueAtTime(0.01, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.26);
        });
      } else {
        // Default 'calm': Harmonic triad (E5, G#5, B5)
        const notes = [659.25, 830.61, 987.77];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.12);

          gain.gain.setValueAtTime(0.001, now + index * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.2, now + index * 0.12 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 1.6);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now + index * 0.12);
          osc.stop(now + index * 0.12 + 1.7);
        });
      }
    } catch (err) {
      console.warn('Audio chime error:', err);
    }
  }

  /**
   * Helper: Generate a white noise buffer
   */
  createNoiseBuffer(ctx, durationSeconds = 5) {
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Helper: Generate a pink noise buffer (1/f frequency distribution)
   */
  createPinkNoiseBuffer(ctx, durationSeconds = 5) {
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  /**
   * Start procedural ambient soundscape
   */
  startAmbient(type = 'rain') {
    this.stopAmbient();
    if (type === 'none') return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.ambientVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      let nodesToStop = [];

      if (type === 'whiteNoise') {
        const noiseBuffer = this.createNoiseBuffer(ctx);
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);

        source.connect(filter);
        filter.connect(masterGain);
        source.start(0);

        nodesToStop.push(source);
      } else if (type === 'rain') {
        // Procedural Rain: Pink noise through low-pass & band-pass filters
        const pinkBuffer = this.createPinkNoiseBuffer(ctx);
        const source = ctx.createBufferSource();
        source.buffer = pinkBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(0.7, ctx.currentTime);

        source.connect(filter);
        filter.connect(masterGain);
        source.start(0);

        nodesToStop.push(source);
      } else if (type === 'waves') {
        // Procedural Ocean Waves: Pink noise modulated by an LFO swell
        const pinkBuffer = this.createPinkNoiseBuffer(ctx);
        const source = ctx.createBufferSource();
        source.buffer = pinkBuffer;
        source.loop = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(450, ctx.currentTime);

        // Wave swell gain modulation
        const waveGain = ctx.createGain();
        waveGain.gain.setValueAtTime(0.2, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 second ocean cycle

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.18, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(waveGain.gain);

        source.connect(lowpass);
        lowpass.connect(waveGain);
        waveGain.connect(masterGain);

        source.start(0);
        lfo.start(0);

        nodesToStop.push(source, lfo);
      }

      this.currentAmbient = {
        type,
        gainNode: masterGain,
        stopFn: () => {
          nodesToStop.forEach(node => {
            try {
              node.stop();
              node.disconnect();
            } catch (e) {}
          });
          masterGain.disconnect();
        },
      };
    } catch (err) {
      console.warn('Failed to start ambient sound:', err);
    }
  }

  stopAmbient() {
    if (this.currentAmbient && this.currentAmbient.stopFn) {
      this.currentAmbient.stopFn();
    }
    this.currentAmbient = null;
  }

  getCurrentAmbientType() {
    return this.currentAmbient ? this.currentAmbient.type : 'none';
  }
}
