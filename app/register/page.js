"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../components/AuthProvider';
import { signUp, signInWithGoogle } from '../../lib/auth';

export default function RegisterUserPage() {
  const auth = useAuth();
  const router = useRouter();
  
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(form, {
        errorRequired: "Please fill out all fields",
        errorEmail: "Invalid email",
        errorPasswordLength: "Password must be at least 6 characters",
        errorPasswordMatch: "Passwords do not match",
      });
      auth?.refresh();
      setSuccess("Account created successfully! Redirecting...");
      setTimeout(() => router.push('/profile'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium backdrop-blur-md">
        <h1 className="text-3xl font-semibold text-white">Create Account</h1>
        <p className="mt-2 text-zinc-400">Join Gorgona for exclusive access</p>
        
        <div className="mt-8">
          <button onClick={() => signInWithGoogle().catch(e => setError(e.message))} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white p-3 font-medium text-black transition hover:bg-zinc-200">
             <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
          <div className="relative mt-6 flex items-center justify-center mb-6">
            <div className="absolute w-full border-t border-white/10"></div>
            <span className="relative bg-[#1A1A1A] px-4 text-xs uppercase text-zinc-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your Name" className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" required />
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email Address" className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" required />
          <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Password (min 6 chars)" className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" required minLength={6} />
          <input type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} placeholder="Confirm Password" className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" required />
          
          {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/30">{error}</p>}
          {success && <p className="text-emerald-400 text-sm bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">{success}</p>}
          
          <button type="submit" disabled={loading} className="w-full rounded-full bg-brand-gold px-4 py-3 font-medium text-black transition hover:brightness-110 disabled:opacity-60">
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account? <Link href="/login" className="text-white hover:underline">Sign In</Link>
        </p>
      </div>
    </main>
  );
}
