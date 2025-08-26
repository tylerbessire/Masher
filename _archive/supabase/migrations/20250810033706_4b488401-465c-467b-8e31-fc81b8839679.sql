-- Allow client uploads to private mashups bucket under uploads/*
-- Ensure RLS is enabled on storage.objects (default is enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: anonymous users can insert files under uploads/* in mashups bucket
CREATE POLICY "Anon can upload to mashups uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'mashups'
  AND name LIKE 'uploads/%'
);

-- Policy: authenticated users can also insert under uploads/* in mashups bucket
CREATE POLICY "Authenticated can upload to mashups uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mashups'
  AND name LIKE 'uploads/%'
);