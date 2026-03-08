
-- Team members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text NOT NULL,
  department text,
  bio text,
  image_url text,
  linkedin text,
  github text,
  email text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team viewable by everyone" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Admins can manage team" ON public.team_members FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Activity photos table
CREATE TABLE public.activity_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  image_url text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos viewable by everyone" ON public.activity_photos FOR SELECT USING (true);
CREATE POLICY "Admins can manage photos" ON public.activity_photos FOR ALL USING (public.has_role(auth.uid(), 'admin'));
