import { vi } from 'vitest';

vi.mock('@/lib/supabase', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        supabase: {}
    }
})

// Setup environment variables for test
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
