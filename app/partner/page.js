"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../../lib/supabase';

function PartnerListingCard({ listing, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: listing.title,
    description: listing.description,
    price: listing.price,
    currency: listing.currency
  });

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('partner_listings')
        .update(editForm)
        .eq('id', listing.id);
      if (error) throw error;
      
      Object.assign(listing, editForm);
      setIsEditing(false);
      
      // Notify admin about the change
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          event: 'listing_updated', 
          partner: listing.partner_id,
          filesCount: 0
        })
      });
      
    } catch (e) {
      alert("Failed to update listing: " + e.message);
    }
  };

  if (isEditing) {
    return (
      <div className="border-l-2 border-brand-gold pl-4 py-2 bg-white/50 p-2">
        <input className="mb-2 p-1 border border-villa-obsidian/20 text-sm w-full" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
        <div className="flex gap-2 mb-2">
          <input type="number" className="p-1 border border-villa-obsidian/20 text-sm flex-1" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} />
          <input className="p-1 border border-villa-obsidian/20 text-sm w-16" value={editForm.currency} onChange={e => setEditForm({...editForm, currency: e.target.value})} />
        </div>
        <textarea className="mb-2 p-1 border border-villa-obsidian/20 text-sm w-full h-16" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-brand-gold text-white text-[0.6rem] uppercase px-3 py-1">Save</button>
          <button onClick={() => setIsEditing(false)} className="border border-villa-obsidian/20 text-[0.6rem] uppercase px-3 py-1">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-villa-obsidian/20 pl-4 py-1">
      <div className="flex justify-between items-baseline mb-1">
        <h4 className="font-display text-xl text-villa-charcoal">{listing.title}</h4>
        <div className="flex items-center gap-2">
          {listing.status === 'pending' && (
            <button onClick={() => setIsEditing(true)} className="text-[0.6rem] uppercase text-villa-ash hover:text-brand-gold">Edit</button>
          )}
          <span className={`font-fira text-[0.6rem] uppercase tracking-[0.15em] px-2 py-0.5 ${
            listing.status === 'approved' ? 'text-green-700 bg-green-100' : 
            listing.status === 'rejected' ? 'text-red-700 bg-red-100' : 
            'text-orange-600 bg-orange-100'
          }`}>
            {listing.status}
          </span>
        </div>
      </div>
      <p className="font-fira text-[0.7rem] uppercase text-villa-ash">
        {listing.price} {listing.currency}
      </p>
      <p className="mt-1 text-xs text-villa-graphite truncate">{listing.description}</p>
    </div>
  );
}

