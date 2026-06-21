import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePushSubscription } from '../usePushSubscription';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { playTicketSound, unlockAudio } from '@/lib/notificationSound';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      insert: vi.fn(),
    })),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/notificationSound', () => ({
  playTicketSound: vi.fn(),
  unlockAudio: vi.fn(),
}));

describe('usePushSubscription', () => {
  let mockServiceWorker: any;
  let mockPushManager: any;
  let mockNotification: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPushManager = {
      subscribe: vi.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
    };

    mockServiceWorker = {
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: mockPushManager,
      }),
      register: vi.fn().mockResolvedValue({
        pushManager: mockPushManager,
      }),
      ready: Promise.resolve({
          showNotification: vi.fn()
      }),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: mockServiceWorker,
    });

    mockNotification = vi.fn();
    mockNotification.permission = 'default';
    mockNotification.requestPermission = vi.fn().mockResolvedValue('granted');

    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: mockNotification,
    });

    Object.defineProperty(window, 'PushManager', {
      writable: true,
      configurable: true,
      value: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestNotificationPermission', () => {
    it('requests permission and subscribes to push on grant', async () => {
      // Mock Supabase RPC for VAPID key
      (supabase.rpc as any).mockResolvedValue({ data: 'BC_ABCD_1234', error: null });
      (supabase.from as any).mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null })
      });

      const { result } = renderHook(() => usePushSubscription('ticket-123'));

      await act(async () => {
        await result.current.requestNotificationPermission();
      });

      expect(unlockAudio).toHaveBeenCalled();
      expect(window.Notification.requestPermission).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
      expect(playTicketSound).toHaveBeenCalled();
      expect(mockServiceWorker.getRegistration).toHaveBeenCalled();
      expect(mockPushManager.subscribe).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
    });

    it('shows error toast when permission is denied', async () => {
      window.Notification.requestPermission = vi.fn().mockResolvedValue('denied');

      const { result } = renderHook(() => usePushSubscription('ticket-123'));

      await act(async () => {
        await result.current.requestNotificationPermission();
      });

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('تم رفض الإشعارات'));
      expect(mockPushManager.subscribe).not.toHaveBeenCalled();
    });

    it('shows error if browser does not support notifications', async () => {
      // Create a mock where 'Notification' is deleted
      // We will render first, then delete Notification, then call the request
      const { result } = renderHook(() => usePushSubscription('ticket-123'));

      // @ts-ignore
      delete window.Notification;

      await act(async () => {
        await result.current.requestNotificationPermission();
      });

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('متصفحك لا يدعم إشعارات'));
    });
  });

  describe('triggerSystemNotification', () => {
    it('plays sound and creates Notification if granted', () => {
      Object.defineProperty(window.Notification, 'permission', { value: 'granted', configurable: true });

      const { result } = renderHook(() => usePushSubscription('ticket-123'));

      result.current.triggerSystemNotification('Test Title', 'Test Body');

      expect(playTicketSound).toHaveBeenCalled();
      expect(window.Notification).toHaveBeenCalledWith('Test Title', expect.objectContaining({
          body: 'Test Body'
      }));
    });

    it('falls back to toast if not granted', () => {
      Object.defineProperty(window.Notification, 'permission', { value: 'denied', configurable: true });

      const { result } = renderHook(() => usePushSubscription('ticket-123'));

      result.current.triggerSystemNotification('Test Title', 'Test Body');

      expect(playTicketSound).toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Test Title'), expect.any(Object));
      expect(window.Notification).not.toHaveBeenCalledWith();
    });
  });
});
