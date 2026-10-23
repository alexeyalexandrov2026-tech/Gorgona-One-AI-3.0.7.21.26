import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';

export const ids = { customer:'11111111-1111-4111-8111-111111111111', other:'22222222-2222-4222-8222-222222222222',
  partner:'33333333-3333-4333-8333-333333333333', admin:'44444444-4444-4444-8444-444444444444' };
export async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create table public.profiles(id uuid primary key references auth.users(id),email text not null,role text not null default 'user',name text,company_name text,metadata jsonb default '{}',created_at timestamptz not null default now());
    create table public.partner_listings(id uuid primary key default gen_random_uuid(),partner_id uuid not null references auth.users(id),title text not null,description text,price numeric,currency text,images text[] default '{}',status text default 'pending',created_at timestamptz not null default now());
    create table public.bookings(id uuid primary key default gen_random_uuid(),item_slug text,item_title text,client_name text,client_email text,client_phone text,dates text,status text default 'pending',created_at timestamptz not null default now());
  `);
  await db.exec(fs.readFileSync(new URL('./live-guards.sql',import.meta.url),'utf8'));
  await db.exec(`
    alter table public.profiles enable row level security;
    alter table public.partner_listings enable row level security;
    alter table public.bookings enable row level security;
    create policy profiles_select_own_or_admin on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
    create policy profiles_update_own on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
    create policy profiles_update_admin on public.profiles for update to authenticated using(public.is_admin()) with check(public.is_admin());
    create policy partner_listings_select on public.partner_listings for select to authenticated using(partner_id=auth.uid() or public.is_admin());
    create policy partner_listings_insert_own on public.partner_listings for insert to authenticated with check(partner_id=auth.uid() and public.is_partner_or_admin());
    create policy partner_listings_update_own on public.partner_listings for update to authenticated using(partner_id=auth.uid()) with check(partner_id=auth.uid());
    create policy partner_listings_update_admin on public.partner_listings for update to authenticated using(public.is_admin()) with check(public.is_admin());
    create policy bookings_admin on public.bookings for all to authenticated using(public.is_admin()) with check(public.is_admin());
    create policy bookings_insert_public on public.bookings for insert to anon,authenticated with check(status='pending');
    create trigger protect_profile_columns before update on public.profiles for each row execute function public.protect_profile_columns();
    create trigger partner_listings_moderation before insert or update on public.partner_listings for each row execute function public.partner_listings_moderation();
    grant all on all tables in schema public to anon,authenticated,service_role;
  `);
  for (const [name,id] of Object.entries(ids)) {
    await db.query('insert into auth.users(id,email) values($1,$2)',[id,name+'@example.com']);
    await db.query('insert into public.profiles(id,email,name,role,company_name) values($1,$2,$3,$4,$5)',[id,name+'@example.com','Demo '+name,['partner','admin'].includes(name)?name:'user',name==='partner'?'Demo Partner Company':null]);
  }
  for (const file of fs.readdirSync(new URL('../../supabase/migrations/',import.meta.url)).sort()) await db.exec(fs.readFileSync(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'));
  await db.exec('create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user()');
  return db;
}

export async function asUser(db, id, sql, params = []) {
  await db.exec('set role authenticated');
  try { await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); return await db.query(sql,params); }
  finally { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
}
export async function rpc(db, name, args) {
  await db.exec('set role service_role');
  try {
    const entries=Object.entries(args);
    const values=entries.map(([,v])=>v && typeof v==='object' && !Array.isArray(v)?JSON.stringify(v):v);
    const result=await db.query('select public.'+name+'('+entries.map(([k],i)=>k+' => $'+(i+1)).join(',')+') as value',values);
    return result.rows[0].value;
  } finally { await db.exec('reset role'); }
}
