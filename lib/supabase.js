import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// False when the project keys are missing (local dev without .env.local, CI
// builds). Callers use it to skip network calls to the placeholder client
// below instead of waiting on a DNS failure.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
