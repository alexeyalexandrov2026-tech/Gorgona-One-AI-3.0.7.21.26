-- Dedicated staging only; matches the production media bucket and upload rules.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('listings_media','listings_media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do nothing;
create policy listings_media_partner_upload on storage.objects for insert to authenticated
with check(bucket_id='listings_media' and (storage.foldername(name))[1]=auth.uid()::text and public.is_partner_or_admin());
create policy listings_media_owner_list on storage.objects for select to authenticated
using(bucket_id='listings_media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
commit;
