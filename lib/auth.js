import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';
import { readVerifiedSession } from './authSession.mjs';
import { setSessionPassword } from './passwordSetup.mjs';
import { AUTH_MESSAGES } from './authMessages.js';

export async function getSession() {
  return readVerifiedSession(supabase);
}

// Updates only the authenticated user's credential; no email or target ID is sent.
export async function setPassword({ password, confirmPassword }, expectedUserId) {
  return setSessionPassword({auth:supabase.auth,url:supabaseUrl||'https://placeholder.supabase.co',anonKey:supabaseAnonKey||'placeholder'},{password,confirmPassword},expectedUserId);
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signUp({ name, email, password, confirmPassword, metadata = {} }, t) {
  if (!email?.trim() || !password || !confirmPassword) {
    throw new Error(t.errorRequired);
  }
  if (!isValidEmail(email.trim())) {
    throw new Error(t.errorEmail);
  }
  if (password.length < 6) {
    throw new Error(t.errorPasswordLength);
  }
  if (password !== confirmPassword) {
    throw new Error(t.errorPasswordMatch);
  }

  return registerAccount(email, password, {
    name: name?.trim() || email.trim().split('@')[0],
    role: 'user',
    metadata
  }, '/profile');
}

export async function signUpPartner({ name, email, password, confirmPassword, companyName, companyCategory, phone, contactMethod, agreement }, t) {
  if (!name?.trim() || !email?.trim() || !password || !confirmPassword || !companyName?.trim()) {
    throw new Error(t.errorRequired);
  }
  if (!isValidEmail(email.trim())) {
    throw new Error(t.errorEmail);
  }
  if (password.length < 6) {
    throw new Error(t.errorPasswordLength);
  }
  if (password !== confirmPassword) {
    throw new Error(t.errorPasswordMatch);
  }

  return registerAccount(email, password, {
    name: name.trim(),
    role: 'partner',
    company_name: companyName.trim(),
    metadata: { companyCategory, phone, contactMethod, agreementAccepted: agreement }
  }, '/partner');
}

async function registerAccount(email, password, metadata, nextPath) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: metadata, emailRedirectTo: new URL(nextPath, window.location.origin).href }
  });
  if (error) throw error;
  if (!data?.user) throw new Error(AUTH_MESSAGES.failed);
  if (data.session && !await getSession()) throw new Error(AUTH_MESSAGES.failed);

  return {
    name: data.user.user_metadata?.name || email.trim().split('@')[0],
    email: data.user.email || email.trim(),
    requiresEmailConfirmation: !data.session,
  };
}

export async function requestPasswordReset(email) {
  const address = email.trim();
  if (!isValidEmail(address)) throw new Error(AUTH_MESSAGES.email);
  const { error } = await supabase.auth.resetPasswordForEmail(address, {
    redirectTo: new URL('/account/setup', window.location.origin).href,
  });
  if (error && !['user_not_found', 'email_not_found'].includes(error.code)) throw error;
}

export async function signIn({ email, password }, t) {
  if (!email?.trim() || !password) {
    throw new Error(t.errorRequired);
  }
  if (!isValidEmail(email.trim())) {
    throw new Error(t.errorEmail);
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  const session = await getSession();
  if (!session) throw new Error(AUTH_MESSAGES.failed);
  return session;
}

export const OAUTH_PROVIDERS = Object.freeze(['apple', 'google', 'facebook', 'azure']);

function buildCallbackUrl(nextPath = '') {
  const safeNext = typeof nextPath === 'string' && nextPath.startsWith('/') && !nextPath.startsWith('//')
    ? nextPath
    : '';
  const url = new URL('/auth/callback', window.location.origin);
  if (safeNext) url.searchParams.set('next', safeNext);
  return url.href;
}

export async function signInWithProvider(provider, nextPath = '') {
  if (!OAUTH_PROVIDERS.includes(provider)) {
    throw new Error(AUTH_MESSAGES.failed);
  }
  const scopesByProvider = {
    azure: 'email profile openid',
    facebook: 'email public_profile'
  };
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: buildCallbackUrl(nextPath),
      ...(scopesByProvider[provider] ? { scopes: scopesByProvider[provider] } : {})
    }
  });
  if (error) {
    throw error;
  }
}

export async function signInWithGoogle(nextPath = '') {
  return signInWithProvider('google', nextPath);
}

export async function signInWithMagicLink(email, nextPath = '') {
  const address = String(email || '').trim();
  if (!isValidEmail(address)) throw new Error(AUTH_MESSAGES.email);
  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: {
      emailRedirectTo: buildCallbackUrl(nextPath)
    }
  });
  if (error) throw error;
  return { sent: true };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
