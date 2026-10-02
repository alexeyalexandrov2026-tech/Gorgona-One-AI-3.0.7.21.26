import { supabase } from './supabase';

// The role always comes from public.profiles, which only an admin can change.
// user_metadata is writable by the signed-in user, so it never decides access.
async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('role, name, company_name, metadata')
    .eq('id', userId)
    .maybeSingle();
  return data || null;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const user = session.user;
  const profile = await getProfile(user.id);
  return {
    id: user.id,
    name: profile?.name || user.user_metadata?.name || user.email.split('@')[0],
    email: user.email,
    role: profile?.role || 'user',
    company_name: profile?.company_name ?? user.user_metadata?.company_name ?? null,
    metadata: profile?.metadata || {}
  };
}

// Headers that let API routes verify the signed-in user on the server.
export async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signUp({ name, email, password, confirmPassword, metadata = {} }, t) {
  if (!email?.trim() || !password || !confirmPassword) {
    throw new Error(t.errorRequired);
  }
  if (!isValidEmail(email)) {
    throw new Error(t.errorEmail);
  }
  if (password.length < 6) {
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
        metadata
      }
    }
  });

  if (error) {
    throw new Error(error.message);
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
  if (password.length < 6) {
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
        // A request, not a grant: the database only accepts 'partner' or 'user' here.
        role: 'partner',
        company_name: companyName.trim(),
        metadata: { companyCategory, phone, contactMethod, agreementAccepted: agreement }
      }
    }
  });

  if (error) {
    throw new Error(error.message);
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
    throw new Error(error.message);
  }

  const profile = await getProfile(data.user.id);
  return {
    name: profile?.name || data.user.user_metadata?.name || data.user.email.split('@')[0],
    email: data.user.email,
    role: profile?.role || 'user'
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
