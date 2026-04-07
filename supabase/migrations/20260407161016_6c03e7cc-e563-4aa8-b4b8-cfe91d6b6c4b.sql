
-- Create hero_slides table
CREATE TABLE public.hero_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hero slides viewable by everyone"
  ON public.hero_slides FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage hero slides"
  ON public.hero_slides FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for dynamic updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.hero_slides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
