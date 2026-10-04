"use client";

import { useState } from 'react';
import Link from 'next/link';
import { signUpPartner } from '../../../lib/auth';

export default function RegisterPartnerPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ 
    name: '', email: '', phone: '', contactMethod: 'WhatsApp', password: '', confirmPassword: '',
    companyName: '', companyCategory: 'Villas', agreement: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.agreement) {
      setError("You must agree to the Gorgona Partnership Agreement.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUpPartner(form, {
        errorRequired: "Please fill out all required fields",
        errorEmail: "Invalid email",
        errorPasswordLength: "Password must be at least 6 characters",
        errorPasswordMatch: "Passwords do not match",
      });
      setStep('success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-16 text-center px-4">
        <div className="h-20 w-20 rounded-full bg-brand-gold/20 flex items-center justify-center mb-6 border border-brand-gold/30">
          <svg className="h-10 w-10 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-semibold text-white">Please Verify Your Email</h2>
        <p className="mt-4 text-zinc-400 max-w-md mx-auto leading-relaxed">
          We have sent a verification link to <span className="text-white font-medium">{form.email}</span>. <br/>
          Please click the link in the email to activate your partner account.
        </p>
        <Link href="/login" className="mt-8 rounded-full bg-white/10 px-6 py-3 font-medium text-white transition hover:bg-white/20">
          Return to Login
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center py-16 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium backdrop-blur-md">
        <h1 className="text-3xl font-semibold text-white">Partner Application</h1>
        <p className="mt-2 text-zinc-400">Join our exclusive network of premium providers.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider text-brand-gold border-b border-white/10 pb-2">Business Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <input 
                value={form.companyName} 
                onChange={e => setForm({...form, companyName: e.target.value})} 
                placeholder="Business Name" 
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" 
                required 
              />
              <select 
                value={form.companyCategory}
                onChange={e => setForm({...form, companyCategory: e.target.value})}
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold appearance-none transition"
              >
                <option value="Villas">Villas & Estates</option>
                <option value="Yachts">Yacht Charters</option>
                <option value="Events">Events & Nightlife</option>
                <option value="Transfer">Premium Transfer</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider text-brand-gold border-b border-white/10 pb-2">Contact Info</h3>
            <input 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              placeholder="Representative Full Name" 
              className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" 
              required 
            />
            <input 
              type="email" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})} 
              placeholder="Email Address" 
              className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" 
              required 
            />
            
            <div className="grid grid-cols-5 gap-4">
               <div className="col-span-2">
                 <select 
                   value={form.contactMethod}
                   onChange={e => setForm({...form, contactMethod: e.target.value})}
                   className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold appearance-none transition"
                 >
                   <option value="WhatsApp">WhatsApp</option>
                   <option value="Telegram">Telegram</option>
                   <option value="Phone">Phone</option>
                 </select>
               </div>
               <div className="col-span-3">
                 <input 
                   type="tel" 
                   value={form.phone} 
                   onChange={e => setForm({...form, phone: e.target.value})} 
                   placeholder="Phone Number" 
                   className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" 
                   required 
                 />
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="password" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})} 
                placeholder="Password" 
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" 
                required minLength={6} 
              />
              <input 
                type="password" 
                value={form.confirmPassword} 
                onChange={e => setForm({...form, confirmPassword: e.target.value})} 
                placeholder="Confirm Password" 
                className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition" 
                required 
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-6 items-center">
              <input
                id="agreement"
                type="checkbox"
                checked={form.agreement}
                onChange={(e) => setForm({...form, agreement: e.target.checked})}
                className="h-5 w-5 rounded border-white/20 bg-black/50 text-brand-gold focus:ring-brand-gold focus:ring-offset-black"
              />
            </div>
            <label htmlFor="agreement" className="text-sm text-zinc-400">
              I agree to the <a href="#" className="text-brand-gold hover:underline">Gorgona Partnership Agreement</a> and confirm that all provided business information is accurate.
            </label>
          </div>
          
          {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/30">{error}</p>}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-full bg-brand-gold px-4 py-4 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Apply & Send Verification Email"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Already a partner? <Link href="/login" className="text-white hover:underline">Sign In</Link>
        </p>
      </div>
    </main>
  );
}
