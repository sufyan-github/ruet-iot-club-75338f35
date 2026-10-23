-- Migration: 20261024000000_club_panels_management.sql
-- Description: Store Club Panels (Committees, Advisory Boards) with draft/published state, roles, and current term markers.

CREATE TABLE IF NOT EXISTS public.club_panels (
  id text PRIMARY KEY,
  title text NOT NULL,
  board_type text NOT NULL CHECK (board_type IN ('executive', 'advisory')),
  session_years text NOT NULL,
  ordinal integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_current boolean NOT NULL DEFAULT false,
  allowed_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE public.club_panels ENABLE ROW LEVEL SECURITY;

-- 1. Public can view published panels
CREATE POLICY "Public can view published panels" ON public.club_panels
  FOR SELECT
  USING (status = 'published' OR (auth.role() = 'authenticated' AND public.is_staff(auth.uid())));

-- 2. Staff (Admin & Moderator) can insert, update, delete panels
CREATE POLICY "Staff can manage panels" ON public.club_panels
  FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Insert baseline panels if not exist
INSERT INTO public.club_panels (id, title, board_type, session_years, ordinal, status, is_current, allowed_roles, description, published_at)
VALUES
  ('panel-3rd-exec-2025-2026', '3rd Executive (2025-2026)', 'executive', '2025-2026', 3, 'published', true, '["President", "Vice-president (Technical & Mentoring)", "Vice-president (Logistics & Management)", "General Secretary", "Assistant General Secretary", "Organizing Secretary", "Finance Secretary", "Information & Research Secretary", "Publicity Secretary (Design & Sharing)", "Publicity Secretary (Content Writing)", "Assistant Organizing Secretary", "Assistant Finance Secretary", "Assistant Publicity Secretary", "Assistant Information & Research Secretary", "Executive Member", "Mentor"]'::jsonb, 'Current Governing Executive Committee of RUET IoT Club', now()),
  ('panel-2nd-exec-2024-2025', '2nd Executive (2024-2025)', 'executive', '2024-2025', 2, 'published', false, '["President", "Vice President", "General Secretary", "Assistant General Secretary", "Secretaries", "Executive Members"]'::jsonb, '2nd Executive Committee of RUET IoT Club', now()),
  ('panel-1st-exec-2023-2024', '1st Executive (2023-2024)', 'executive', '2023-2024', 1, 'published', false, '["President", "Vice President", "General Secretary", "Secretaries", "Executive Members"]'::jsonb, 'Founding Executive Committee of RUET IoT Club', now()),
  ('panel-current-advisory', 'Current Advisory Board', 'advisory', '2025-2026', 2, 'published', true, '["Chief Advisor", "Faculty Advisor", "Advisory Panel Member", "Senior Research Advisor", "Honorary Mentor"]'::jsonb, 'Current Advisory Council of RUET IoT Club', now()),
  ('panel-founding-advisory-2023', 'Founding Advisory Board (2023-2024)', 'advisory', '2023-2024', 1, 'published', false, '["Chief Advisor", "Faculty Advisor", "Founding Advisor"]'::jsonb, 'Founding Advisory Mentors of RUET IoT Club', now())
ON CONFLICT (id) DO NOTHING;
