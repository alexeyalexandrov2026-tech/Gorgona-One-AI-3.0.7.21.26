import { createClient } from '@supabase/supabase-js';

// Server-side identity for API routes.
//
// The browser sends its Supabase access token as `Authorization: Bearer ...`.
// The token is verified with Supabase Auth, and the role is read from
// public.profiles with that same token, so row level security decides what
// the caller can see. Returns null when there is no valid session.
export async function getRequestUser(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  return { id: data.user.id, email: data.user.email, role: profile?.role || 'user' };
}
