
-- Create research_papers table
CREATE TABLE public.research_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  authors text NOT NULL,
  abstract text,
  pdf_url text,
  doi_link text,
  status text NOT NULL DEFAULT 'ongoing',
  research_area text,
  tags text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.research_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Research viewable by everyone" ON public.research_papers FOR SELECT USING (true);
CREATE POLICY "Admins can manage research" ON public.research_papers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add columns to courses table for LMS
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS max_students integer;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- Create course_registrations table
CREATE TABLE public.course_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  transaction_id text,
  progress jsonb DEFAULT '{}',
  completed boolean NOT NULL DEFAULT false,
  registered_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations" ON public.course_registrations FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can register" ON public.course_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.course_registrations FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage registrations" ON public.course_registrations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for course_registrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.research_papers;
