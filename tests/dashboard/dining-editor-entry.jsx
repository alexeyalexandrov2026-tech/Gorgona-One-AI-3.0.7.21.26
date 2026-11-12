import React from 'react';
import {createRoot} from 'react-dom/client';
import {LocaleProvider,useLocale} from '../../app/components/LocaleProvider';
import VenueEditor from '../../app/components/dining/VenueEditor';

function Workspace(){
 const locale=useLocale();
 return <main className="theme-villa min-h-screen bg-villa-parchment px-4 py-8 text-villa-obsidian sm:px-8"><div className="mx-auto max-w-5xl"><VenueEditor slug="komodo-miami" locale={locale} read={async(path,options)=>{
  const result=await window.diningQARead(path,options||{});
  if(result.status!==200){const error=new Error('QA request failed');error.status=result.status;throw error;}
  return result.body;
 }} onPublished={()=>{window.diningQAPublished=(window.diningQAPublished||0)+1;}}/></div></main>;
}
createRoot(document.getElementById('qa-root')).render(<LocaleProvider><Workspace/></LocaleProvider>);
