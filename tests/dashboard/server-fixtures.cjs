// Explicit local QA preload. It never ships in the product.
if(process.env.DASHBOARD_QA_FIXTURE==='1'){
  const original=globalThis.fetch;
  globalThis.fetch=(input,init)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
    if(url.hostname==='placeholder.supabase.co'){
      url.protocol='http:';url.host='127.0.0.1:3037';
      return original(typeof input==='string'||input instanceof URL?url:new Request(url,input),init);
    }
    return original(input,init);
  };
}
