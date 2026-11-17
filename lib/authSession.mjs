// Rights come from the protected database profile, never user_metadata.
export async function readVerifiedSession(client) {
  const { data: local, error: localError } = await client.auth.getSession();
  if (localError) throw localError;
  if (!local?.session) return null;
  const { data: verified, error } = await client.auth.getUser();
  if (error || !verified?.user) throw error || new Error('Session verification failed');
  const user = verified.user;
  const { data: profile, error: profileError, status } = await client.from('profiles')
    .select('id,name,email,role,company_name,metadata').eq('id', user.id).single();
  if (profileError) throw Object.assign(new Error(profileError.message), profileError, { status });
  if (!profile || !['user', 'partner', 'admin'].includes(profile.role)) throw new Error('Profile unavailable');
  return { id: user.id, email: user.email, role: profile.role,
    name: profile.name || user.email?.split('@')[0] || '', company_name: profile.company_name, metadata: profile.metadata || {} };
}

export function isTemporarySessionError(error) {
  const status = error?.status;
  return error?.name === 'AuthRetryableFetchError' || status === 0 || status === 429 ||
    (status >= 500 && status <= 599);
}

export function sessionLoader(read, publish) {
  let generation = 0;
  let disposed = false;
  let verified = null;

  return {
    clear() {
      generation++;
      verified = null;
      if (!disposed) publish(null, false, null);
    },
    async refresh(background = false) {
      const request = ++generation;
      if (!disposed && !background && !verified) publish(null, true, null);
      try {
        const session = await read();
        if (disposed || request !== generation) return null;
        verified = session;
        publish(verified, false, null);
        return verified;
      } catch (error) {
        if (disposed || request !== generation) return null;
        if (!isTemporarySessionError(error)) verified = null;
        publish(verified, false, error);
        return null;
      }
    },
    dispose() { disposed = true; generation++; }
  };
}
