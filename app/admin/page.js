"use client";
import { LocalizedTitle, useSavedText } from "../components/LocalizedText";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import RequestBoard, { NotificationSummary } from '../components/dashboard/RequestBoard';

function AdminListingCard({ listing, onAction }) {
  const msg = useSavedText();
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
        .eq('id', listing.id).select('id').single();
      if (error) throw error;
      
      // Update local listing state (mutating props isn't ideal but fine for this simple use case, better to refresh or let parent handle)
      Object.assign(listing, editForm);
      setIsEditing(false);
      
      // Also notify partner if they had an email? 
      // User said "i have to recieve notifications about any changes". This means admin wants notifications when partners change it, not the other way around. 
    } catch (e) {
      alert(msg("Failed to save changes: {error}", { error: e.message }));
    }
  };

  if (isEditing) {
    return (
      <div className="border border-brand-gold p-6 flex flex-col bg-white/80">
        <h3 className="font-fira text-[0.7rem] uppercase tracking-[0.1em] text-brand-gold mb-4">{msg("Edit Listing (AI Assisted)")}</h3>
        <input className="mb-2 p-2 border border-villa-obsidian/20 text-sm" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder={msg("Title")} />
        <div className="flex gap-2 mb-2">
          <input type="number" className="p-2 border border-villa-obsidian/20 text-sm flex-1" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} placeholder={msg("Price")} />
          <input className="p-2 border border-villa-obsidian/20 text-sm w-20" value={editForm.currency} onChange={e => setEditForm({...editForm, currency: e.target.value})} placeholder="USD" />
        </div>
        <textarea className="mb-4 p-2 border border-villa-obsidian/20 text-sm h-24" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder={msg("Description")} />
        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 bg-brand-gold text-white font-fira text-[0.7rem] uppercase py-2">{msg("Save")}</button>
          <button onClick={() => setIsEditing(false)} className="flex-1 border border-villa-obsidian/20 font-fira text-[0.7rem] uppercase py-2">{msg("Cancel")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-villa-obsidian/20 p-6 flex flex-col bg-white/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="font-fira text-[0.6rem] uppercase tracking-[0.15em] text-orange-600 bg-orange-100 px-2 py-0.5">{msg("Pending")}</span>
          <h3 className="font-display text-2xl text-villa-charcoal mt-2">{listing.title}</h3>
        </div>
        <span className="font-fira text-[0.7rem] font-bold text-villa-obsidian">{listing.price} {listing.currency}</span>
      </div>
      
      <p className="text-sm text-villa-graphite mb-4 flex-1">{listing.description}</p>
      
      <div className="mb-4 text-xs font-fira text-villa-ash">{msg("Partner: ")}{listing.profiles?.company_name || listing.profiles?.name} ({listing.profiles?.email})
      </div>
      
      {listing.images && listing.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
          {listing.images.map((img, idx) => (
            <a key={idx} href={img} target="_blank" rel="noreferrer">
              <img src={img} alt={msg("listing")} className="h-16 w-16 object-cover border border-villa-obsidian/10" />
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-3 border-t border-villa-obsidian/10 pt-4 mb-2">
        <button 
          onClick={() => onAction(listing.id, 'approve')}
          className="flex-1 bg-villa-obsidian text-villa-parchment font-fira text-[0.7rem] uppercase tracking-[0.1em] py-2 hover:bg-villa-charcoal transition"
        >{msg("Approve")}</button>
        <button 
          onClick={() => onAction(listing.id, 'reject')}
          className="flex-1 border border-villa-obsidian text-villa-obsidian font-fira text-[0.7rem] uppercase tracking-[0.1em] py-2 hover:bg-villa-obsidian/5 transition"
        >{msg("Reject")}</button>
      </div>
      <button 
        onClick={() => setIsEditing(true)}
        className="w-full text-center font-fira text-[0.6rem] uppercase tracking-[0.1em] text-brand-gold hover:underline"
      >{msg("✏️ Edit before approval")}</button>
    </div>
  );
}

function AdminWorkspace() {
  const msg = useSavedText();
  const auth = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: null, partners: null });
  const [recentUsers, setRecentUsers] = useState([]);
  const [pendingListings, setPendingListings] = useState([]);
  
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (auth && !auth.loading) {
      if (!auth.session) {
        router.push('/login');
      } else if (auth.session.role !== 'admin') {
        router.push('/profile');
      } else {
        loadData();
      }
    }
  }, [auth, router]);

  async function loadData() {
    setLoadError(false);
    try {
      // 1. Get counts
      const { count: usersCount, error: usersError } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user');
      const { count: partnersCount, error: partnersError } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'partner');
      if (usersError || partnersError) throw usersError || partnersError;
      setStats({ users: usersCount, partners: partnersCount });

      // 2. Get recent users
      const { data: recent, error: recentError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);
      if (recentError) throw recentError;
      if (recent) setRecentUsers(recent);

      // 4. Load pending partner listings
      const { data: listings, error: listingsError } = await supabase
        .from('partner_listings')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (listingsError) throw listingsError;
      if (listings) {
        const ids=[...new Set(listings.map(listing=>listing.partner_id))];
        let profiles=[];
        if(ids.length){
          const {data,error}=await supabase.from('profiles').select('id,name,email,company_name').in('id',ids);
          if(error)throw error;
          profiles=data||[];
        }
        const byId=new Map(profiles.map(profile=>[profile.id,profile]));
        setPendingListings(listings.map(listing=>({...listing,profiles:byId.get(listing.partner_id)||null})));
      }

    } catch (err) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleListingAction(listingId, action) {
    if (!confirm(action === 'approve' ? msg("Are you sure you want to approve this listing?") : msg("Are you sure you want to reject this listing?"))) return;
    
    try {
      const { error } = await supabase
        .from('partner_listings')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', listingId).select('id').single();
        
      if (error) throw error;
      
      // Remove from list visually
      setPendingListings(prev => prev.filter(l => l.id !== listingId));
      
    } catch (err) {
      alert(action === 'approve' ? msg("Failed to approve listing: {error}", { error: msg('Try again') }) : msg("Failed to reject listing: {error}", { error: msg('Try again') }));
    }
  }

  if (loading || auth?.loading || auth?.session?.role !== 'admin') {
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
          <span>{msg("Admin Portal")}</span>
          <span>{msg("System Status: Online")}</span>
        </div>

        <h1 className="mt-10 font-display text-[10vw] sm:text-[6rem] font-medium leading-[0.92] tracking-[-0.02em] text-villa-charcoal uppercase mb-16"><LocalizedTitle source="Admin{break}Console" />
        </h1>

        <div className="grid gap-x-10 gap-y-10 md:grid-cols-3 border-t border-villa-obsidian/20 pt-10 mb-20">
          <div className="group border-b border-villa-obsidian/20 pb-10">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">{msg("Total Users (B2C)")}</p>
            <p className="mt-4 font-display text-5xl text-villa-charcoal">{stats.users ?? '—'}</p>
          </div>
          <div className="group border-b border-villa-obsidian/20 pb-10">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">{msg("B2B Partners")}</p>
            <p className="mt-4 font-display text-5xl text-villa-charcoal">{stats.partners ?? '—'}</p>
          </div>
          <div className="group border-b border-villa-obsidian/20 pb-10">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">{msg("Pending Listings")}</p>
            <p className="mt-4 font-display text-5xl text-villa-charcoal">{loadError ? '—' : pendingListings.length}</p>
          </div>
        </div>

        <RequestBoard key={auth.session.id} scope="admin" />
        <NotificationSummary key={'notifications-' + auth.session.id} />
        {loadError && <p role="alert" className="mb-6 text-sm text-villa-graphite">{msg('Unable to load requests.')}</p>}
        {/* Pending Listings Section */}
        <div className="mb-20">
          <h2 className="font-display text-3xl font-medium tracking-tight text-villa-obsidian mb-6">{msg("Pending Proof Listings")}</h2>
          {loadError ? null : pendingListings.length === 0 ? (
            <p className="font-fira text-[0.7rem] uppercase text-villa-ash">{msg("No listings waiting for approval.")}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pendingListings.map(listing => (
                <AdminListingCard 
                  key={listing.id} 
                  listing={listing} 
                  onAction={handleListingAction} 
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-16">
          
          {/* Recent Registrations Table */}
          <div className="min-w-0 break-words">
            <h2 className="font-display text-3xl font-medium tracking-tight text-villa-obsidian mb-6">{msg("Recent Registrations")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-fira text-[0.7rem] uppercase">
                <thead className="border-b border-villa-obsidian/20 text-villa-ash">
                  <tr>
                    <th className="pb-3 pr-4 font-medium tracking-[0.1em]">{msg("Name / Company")}</th>
                    <th className="pb-3 pr-4 font-medium tracking-[0.1em]">{msg("Email")}</th>
                    <th className="pb-3 font-medium tracking-[0.1em]">{msg("Role")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-villa-obsidian/10 text-villa-charcoal">
                  {recentUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="py-4 pr-4">{u.company_name || u.name || msg('Unknown')}</td>
                      <td className="py-4 pr-4 text-villa-ash">{u.email}</td>
                      <td className="py-4">
                        <span className={`inline-block px-2 py-0.5 border ${u.role === 'partner' ? "border-brand-gold text-brand-gold bg-brand-gold/5" : "border-villa-obsidian/20"}`}>
                          {({user:msg('User'),partner:msg('Business partner'),admin:msg('Administrator')})[u.role] || u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loadError && recentUsers.length === 0 && (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-villa-ash">{msg("No recent users found.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          
        </div>
      </div>
    </main>
  );
}

export default function AdminDashboard() {
  const auth = useAuth();
  return <AdminWorkspace key={auth?.session?.id || 'signed-out'} />;
}
