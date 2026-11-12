'use client';
import {useSyncExternalStore} from 'react';
const subscribe=()=>()=>{};
const clientSnapshot=()=>true;
const serverSnapshot=()=>false;
// Each selectively hydrated consumer first sees the same view as its server HTML.
// Canonical state and subscriptions remain owned by the existing context provider.
export function useHydratedValue(value,initial){
 return useSyncExternalStore(subscribe,clientSnapshot,serverSnapshot)?value:initial;
}
