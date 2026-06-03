DROP POLICY IF EXISTS "Listing photos are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Owners can list their listing photos" ON storage.objects;

CREATE POLICY "Owners can list their listing photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);