// Public password recovery. This sends only to Supabase Auth; no service-role key
// or administrator privileges are exposed to the browser.
export const PASSWORD_RECOVERY_REDIRECT = '/account/setup';

export function normalizeRecoveryEmail(value) {
  if (typeof value !== 'string') throw new Error('invalid_email');
  const email = value.trim();
  if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('invalid_email');
  }
  return email;
}

export function passwordRecoveryRedirect(origin) {
  const url = new URL(origin);
  const isLocal = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  const isProduction = url.origin === 'https://gorgona-one.com';
  if ((!isLocal && !isProduction) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('invalid_origin');
  }
  return new URL(PASSWORD_RECOVERY_REDIRECT, url.origin).toString();
}

export async function requestPasswordRecovery(auth, email, origin) {
  const normalizedEmail = normalizeRecoveryEmail(email);
  const redirectTo = passwordRecoveryRedirect(origin);
  const { error } = await auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
  if (error) throw error;
  // Supabase intentionally does not disclose whether an account exists.
  return true;
}
