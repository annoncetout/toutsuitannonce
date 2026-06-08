
-- Allow public (anonymous) access to active, approved listings for browsing without login.
DROP POLICY IF EXISTS "Active listings viewable by everyone" ON public.listings;

CREATE POLICY "Public can view active listings"
ON public.listings
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Owners can view their own listings"
ON public.listings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow public read of basic seller info on profiles (required for listing card seller badges).
CREATE POLICY "Public can view basic profile info"
ON public.profiles
FOR SELECT
TO anon
USING (true);
