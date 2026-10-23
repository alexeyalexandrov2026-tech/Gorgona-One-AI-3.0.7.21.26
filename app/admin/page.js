'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {LocalizedTitle,useSavedText} from '../components/LocalizedText';
import {useAuth} from '../components/AuthProvider';
import {supabase} from '../../lib/supabase';
import RequestBoard,{NotificationSummary} from '../components/dashboard/RequestBoard';
import ListingWorkspace from '../components/dashboard/ListingWorkspace';
function AdminWorkspace(){
 const auth=useAuth(),router=useRouter(),msg=useSavedText();
 const [stats,setStats]=useState({users:null,partners:null,pending:null}),[recent,setRecent]=useState([]),[error,setError]=useState(false);
 useEffect(()=>{
  let active=true;
  if(auth.loading)return;
  if(!auth.session){router.replace('/login');return;}
  if(auth.session.role!=='admin'){router.replace('/profile');return;}
  (async()=>{
   const [users,partners,pending,profiles]=await Promise.all([
    supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','user'),
    supabase.from('profiles').select('*',{count:'exact',head:true}).eq('role','partner'),
    supabase.from('partner_listings').select('*',{count:'exact',head:true}).eq('review_state','pending'),
    supabase.from('profiles').select('id,name,email,company_name,role').order('created_at',{ascending:false}).limit(5)
   ]);
   if([users,partners,pending,profiles].some(r=>r.error))throw Error('Summary unavailable');
   if(active){setStats({users:users.count,partners:partners.count,pending:pending.count});setRecent(profiles.data||[]);}
  })().catch(()=>{if(active)setError(true);});
  return()=>{active=false;};
 },[auth.loading,auth.session,router]);
 if(auth.loading||auth.session?.role!=='admin')return <main role="status" className="theme-villa bg-villa-parchment p-10 text-villa-obsidian">{msg('Loading...')}</main>;
 return <main className="flex-1 theme-villa full-bleed bg-villa-parchment text-villa-obsidian pb-20 pt-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  <div className="border-b border-villa-obsidian/20 pb-4 text-sm">{msg('Admin Portal')}</div>
  <h1 className="my-10 font-display text-[clamp(2.8rem,6vw,6rem)] leading-none uppercase"><LocalizedTitle source="Admin{break}Console"/></h1>
  {error&&<p role="alert">{msg('Unable to load requests.')}</p>}
  <div className="mb-10 grid gap-6 sm:grid-cols-3">{[[msg('Total Users (B2C)'),stats.users],[msg('B2B Partners'),stats.partners],[msg('Pending Listings'),stats.pending]].map(([label,value])=><div key={label} className="border-y border-villa-obsidian/20 py-5"><p className="text-sm">{label}</p><p className="mt-3 font-display text-4xl">{error?'—':value??'—'}</p></div>)}</div>
  <ListingWorkspace scope="admin"/>
  <RequestBoard scope="admin"/>
  <NotificationSummary/>
  <section className="mt-10 min-w-0"><h2 className="mb-5 font-display text-3xl">{msg('Recent Registrations')}</h2><div className="overflow-x-auto"><table className="w-full text-start text-sm"><thead><tr><th className="py-3 text-start">{msg('Name / Company')}</th><th className="text-start">{msg('Email')}</th><th className="text-start">{msg('Role')}</th></tr></thead><tbody>{recent.map(u=><tr key={u.id} className="border-t border-villa-obsidian/20"><td className="py-4 pe-3">{u.company_name||u.name||msg('Unknown')}</td><td className="pe-3">{u.email}</td><td>{({user:msg('User'),partner:msg('Business partner'),admin:msg('Administrator')})[u.role]||u.role}</td></tr>)}</tbody></table></div></section>
 </div></main>;
}
export default function AdminDashboard(){const {session}=useAuth();return <AdminWorkspace key={session?.id||'signed-out'}/>;}
