
-- Create storage bucket for club images
INSERT INTO storage.buckets (id, name, public) VALUES ('club-images', 'club-images', true);

-- Storage policies
CREATE POLICY "Anyone can view club images" ON storage.objects FOR SELECT USING (bucket_id = 'club-images');
CREATE POLICY "Admins can upload club images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update club images" ON storage.objects FOR UPDATE USING (bucket_id = 'club-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete club images" ON storage.objects FOR DELETE USING (bucket_id = 'club-images' AND public.has_role(auth.uid(), 'admin'));

-- Add image_url to projects and events
ALTER TABLE public.projects ADD COLUMN image_url text;
ALTER TABLE public.events ADD COLUMN image_url text;

-- Add paid event fields
ALTER TABLE public.events ADD COLUMN is_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN registration_fee numeric DEFAULT 0;
ALTER TABLE public.events ADD COLUMN payment_methods text[] DEFAULT '{}';

-- Add payment fields to event_registrations
ALTER TABLE public.event_registrations ADD COLUMN payment_method text;
ALTER TABLE public.event_registrations ADD COLUMN transaction_id text;
ALTER TABLE public.event_registrations ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.event_registrations ADD COLUMN name text;
ALTER TABLE public.event_registrations ADD COLUMN email text;
ALTER TABLE public.event_registrations ADD COLUMN phone text;
ALTER TABLE public.event_registrations ADD COLUMN department text;

-- Allow admins to view all registrations
CREATE POLICY "Admins can manage registrations" ON public.event_registrations FOR ALL USING (public.has_role(auth.uid(), 'admin'));