export default function PartnerDashboard() {
  const auth = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [files, setFiles] = useState([]);
  
  // Listings State
  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    if (auth && !auth.loading) {
      if (!auth.session) {
        router.push('/login');
      } else if (auth.session.role !== 'partner' && auth.session.role !== 'admin') {
        router.push('/profile');
      } else {
        loadMyListings();
      }
    }
  }, [auth, router]);

  async function loadMyListings() {
    try {
      const { data, error } = await supabase
        .from('partner_listings')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setMyListings(data);
      }
    } catch (err) {
      console.error('Failed to load listings', err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const uploadedFileUrls = [];
      
      // 1. Upload files to Supabase Storage
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${auth.session.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('listings_media')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('listings_media')
          .getPublicUrl(filePath);
          
        uploadedFileUrls.push(publicUrl);
      }

      // 2. Insert record into database
      const { error: insertError } = await supabase
        .from('partner_listings')
        .insert([{
          partner_id: auth.session.id,
          title,
          description,
          price: parseFloat(price),
          currency,
          images: uploadedFileUrls
        }]);

      if (insertError) throw insertError;

      // 3. Notify Admin via API route
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          event: 'new_listing', 
          partner: auth.session.name || auth.session.email,
          filesCount: files.length
        })
      });

      alert('Listing sent for proof! Admin has been notified.');
      
      // Reset form
      setTitle('');
      setDescription('');
      setPrice('');
      setCurrency('USD');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Reload listings to show the new pending one
      loadMyListings();
      
    } catch (err) {
      console.error(err);
      alert('Failed to submit listing: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !auth?.session) {
    return (
      <main className="flex-1 theme-villa full-bleed flex items-center justify-center bg-villa-parchment py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-villa-obsidian border-t-transparent"></div>
      </main>
    );
  }

  return (
    <main className="flex-1 theme-villa full-bleed bg-villa-parchment text-villa-obsidian pb-20 pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-villa-obsidian/20 pb-4 font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
          <span>Partner Portal</span>
          <span>{auth.session.company_name || auth.session.name}</span>
        </div>

        <h1 className="mt-10 font-display text-[10vw] sm:text-[6rem] font-medium leading-[0.92] tracking-[-0.02em] text-villa-charcoal uppercase mb-16">
          Partner<br/><span className="text-villa-ash/70">Desk</span>
        </h1>

        <div className="grid gap-16 lg:grid-cols-2 border-t border-villa-obsidian/20 pt-10">
          
          {/* Create Listing Form */}
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight text-villa-obsidian mb-2">Create Listing</h2>
            <p className="font-fira text-[0.7rem] uppercase tracking-[0.1em] text-villa-graphite mb-8">Submit services for proof</p>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash mb-2">Service Title</label>
                <input 
                  value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Premium Yacht 50ft" 
                  className="w-full border-b border-villa-obsidian/30 bg-transparent py-2 text-villa-charcoal outline-none focus:border-villa-obsidian transition placeholder:text-villa-ash/50" 
                  required 
                />
              </div>
              
              <div>
                <label className="block font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash mb-2">Description & Info</label>
                <textarea 
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the service, capacity, amenities..." 
                  rows={3} 
                  className="w-full border-b border-villa-obsidian/30 bg-transparent py-2 text-villa-charcoal outline-none focus:border-villa-obsidian transition placeholder:text-villa-ash/50" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash mb-2">Price</label>
                  <input 
                    type="number" 
                    value={price} onChange={e => setPrice(e.target.value)}
                    placeholder="0.00" 
                    className="w-full border-b border-villa-obsidian/30 bg-transparent py-2 text-villa-charcoal outline-none focus:border-villa-obsidian transition placeholder:text-villa-ash/50" 
                    required 
                  />
                </div>
                <div>
                  <label className="block font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash mb-2">Currency</label>
                  <select 
                    value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full border-b border-villa-obsidian/30 bg-transparent py-2 text-villa-charcoal outline-none focus:border-villa-obsidian appearance-none transition"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="THB">THB (฿)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash mb-2">Upload Files & Pictures (Unlimited)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center border border-dashed border-villa-obsidian/30 p-8 hover:border-villa-obsidian transition cursor-pointer bg-villa-obsidian/5"
                >
                  <span className="font-fira text-[0.7rem] uppercase tracking-[0.1em] text-villa-obsidian">
                    Click to select files
                  </span>
                  <p className="mt-2 text-xs text-villa-graphite">Supports all file types (JPG, PDF, DOC, etc.)</p>
                  {files.length > 0 && (
                    <p className="mt-4 font-medium text-villa-charcoal">{files.length} file(s) selected</p>
                  )}
                </div>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>
              
              <button 
                type="submit" 
                disabled={submitting}
                className="mt-4 border-b border-villa-obsidian pb-1 font-fira text-sm font-medium uppercase tracking-[0.18em] text-villa-obsidian transition-opacity hover:opacity-60 disabled:opacity-30"
              >
                {submitting ? 'Sending to Database...' : 'Send for Proof'}
              </button>
            </form>
          </div>
          
          {/* Your Listings */}
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight text-villa-obsidian mb-2">Your Listings</h2>
            <p className="font-fira text-[0.7rem] uppercase tracking-[0.1em] text-villa-graphite mb-8">Status of submitted services</p>
            
            <div className="flex flex-col gap-6">
              {myListings.length === 0 && (
                <p className="text-sm text-villa-ash">You haven't submitted any listings yet.</p>
              )}
              {myListings.map(listing => (
                <PartnerListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
