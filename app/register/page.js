"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../components/AuthProvider';
import { signUp } from '../../lib/auth';

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
