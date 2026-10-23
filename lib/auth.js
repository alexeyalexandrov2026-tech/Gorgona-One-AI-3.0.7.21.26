import { supabase } from './supabase';
import { readVerifiedSession } from './authSession.mjs';

export async function getSession() {
  return readVerifiedSession(supabase);
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
        role: 'user',
        metadata
      }
    }
  });

  if (error) {
    throw error;
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
        role: 'partner',
        company_name: companyName.trim(),
        metadata: { companyCategory, phone, contactMethod, agreementAccepted: agreement }
      }
    }
  });

  if (error) {
    throw error;
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
    throw error;
  }

  return getSession();
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/profile`
    }
  });
  if (error) {
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
