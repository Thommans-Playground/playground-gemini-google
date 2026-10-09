// Test setup for jsdom environment in Node 26
import { vi } from 'vitest';

if (typeof window !== 'undefined') {
  // Ensure window.localStorage has working Storage mock if Node 26 shadows it
  const store = {};
  const mockStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i) => Object.keys(store)[i] || null,
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  });

  globalThis.localStorage = mockStorage;

  // Mock AudioContext for Web Audio API tests
  class MockAudioContext {
    constructor() {
      this.currentTime = 0;
      this.state = 'running';
      this.sampleRate = 44100;
      this.destination = {};
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        loop: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: { setValueAtTime: vi.fn() },
        Q: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }
    createBuffer(channels, length, sampleRate) {
      return {
        getChannelData: () => new Float32Array(length),
      };
    }
    resume() {
      return Promise.resolve();
    }
  }

  window.AudioContext = MockAudioContext;
  window.webkitAudioContext = MockAudioContext;
  globalThis.AudioContext = MockAudioContext;
}
