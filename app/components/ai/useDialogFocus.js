'use client';
import {useEffect} from 'react';
export function useDialogFocus(open,ref){
 useEffect(()=>{
  if(!open||!ref.current)return;
  const panel=ref.current,previous=document.activeElement;
  const controls=()=>[...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(node=>node.getClientRects().length&&!node.closest('[inert]'));
  controls()[0]?.focus({preventScroll:true});
  function onKey(event){
   if(event.key!=='Tab')return;
   const nodes=controls(),first=nodes[0],last=nodes.at(-1);if(!first){event.preventDefault();return;}
   if(!panel.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();}
   else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  document.addEventListener('keydown',onKey,true);
  return()=>{document.removeEventListener('keydown',onKey,true);if(panel.contains(document.activeElement)&&previous?.isConnected&&!previous.closest('[inert]'))previous.focus({preventScroll:true});};
 },[open,ref]);
}
