DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can list their listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Listing photos are publicly readable" ON storage.objects;

CREATE POLICY "Listing photos are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-photos');

CREATE POLICY "Authenticated users can upload listing photos to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can update own listing photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'listing-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can delete own listing photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);