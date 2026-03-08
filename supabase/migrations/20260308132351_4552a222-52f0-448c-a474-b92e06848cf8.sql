
-- Create storage bucket for member resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Only authenticated users can upload their own resumes
CREATE POLICY "Users can upload own resume" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view own resume" ON storage.objects FOR SELECT USING (bucket_id = 'resumes' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admins can view all resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'admin'));

-- Add new fields to profiles for extended application
ALTER TABLE public.profiles ADD COLUMN experience_level text;
ALTER TABLE public.profiles ADD COLUMN areas_of_interest text;
ALTER TABLE public.profiles ADD COLUMN previous_projects text;
ALTER TABLE public.profiles ADD COLUMN motivation text;
ALTER TABLE public.profiles ADD COLUMN time_commitment text;
ALTER TABLE public.profiles ADD COLUMN linkedin text;
ALTER TABLE public.profiles ADD COLUMN github text;
ALTER TABLE public.profiles ADD COLUMN resume_url text;
ALTER TABLE public.profiles ADD COLUMN batch text;
ALTER TABLE public.profiles ADD COLUMN email text;
