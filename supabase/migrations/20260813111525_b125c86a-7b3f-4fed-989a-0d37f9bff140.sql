CREATE POLICY "Users can view their transporter profile"
ON public.transporters
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);