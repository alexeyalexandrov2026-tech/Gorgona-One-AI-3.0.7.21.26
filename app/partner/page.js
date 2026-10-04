"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../../lib/supabase';

// Tells the admin about partner activity. /api/notify only accepts signed-in
// users, so the request carries the Supabase access token. A failed
// notification never fails the listing change it reports.
async function notifyAdmin(event, filesCount = 0) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ event, filesCount })
    });
  } catch {
    /* notification is best-effort */
  }
}

// Mirrors the listings_media bucket settings in Supabase (images only, 10 MB
// per file), so a rejected upload is explained before it is attempted.
const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif'
};
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function uploadProblem(file) {
  if (!ACCEPTED_IMAGE_TYPES[file.type]) return `${file.name}: only JPG, PNG, WebP or AVIF images can be uploaded.`;
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name}: each image must be 10 MB or smaller.`;
  return null;
}

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
      const changes = { ...editForm, price: editForm.price === '' ? null : parseFloat(editForm.price) };
      const { data, error } = await supabase
        .from('partner_listings')
        .update(changes)
        .eq('id', listing.id)
        .select('id');
      if (error) throw error;
      // RLS turns an update the partner may not make into "0 rows changed"
      // rather than an error, so an empty result means nothing was saved.
      if (!data?.length) throw new Error('The listing could not be updated.');

      Object.assign(listing, changes);
      setIsEditing(false);
      
      // Notify admin about the change
      await notifyAdmin('listing_updated');

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

  const session = auth?.session;
  const authLoading = auth?.loading ?? true;

  // The role comes from public.profiles (see lib/auth.js). This redirect is
  // only UX - RLS policies are what keep other users' listings private.
  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push('/login');
    } else if (session.role !== 'partner' && session.role !== 'admin') {
      router.push('/profile');
    } else {
      loadMyListings();
    }
  }, [authLoading, session, router]);

  async function loadMyListings() {
    try {
      // Admins can read every partner's listings, so scope this desk to the
      // signed-in account explicitly.
      const { data, error } = await supabase
        .from('partner_listings')
        .select('*')
        .eq('partner_id', session.id)
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
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const problem = selected.map(uploadProblem).find(Boolean);
    if (problem) {
      alert(problem);
      e.target.value = '';
      setFiles([]);
      return;
    }
    setFiles(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const uploadedFileUrls = [];
      
      // 1. Upload files to Supabase Storage
      for (const file of files) {
        // The bucket only accepts uploads under the partner's own folder.
        const fileName = `${crypto.randomUUID()}.${ACCEPTED_IMAGE_TYPES[file.type]}`;
        const filePath = `${session.id}/${fileName}`;
        
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
          partner_id: session.id,
          title,
          description,
          price: parseFloat(price),
          currency,
          images: uploadedFileUrls
        }]);

      if (insertError) throw insertError;

      // 3. Notify Admin via API route
      await notifyAdmin('new_listing', files.length);

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
                <label className="block font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash mb-2">Upload Pictures</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center border border-dashed border-villa-obsidian/30 p-8 hover:border-villa-obsidian transition cursor-pointer bg-villa-obsidian/5"
                >
                  <span className="font-fira text-[0.7rem] uppercase tracking-[0.1em] text-villa-obsidian">
                    Click to select files
                  </span>
                  <p className="mt-2 text-xs text-villa-graphite">JPG, PNG, WebP or AVIF images, up to 10 MB each</p>
                  {files.length > 0 && (
                    <p className="mt-4 font-medium text-villa-charcoal">{files.length} file(s) selected</p>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,image/avif"
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
