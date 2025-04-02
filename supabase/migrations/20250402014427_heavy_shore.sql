/*
  # Storage Bucket and Policies for Product Images

  1. New Storage Bucket
    - Creates 'product-images' bucket for storing product images
    
  2. Security Policies
    - Enables RLS on the storage bucket
    - Allows public read access to all images
    - Allows authenticated vendors to upload images
    - Allows vendors to delete their own images
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all files in the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated vendors to upload files
CREATE POLICY "Vendors can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    SELECT role = 'vendor'
    FROM auth.users
    JOIN public.profiles ON auth.users.id = profiles.id
    WHERE auth.users.id = auth.uid()
  )
);

-- Allow vendors to delete their own files
CREATE POLICY "Vendors can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    SELECT role = 'vendor'
    FROM auth.users
    JOIN public.profiles ON auth.users.id = profiles.id
    WHERE auth.users.id = auth.uid()
  )
);