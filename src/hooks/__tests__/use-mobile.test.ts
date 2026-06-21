import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile', () => {
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;
  let listeners: Record<string, Function[]> = {};

  beforeEach(() => {
    listeners = {};
    addEventListenerSpy = vi.fn((event, callback) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    });
    removeEventListenerSpy = vi.fn((event, callback) => {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    });

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024, // Desktop width by default
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when window width is greater than mobile breakpoint', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when window width is less than mobile breakpoint', () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('updates when media query triggers change and innerWidth is changed', () => {
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate window resize to mobile
    act(() => {
      window.innerWidth = 500;
      listeners['change'].forEach(cb => cb({ matches: true }));
    });

    expect(result.current).toBe(true);

    // Simulate window resize back to desktop
    act(() => {
      window.innerWidth = 1024;
      listeners['change'].forEach(cb => cb({ matches: false }));
    });

    expect(result.current).toBe(false);
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
