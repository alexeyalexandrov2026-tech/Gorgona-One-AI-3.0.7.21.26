"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function BookingForm({ rentalSlug, rentalTitle }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    dates: ''
  });

  // Auto-fill if user is logged in
  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setForm(f => ({
          ...f,
          name: session.user.user_metadata?.name || '',
          email: session.user.email || '',
        }));
      }
    }
    loadUser();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, itemSlug: rentalSlug, itemTitle: rentalTitle })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit request');
      
      setSuccess(true);
      setForm({ ...form, dates: '' }); // Reset dates, keep contact info
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <h3 className="text-lg font-medium text-emerald-400">Request Sent!</h3>
        <p className="mt-2 text-sm text-emerald-200/70">
          Our concierge will contact you shortly to confirm your dates.
        </p>
        <button type="button" onClick={() => setSuccess(false)} className="mt-4 text-sm text-emerald-400 hover:underline">
          Make another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <input 
        required 
        value={form.name} 
        onChange={e => setForm({...form, name: e.target.value})}
        className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" 
        placeholder="Name" 
      />
      <input 
        required 
        value={form.phone} 
        onChange={e => setForm({...form, phone: e.target.value})}
        className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" 
        placeholder="Phone number" 
      />
      <input 
        required 
        type="email"
        value={form.email} 
        onChange={e => setForm({...form, email: e.target.value})}
        className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" 
        placeholder="Email" 
      />
      <input 
        required 
        value={form.dates} 
        onChange={e => setForm({...form, dates: e.target.value})}
        className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" 
        placeholder="Preferred dates (e.g. Oct 12 - Oct 15)" 
      />
      
      {error && <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded-xl border border-red-500/20">{error}</p>}
      
      <button 
        type="submit" 
        disabled={loading}
        className="market-button w-full transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? 'Submitting...' : 'Submit reservation request'}
      </button>
    </form>
  );
}
