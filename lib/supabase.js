import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// A Supabase project can send a valid recovery callback to its default Site URL.
// Once the SDK has verified the callback, open password setup on this same site.
if (typeof window !== 'undefined' && window.location.pathname !== '/account/setup' &&
    new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery') {
  supabase.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') window.location.replace('/account/setup');
  });
}
