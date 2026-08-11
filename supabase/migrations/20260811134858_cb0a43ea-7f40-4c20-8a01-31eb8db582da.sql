-- ENUMS
CREATE TYPE public.parcel_listing_type AS ENUM ('send', 'transport');
CREATE TYPE public.parcel_status AS ENUM ('active', 'matched', 'delivered', 'cancelled', 'expired');
CREATE TYPE public.parcel_request_status AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'cancelled');
CREATE TYPE public.transport_route_status AS ENUM ('active', 'full', 'completed', 'cancelled');

-- TRANSPORTERS
CREATE TABLE public.transporters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  photo text,
  bio text,
  phone text,
  whatsapp text,
  city text,
  verified boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,
  vehicle_type text,
  vehicle_number text,
  max_weight numeric,
  rating numeric NOT NULL DEFAULT 0,
  total_trips integer NOT NULL DEFAULT 0,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transporters TO authenticated;
GRANT SELECT ON public.transporters TO anon;
GRANT ALL ON public.transporters TO service_role;
ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active transporters"
  ON public.transporters FOR SELECT TO anon, authenticated
  USING (is_suspended = false);
CREATE POLICY "Users can create their transporter profile"
  ON public.transporters FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their transporter profile"
  ON public.transporters FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their transporter profile"
  ON public.transporters FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage transporters"
  ON public.transporters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.guard_transporter_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.verified := OLD.verified;
    NEW.is_suspended := OLD.is_suspended;
    NEW.rating := OLD.rating;
    NEW.total_trips := OLD.total_trips;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_guard_transporter_fields BEFORE UPDATE ON public.transporters
FOR EACH ROW EXECUTE FUNCTION public.guard_transporter_privileged_fields();
CREATE TRIGGER trg_transporters_updated_at BEFORE UPDATE ON public.transporters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PARCEL LISTINGS
CREATE TABLE public.parcel_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type public.parcel_listing_type NOT NULL DEFAULT 'send',
  sender_name text,
  sender_phone text,
  sender_whatsapp text,
  recipient_name text,
  recipient_phone text,
  departure_country text NOT NULL DEFAULT 'Sénégal',
  departure_city text NOT NULL,
  departure_address text,
  arrival_country text NOT NULL DEFAULT 'Sénégal',
  arrival_city text NOT NULL,
  arrival_address text,
  departure_date date,
  parcel_type text,
  description text,
  weight numeric,
  length numeric,
  width numeric,
  height numeric,
  declared_value numeric,
  delivery_mode text,
  price numeric,
  currency text NOT NULL DEFAULT 'FCFA',
  status public.parcel_status NOT NULL DEFAULT 'active',
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcel_listings TO authenticated;
GRANT SELECT ON public.parcel_listings TO anon;
GRANT ALL ON public.parcel_listings TO service_role;
ALTER TABLE public.parcel_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active parcel listings"
  ON public.parcel_listings FOR SELECT TO anon, authenticated
  USING (status IN ('active','matched'));
CREATE POLICY "Owners can view their parcel listings"
  ON public.parcel_listings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create parcel listings"
  ON public.parcel_listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update parcel listings"
  ON public.parcel_listings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete parcel listings"
  ON public.parcel_listings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage parcel listings"
  ON public.parcel_listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_parcel_listings_updated_at BEFORE UPDATE ON public.parcel_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_parcel_listings_route ON public.parcel_listings (departure_city, arrival_city, departure_date);
CREATE INDEX idx_parcel_listings_created ON public.parcel_listings (created_at DESC);

-- TRANSPORT ROUTES
CREATE TABLE public.transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id uuid NOT NULL REFERENCES public.transporters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  departure_country text NOT NULL DEFAULT 'Sénégal',
  departure_city text NOT NULL,
  arrival_country text NOT NULL DEFAULT 'Sénégal',
  arrival_city text NOT NULL,
  departure_date date,
  departure_time time,
  vehicle_type text,
  price numeric,
  currency text NOT NULL DEFAULT 'FCFA',
  available_weight numeric,
  available_volume text,
  description text,
  conditions text,
  status public.transport_route_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_routes TO authenticated;
GRANT SELECT ON public.transport_routes TO anon;
GRANT ALL ON public.transport_routes TO service_role;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active routes"
  ON public.transport_routes FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY "Owners can view their routes"
  ON public.transport_routes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create routes"
  ON public.transport_routes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.transporters t WHERE t.id = transporter_id AND t.user_id = auth.uid()
  ));
CREATE POLICY "Owners can update routes"
  ON public.transport_routes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete routes"
  ON public.transport_routes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage routes"
  ON public.transport_routes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_transport_routes_updated_at BEFORE UPDATE ON public.transport_routes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_transport_routes_route ON public.transport_routes (departure_city, arrival_city, departure_date);

-- PARCEL REQUESTS
CREATE TABLE public.parcel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transporter_id uuid REFERENCES public.transporters(id) ON DELETE SET NULL,
  parcel_listing_id uuid REFERENCES public.parcel_listings(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.transport_routes(id) ON DELETE SET NULL,
  status public.parcel_request_status NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcel_requests TO authenticated;
GRANT ALL ON public.parcel_requests TO service_role;
ALTER TABLE public.parcel_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester can view own requests"
  ON public.parcel_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Transporter can view received requests"
  ON public.parcel_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transporters t WHERE t.id = transporter_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can create requests"
  ON public.parcel_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Requester can update own requests"
  ON public.parcel_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Transporter can update received requests"
  ON public.parcel_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transporters t WHERE t.id = transporter_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.transporters t WHERE t.id = transporter_id AND t.user_id = auth.uid()));
CREATE POLICY "Admins manage requests"
  ON public.parcel_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_parcel_requests_updated_at BEFORE UPDATE ON public.parcel_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PARCEL PHOTOS
CREATE TABLE public.parcel_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid NOT NULL REFERENCES public.parcel_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcel_photos TO authenticated;
GRANT SELECT ON public.parcel_photos TO anon;
GRANT ALL ON public.parcel_photos TO service_role;
ALTER TABLE public.parcel_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view parcel photos"
  ON public.parcel_photos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners can add parcel photos"
  ON public.parcel_photos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete parcel photos"
  ON public.parcel_photos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage parcel photos"
  ON public.parcel_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- STORAGE OBJECT POLICIES
CREATE POLICY "Public read parcel images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('parcel-images','transporter-photos'));
CREATE POLICY "Users upload own parcel images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('parcel-images','transporter-photos') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own parcel images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('parcel-images','transporter-photos') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own parcel images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('parcel-images','transporter-photos') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users manage own transporter documents"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'transporter-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'transporter-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins read transporter documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'transporter-documents' AND public.has_role(auth.uid(), 'admin'::app_role));