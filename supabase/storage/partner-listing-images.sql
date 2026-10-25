-- Separate reviewed storage provisioning gate. No change to listings_media.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('partner_listing_images','partner_listing_images',false,8388608,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
do $$ begin
 if exists(select 1 from storage.buckets where id='partner_listing_images' and (public or file_size_limit is null or file_size_limit>8388608)) then
  raise exception 'Existing partner image bucket needs explicit security review';
 end if;
end $$;
-- New images are mediated by the authenticated API and its scoped server key.
-- A restrictive rule also defeats any pre-existing broad browser bucket policy.
create policy partner_images_server_only on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'partner_listing_images') with check(bucket_id<>'partner_listing_images');
commit;
