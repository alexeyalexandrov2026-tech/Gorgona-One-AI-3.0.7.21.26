let pending=null;
export function loadProvider(){
 if(!pending)pending=import('./provider').catch(error=>{pending=null;throw error;});
 return pending;
}
