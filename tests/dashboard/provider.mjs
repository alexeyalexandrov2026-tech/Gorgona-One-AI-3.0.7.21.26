import { ids,asUser,rpc } from './database.mjs';
export const fixtureEnv={NEXT_PUBLIC_SUPABASE_URL:'https://placeholder.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',BOOKING_RATE_SECRET:'fixture-rate-secret-32-characters-long'};
function tokenUser(token){
  if(Object.values(ids).includes(token))return token;
  try {const id=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).sub;return Object.values(ids).includes(id)?id:null;}catch{return null;}
}
export function provider(db) {
  let queue=Promise.resolve();
  const respond=async (input,options={})=>{
    const request=input instanceof Request?input:new Request(input,options),url=new URL(request.url);
    const token=(request.headers.get('authorization')||'').slice(7),userId=tokenUser(token);
    try {
      if(url.pathname==='/auth/v1/user')return userId?Response.json({id:userId,aud:'authenticated',role:'authenticated',email:Object.keys(ids).find(k=>ids[k]===userId)+'@example.com',user_metadata:{role:'admin',name:'Demo account'}}):Response.json({error:'unauthorized'},{status:401});
      if(url.pathname.startsWith('/rest/v1/rpc/')){
        if(token!==fixtureEnv.SUPABASE_SERVICE_ROLE_KEY)return Response.json({error:'denied'},{status:403});
        const name=url.pathname.split('/').at(-1),args=await request.json();
        if(!['dashboard_submit','dashboard_command','dashboard_claim','dashboard_settle','dashboard_delivery_status','dashboard_reserve_email','partner_listing_command','partner_listing_media_register','partner_listing_media_access'].includes(name))throw new Error('Unexpected RPC');
        if(name==='dashboard_claim'){
          await db.exec('set role service_role');
          try{return Response.json((await db.query('select * from public.dashboard_claim($1,$2)',[args.p_channels,args.p_limit])).rows);}finally{await db.exec('reset role');}
        }
        return Response.json(await rpc(db,name,args));
      }
      const table=url.pathname.split('/').at(-1);
      if(!userId&&table!=='partner_publications')return Response.json({error:'unauthorized'},{status:401});
      if(!['profiles','bookings','request_events','partner_listings','partner_publications'].includes(table)||!['GET','HEAD'].includes(request.method))return Response.json({error:'Fixture mutation denied'},{status:403});
      const columns=url.searchParams.get('select')||'*';
      // These are fixture query builders, with the same RLS roles as PostgREST.
      if(!/^[a-z_,*]+$/.test(columns))return Response.json([]);
      const where=[],params=[];
      for(const key of ['id','role','customer_user_id','assigned_partner_id','status','booking_id','partner_id','review_state','published_version','kind']){
        const value=url.searchParams.get(key);if(!value)continue;
        if(key==='id'&&value.startsWith('in.(')&&value.endsWith(')')){
          const ids=value.slice(4,-1).split(',');if(!ids.length||ids.some(id=>!/^[0-9a-f-]{36}$/i.test(id)))throw new Error('Invalid fixture ID list');
          params.push(ids);where.push('id=any($'+params.length+'::uuid[])');continue;
        }
        if(!value.startsWith('eq.'))throw new Error('Unexpected fixture filter');
        params.push(value.slice(3));where.push(key+'=$'+params.length);
      }
      const or=url.searchParams.get('or');
      if(or){const match=or.match(/^\(created_at.lt.(.+),and\(created_at.eq.\1,id.lt.([0-9a-f-]+)\)\)$/);if(!match)throw new Error('Invalid cursor fixture');params.push(match[1],match[2]);where.push('(created_at,id)<($'+(params.length-1)+'::timestamptz,$'+params.length+'::uuid)');}
      let sql='select '+columns+' from public.'+table+(where.length?' where '+where.join(' and '):'');
      const order=url.searchParams.get('order');
      if(order==='created_at.desc,id.desc')sql+=' order by created_at desc,id desc';
      else if(order==='id.asc')sql+=' order by id asc';
      else if(order?.includes('created_at'))sql+=' order by created_at '+(order.includes('.asc')?'asc':'desc');
      else if(order?.includes('company_name'))sql+=' order by company_name asc nulls last,id asc';
      let result;
      if(userId)result=await asUser(db,userId,sql,params);
      else{await db.exec('set role anon');try{result=await db.query(sql,params);}finally{await db.exec('reset role');}}
      const total=result.rows.length;
      const limit=Number(url.searchParams.get('limit')||1000),offset=Number(url.searchParams.get('offset')||0),rows=result.rows.slice(offset,offset+limit);
      const headers={'Content-Type':'application/json','content-range':`0-${Math.max(0,rows.length-1)}/${total}`};
      if(request.headers.get('accept')?.includes('application/vnd.pgrst.object+json'))return rows.length===1?Response.json(rows[0],{headers}):Response.json({error:'Expected one row'},{status:406});
      return new Response(request.method==='HEAD'?null:JSON.stringify(rows),{status:200,headers});
    }catch(error){return Response.json({error:'Fixture database error: '+error.message},{status:400});}
  };
  // PGlite uses one connection: keep SET ROLE and RESET ROLE in one work unit.
  return (input,options)=>{const result=queue.then(()=>respond(input,options));queue=result.catch(()=>{});return result;};
}
