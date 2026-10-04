import { supabase } from './supabase';

export const MIN_PASSWORD_LENGTH = 8;

// Role and portal settings are read from public.profiles, where only an admin
// can change a role (protect_profile_columns trigger, database/00_*). They are
// never read from user_metadata: any signed-in user can rewrite their own
// user_metadata with auth.updateUser(), so it must not decide access.
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const user = session.user;

  let profile = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role, name, company_name, metadata')
      .eq('id', user.id)
      .maybeSingle();
    profile = data;
  } catch {
    /* unreachable profile - fall back to the least-privileged role below */
  }

  return {
    id: user.id,
    name: profile?.name || user.user_metadata?.name || (user.email || '').split('@')[0],
    email: user.email,
    role: profile?.role || 'user',
    company_name: profile?.company_name || null,
    metadata: profile?.metadata || {}
  };
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Maps the Supabase Auth errors guests actually hit to the localized messages
// in lib/i18n.js; anything else keeps Supabase's own text.
function authError(error, t) {
  const code = error?.code || '';
  const message = error?.message || '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return new Error(t?.errorInvalidCredentials || message);
  }
  if (code === 'user_already_exists' || /already registered/i.test(message)) {
    return new Error(t?.errorEmailInUse || message);
  }
  return new Error(message);
}

export async function signUp({ name, email, password, confirmPassword, metadata = {} }, t) {
  if (!email?.trim() || !password || !confirmPassword) {
    throw new Error(t.errorRequired);
  }
  if (!isValidEmail(email)) {
    throw new Error(t.errorEmail);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(t.errorPasswordLength);
  }
  if (password !== confirmPassword) {
    throw new Error(t.errorPasswordMatch);
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        name: name?.trim() || email.split('@')[0],
        role: 'user',
        metadata
      }
    }
  });

  if (error) {
    throw authError(error, t);
  }

  return {
    name: data.user.user_metadata?.name || data.user.email.split('@')[0],
    email: data.user.email,
  };
}

export async function signUpPartner({ name, email, password, confirmPassword, companyName, companyCategory, phone, contactMethod, agreement }, t) {
  if (!name?.trim() || !email?.trim() || !password || !confirmPassword || !companyName?.trim()) {
    throw new Error(t.errorRequired);
  }
  if (!isValidEmail(email)) {
    throw new Error(t.errorEmail);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(t.errorPasswordLength);
  }
  if (password !== confirmPassword) {
    throw new Error(t.errorPasswordMatch);
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        name: name.trim(),
        role: 'partner',
        company_name: companyName.trim(),
        metadata: { companyCategory, phone, contactMethod, agreementAccepted: agreement }
      }
    }
  });

  if (error) {
    throw authError(error, t);
  }

  return {
    name: data.user.user_metadata?.name || data.user.email.split('@')[0],
    email: data.user.email,
  };
}

export async function signIn({ email, password }, t) {
  if (!email?.trim() || !password) {
    throw new Error(t.errorRequired);
  }
  if (!isValidEmail(email)) {
    throw new Error(t.errorEmail);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw authError(error, t);
  }

  return {
    name: data.user.user_metadata?.name || data.user.email.split('@')[0],
    email: data.user.email
  };
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/profile`
    }
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
