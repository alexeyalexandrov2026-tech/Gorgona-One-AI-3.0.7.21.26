'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {LocalizedTitle,useSavedText} from '../components/LocalizedText';
import {useAuth} from '../components/AuthProvider';
import RequestBoard from '../components/dashboard/RequestBoard';
import ListingWorkspace from '../components/dashboard/ListingWorkspace';
function PartnerWorkspace(){
 const auth=useAuth(),router=useRouter(),msg=useSavedText();
 useEffect(()=>{if(!auth.loading){if(!auth.session)router.replace('/login');else if(!['partner','admin'].includes(auth.session.role))router.replace('/profile');}},[auth.loading,auth.session,router]);
 if(auth.loading||!['partner','admin'].includes(auth.session?.role))return <main role="status" className="theme-villa bg-villa-parchment p-10 text-villa-obsidian">{msg('Loading...')}</main>;
 return <main className="flex-1 theme-villa full-bleed bg-villa-parchment text-villa-obsidian pb-20 pt-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  <div className="flex flex-wrap justify-between gap-3 border-b border-villa-obsidian/20 pb-4 text-sm"><span>{msg('Partner Portal')}</span><span>{auth.session.company_name||auth.session.name}</span></div>
  <h1 className="my-10 font-display text-[clamp(2.8rem,6vw,6rem)] leading-none uppercase"><LocalizedTitle source="Partner{break}Desk"/></h1>
  <ListingWorkspace scope="partner"/>
  <RequestBoard scope="partner"/>
 </div></main>;
}
export default function PartnerDashboard(){const {session}=useAuth();return <PartnerWorkspace key={session?.id||'signed-out'}/>;}
