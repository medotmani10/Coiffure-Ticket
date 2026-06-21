import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playTicketSound } from '../notificationSound';

describe('notificationSound', () => {
  beforeEach(() => {
    // Reset module state
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('playTicketSound', () => {
    it('handles errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Force an error
      // @ts-ignore
      global.window.AudioContext = class {
          constructor() { throw new Error('Test error'); }
      };

      playTicketSound();

      expect(consoleWarnSpy).toHaveBeenCalledWith('[NotificationSound] Could not play sound:', expect.any(Error));

      consoleWarnSpy.mockRestore();
      // @ts-ignore
      delete global.window.AudioContext;
    });

    it('plays sound when audio context is valid', () => {
        let resumeCalled = false;
        let createOscillatorCalled = 0;
        let createGainCalled = 0;

        // @ts-ignore
        global.window.AudioContext = class {
            state = 'suspended';
            currentTime = 0;
            destination = {};
            resume() { resumeCalled = true; return Promise.resolve(); }
            createOscillator() {
                createOscillatorCalled++;
                return {
                    type: '',
                    frequency: { setValueAtTime: () => {} },
                    connect: () => {},
                    start: () => {},
                    stop: () => {}
                };
            }
            createGain() {
                createGainCalled++;
                return {
                    gain: {
                        setValueAtTime: () => {},
                        linearRampToValueAtTime: () => {},
                        exponentialRampToValueAtTime: () => {}
                    },
                    connect: () => {}
                };
            }
        };

        playTicketSound();

        expect(resumeCalled).toBe(true);
        expect(createOscillatorCalled).toBe(12);
        // Each frequency creates 1 gain node, we have 6 frequencies in total
        expect(createGainCalled).toBe(6);

        // @ts-ignore
        delete global.window.AudioContext;
    });
  });
});
