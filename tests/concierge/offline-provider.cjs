// Local QA fault fixture only: never imported by application or release code.
const actual=globalThis.fetch;
globalThis.fetch=(input,options)=>{
 const url=new URL(typeof input==='string'?input:input.url||String(input));
 if(['127.0.0.1','localhost'].includes(url.hostname)&&['8000','20128'].includes(url.port))return Promise.resolve(new Response('{}',{status:503,headers:{'Content-Type':'application/json'}}));
 return actual(input,options);
};
