import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateSessionId, getOrCreateSessionId, clearSessionId } from '../supabase';

// Mock import.meta.env for Supabase initialization
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('supabase session helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('generateSessionId', () => {
    it('generates a string starting with session_', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('generates unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('getOrCreateSessionId', () => {
    it('creates a new session ID if none exists in localStorage', () => {
      expect(localStorage.getItem('queue_session_id')).toBeNull();

      const sessionId = getOrCreateSessionId();

      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(localStorage.getItem('queue_session_id')).toBe(sessionId);
    });

    it('returns the existing session ID if one exists in localStorage', () => {
      const existingId = 'session_123_abc';
      localStorage.setItem('queue_session_id', existingId);

      const sessionId = getOrCreateSessionId();

      expect(sessionId).toBe(existingId);
    });
  });

  describe('clearSessionId', () => {
    it('removes the session ID from localStorage', () => {
      localStorage.setItem('queue_session_id', 'session_123_abc');
      expect(localStorage.getItem('queue_session_id')).toBe('session_123_abc');

      clearSessionId();

      expect(localStorage.getItem('queue_session_id')).toBeNull();
    });
  });
});
