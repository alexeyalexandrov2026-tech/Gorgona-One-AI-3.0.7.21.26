// Rights come from the protected database profile, never user_metadata.
export async function readVerifiedSession(client) {
  const { data: local, error: localError } = await client.auth.getSession();
  if (localError) throw localError;
  if (!local?.session) return null;
  const { data: verified, error } = await client.auth.getUser();
  if (error || !verified?.user) throw error || new Error('Session verification failed');
  const user = verified.user;
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('id,name,email,role,company_name,metadata').eq('id', user.id).single();
  if (profileError || !profile || !['user', 'partner', 'admin'].includes(profile.role)) throw profileError || new Error('Profile unavailable');
  return { id: user.id, email: user.email, role: profile.role,
    name: profile.name || user.email?.split('@')[0] || '', company_name: profile.company_name, metadata: profile.metadata || {} };
}

export function sessionLoader(read, publish) {
  let generation = 0, disposed = false;
  return {
    clear() { generation++; if (!disposed) publish(null, false, null); },
    async refresh(background = false) {
      const request = ++generation;
      if (!disposed && !background) publish(null, true, null);
      try { const session = await read(); if (!disposed && request === generation) publish(session, false, null); return request === generation ? session : null; }
      catch (error) { if (!disposed && request === generation) publish(null, false, error); return null; }
    },
    dispose() { disposed = true; generation++; }
  };
}
