-- SQL Schema for Partner Listings and Media Storage

-- 1. Create table for partner listings
CREATE TABLE public.partner_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT,
  images TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.partner_listings ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for partner_listings
-- Admins can view all listings
CREATE POLICY "Admins can view all partner listings" ON public.partner_listings
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins can update all listings
CREATE POLICY "Admins can update all partner listings" ON public.partner_listings
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Partners can view their own listings
CREATE POLICY "Partners can view own listings" ON public.partner_listings
  FOR SELECT USING (
    auth.uid() = partner_id
  );

-- Partners can insert their own listings
CREATE POLICY "Partners can insert own listings" ON public.partner_listings
  FOR INSERT WITH CHECK (
    auth.uid() = partner_id
  );

-- 4. Create Storage Bucket for listing media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('listings_media', 'listings_media', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Policies
-- Allow public access to read files
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'listings_media');

-- Allow authenticated partners to upload files
CREATE POLICY "Partners can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'listings_media' AND auth.role() = 'authenticated'
  );
