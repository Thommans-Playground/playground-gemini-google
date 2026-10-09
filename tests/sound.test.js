import { describe, it, expect } from 'vitest';
import { SoundEngine } from '../src/sound.js';

describe('SoundEngine Module', () => {
  it('initializes with default options and volumes', () => {
    const sound = new SoundEngine();
    expect(sound.soundEnabled).toBe(true);
    expect(sound.soundVolume).toBe(0.7);
    expect(sound.ambientVolume).toBe(0.4);
    expect(sound.getCurrentAmbientType()).toBe('none');
  });

  it('safely handles missing AudioContext in test environments without throwing', () => {
    const sound = new SoundEngine();
    expect(() => sound.playChime('calm')).not.toThrow();
    expect(() => sound.playChime('bell')).not.toThrow();
    expect(() => sound.playChime('digital')).not.toThrow();
    expect(() => sound.startAmbient('rain')).not.toThrow();
    expect(() => sound.stopAmbient()).not.toThrow();
  });

  it('updates volume boundaries correctly', () => {
    const sound = new SoundEngine();
    sound.setSoundVolume(1.5);
    expect(sound.soundVolume).toBe(1);

    sound.setSoundVolume(-0.2);
    expect(sound.soundVolume).toBe(0);

    sound.setAmbientVolume(0.85);
    expect(sound.ambientVolume).toBe(0.85);
  });

  it('toggles soundEnabled flag', () => {
    const sound = new SoundEngine();
    sound.setSoundEnabled(false);
    expect(sound.soundEnabled).toBe(false);
  });
});
