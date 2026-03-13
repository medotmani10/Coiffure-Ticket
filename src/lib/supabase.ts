import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ FIXED H-5: fail fast instead of silently using empty strings
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Lavage Ticket] Missing required env variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to generate unique session ID for customers
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to get or create session ID
export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('queue_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('queue_session_id', sessionId);
  }
  return sessionId;
}

// Helper to clear session ID
export function clearSessionId(): void {
  localStorage.removeItem('queue_session_id');
}
