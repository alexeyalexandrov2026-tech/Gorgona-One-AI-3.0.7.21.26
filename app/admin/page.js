"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../../lib/supabase';

function AdminListingCard({ listing, onAction }) {
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
      
      // Update local listing state (mutating props isn't ideal but fine for this simple use case, better to refresh or let parent handle)
      Object.assign(listing, editForm);
      setIsEditing(false);
      
      // Also notify partner if they had an email? 
      // User said "i have to recieve notifications about any changes". This means admin wants notifications when partners change it, not the other way around. 
    } catch (e) {
      alert("Failed to save changes: " + e.message);
    }
  };

  if (isEditing) {
    return (
      <div className="border border-brand-gold p-6 flex flex-col bg-white/80">
        <h3 className="font-fira text-[0.7rem] uppercase tracking-[0.1em] text-brand-gold mb-4">Edit Listing (AI Assisted)</h3>
        <input className="mb-2 p-2 border border-villa-obsidian/20 text-sm" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Title" />
        <div className="flex gap-2 mb-2">
          <input type="number" className="p-2 border border-villa-obsidian/20 text-sm flex-1" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} placeholder="Price" />
          <input className="p-2 border border-villa-obsidian/20 text-sm w-20" value={editForm.currency} onChange={e => setEditForm({...editForm, currency: e.target.value})} placeholder="USD" />
        </div>
        <textarea className="mb-4 p-2 border border-villa-obsidian/20 text-sm h-24" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Description" />
        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 bg-brand-gold text-white font-fira text-[0.7rem] uppercase py-2">Save</button>
          <button onClick={() => setIsEditing(false)} className="flex-1 border border-villa-obsidian/20 font-fira text-[0.7rem] uppercase py-2">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-villa-obsidian/20 p-6 flex flex-col bg-white/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="font-fira text-[0.6rem] uppercase tracking-[0.15em] text-orange-600 bg-orange-100 px-2 py-0.5">Pending</span>
          <h3 className="font-display text-2xl text-villa-charcoal mt-2">{listing.title}</h3>
        </div>
        <span className="font-fira text-[0.7rem] font-bold text-villa-obsidian">{listing.price} {listing.currency}</span>
      </div>
      
      <p className="text-sm text-villa-graphite mb-4 flex-1">{listing.description}</p>
      
      <div className="mb-4 text-xs font-fira text-villa-ash">
        Partner: {listing.profiles?.company_name || listing.profiles?.name} ({listing.profiles?.email})
      </div>
      
      {listing.images && listing.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
          {listing.images.map((img, idx) => (
            <a key={idx} href={img} target="_blank" rel="noreferrer">
              <img src={img} alt="listing" className="h-16 w-16 object-cover border border-villa-obsidian/10" />
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-3 border-t border-villa-obsidian/10 pt-4 mb-2">
        <button 
          onClick={() => onAction(listing.id, 'approve')}
          className="flex-1 bg-villa-obsidian text-villa-parchment font-fira text-[0.7rem] uppercase tracking-[0.1em] py-2 hover:bg-villa-charcoal transition"
        >
          Approve
        </button>
        <button 
          onClick={() => onAction(listing.id, 'reject')}
          className="flex-1 border border-villa-obsidian text-villa-obsidian font-fira text-[0.7rem] uppercase tracking-[0.1em] py-2 hover:bg-villa-obsidian/5 transition"
        >
          Reject
        </button>
      </div>
      <button 
        onClick={() => setIsEditing(true)}
        className="w-full text-center font-fira text-[0.6rem] uppercase tracking-[0.1em] text-brand-gold hover:underline"
      >
        ✏️ Edit before approval
      </button>
    </div>
  );
}

export default function AdminDashboard() {
  const auth = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, partners: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [pendingListings, setPendingListings] = useState([]);
  
  // Notification settings state
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyPhone, setNotifyPhone] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

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
    try {
      // 1. Get counts
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user');
      const { count: partnersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'partner');
      setStats({ users: usersCount || 0, partners: partnersCount || 0 });

      // 2. Get recent users
      const { data: recent } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);
      if (recent) setRecentUsers(recent);

      // 3. Load admin notification settings
      if (auth?.session?.metadata?.notify_email) {
        setNotifyEmail(auth.session.metadata.notify_email);
      }
      if (auth?.session?.metadata?.notify_phone) {
        setNotifyPhone(auth.session.metadata.notify_phone);
      }

      // 4. Load pending partner listings
      const { data: listings } = await supabase
        .from('partner_listings')
        .select(`
          *,
          profiles:partner_id(name, email, company_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (listings) setPendingListings(listings);

    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleListingAction(listingId, action) {
    if (!confirm(`Are you sure you want to ${action} this listing?`)) return;
    
    try {
      const { error } = await supabase
        .from('partner_listings')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', listingId);
        
      if (error) throw error;
      
      // Remove from list visually
      setPendingListings(prev => prev.filter(l => l.id !== listingId));
      
    } catch (err) {
      alert(`Failed to ${action} listing: ` + err.message);
    }
  }

  async function saveNotificationSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const newMetadata = { 
        ...auth.session.metadata, 
        notify_email: notifyEmail, 
        notify_phone: notifyPhone 
      };

      const { error } = await supabase
        .from('profiles')
        .update({ metadata: newMetadata })
        .eq('id', auth.session.id);

      if (error) throw error;
      
      auth.session.metadata = newMetadata;
      alert('Notification settings saved successfully.');
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  }

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
          <span>Admin Portal</span>
          <span>System Status: Online</span>
        </div>

        <h1 className="mt-10 font-display text-[10vw] sm:text-[6rem] font-medium leading-[0.92] tracking-[-0.02em] text-villa-charcoal uppercase mb-16">
          Admin<br/><span className="text-villa-ash/70">Console</span>
        </h1>

        <div className="grid gap-x-10 gap-y-10 md:grid-cols-3 border-t border-villa-obsidian/20 pt-10 mb-20">
          <div className="group border-b border-villa-obsidian/20 pb-10">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">Total Users (B2C)</p>
            <p className="mt-4 font-display text-5xl text-villa-charcoal">{stats.users}</p>
          </div>
          <div className="group border-b border-villa-obsidian/20 pb-10">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">B2B Partners</p>
            <p className="mt-4 font-display text-5xl text-villa-charcoal">{stats.partners}</p>
          </div>
          <div className="group border-b border-villa-obsidian/20 pb-10">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">Pending Listings</p>
            <p className="mt-4 font-display text-5xl text-villa-charcoal">{pendingListings.length}</p>
          </div>
        </div>

        {/* Pending Listings Section */}
        <div className="mb-20">
          <h2 className="font-display text-3xl font-medium tracking-tight text-villa-obsidian mb-6">Pending Proof Listings</h2>
          {pendingListings.length === 0 ? (
            <p className="font-fira text-[0.7rem] uppercase text-villa-ash">No listings waiting for approval.</p>
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

        <div className="grid lg:grid-cols-2 gap-16">
          
          {/* Recent Registrations Table */}
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight text-villa-obsidian mb-6">Recent Registrations</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-fira text-[0.7rem] uppercase">
                <thead className="border-b border-villa-obsidian/20 text-villa-ash">
                  <tr>
                    <th className="pb-3 pr-4 font-medium tracking-[0.1em]">Name / Company</th>
                    <th className="pb-3 pr-4 font-medium tracking-[0.1em]">Email</th>
                    <th className="pb-3 font-medium tracking-[0.1em]">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-villa-obsidian/10 text-villa-charcoal">
                  {recentUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="py-4 pr-4">{u.company_name || u.name || 'Unknown'}</td>
                      <td className="py-4 pr-4 text-villa-ash">{u.email}</td>
                      <td className="py-4">
                        <span className={`inline-block px-2 py-0.5 border ${u.role === 'partner' ? 'border-brand-gold text-brand-gold bg-brand-gold/5' : 'border-villa-obsidian/20'}`}>
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentUsers.length === 0 && (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-villa-ash">No recent users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Notification Settings */}
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight text-villa-obsidian mb-2">Notification Settings</h2>
            <p className="font-fira text-[0.7rem] uppercase tracking-[0.1em] text-villa-graphite mb-8">Receive alerts for new listings and partner activity</p>
            
            <form onSubmit={saveNotificationSettings} className="space-y-6">
              <div>
                <label className="block font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash mb-2">Notification Email</label>
                <input 
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="admin@gorgona.com" 
                  className="w-full border-b border-villa-obsidian/30 bg-transparent py-2 text-villa-charcoal outline-none focus:border-villa-obsidian transition placeholder:text-villa-ash/50" 
                />
              </div>
              
              <div>
                <label className="block font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash mb-2">Notification Phone (SMS/WhatsApp)</label>
                <input 
                  type="tel"
                  value={notifyPhone}
                  onChange={(e) => setNotifyPhone(e.target.value)}
                  placeholder="+1 234 567 8900" 
                  className="w-full border-b border-villa-obsidian/30 bg-transparent py-2 text-villa-charcoal outline-none focus:border-villa-obsidian transition placeholder:text-villa-ash/50" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={savingSettings}
                className="mt-4 border-b border-villa-obsidian pb-1 font-fira text-sm font-medium uppercase tracking-[0.18em] text-villa-obsidian transition-opacity hover:opacity-60 disabled:opacity-30"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </form>

            <div className="mt-8 p-4 border border-villa-obsidian/10 bg-villa-obsidian/5">
               <p className="font-fira text-[0.64rem] font-medium tracking-[0.18em] text-villa-ash uppercase mb-2">System Architecture</p>
               <p className="text-xs text-villa-graphite leading-relaxed">
                 When partners submit a listing, an API request is made to <code>/api/notify</code>. 
                 This route checks your saved notification settings and simulates sending an email and SMS alert. 
                 You can easily connect Twilio/SendGrid to this route in production.
               </p>
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}
