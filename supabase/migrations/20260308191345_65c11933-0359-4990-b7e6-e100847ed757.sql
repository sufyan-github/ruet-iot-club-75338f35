CREATE POLICY "Certificates viewable by everyone for verification"
ON public.certificates
FOR SELECT
USING (true);