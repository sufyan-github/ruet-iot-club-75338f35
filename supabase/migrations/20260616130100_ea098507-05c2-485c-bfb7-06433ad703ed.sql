
CREATE OR REPLACE VIEW public.public_member_directory
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.user_id,
  p.full_name,
  p.avatar_url,
  p.student_id,
  p.department,
  p.batch,
  p.session,
  p.membership_id,
  p.status,
  p.created_at
FROM public.profiles p
WHERE p.status = 'approved';

GRANT SELECT ON public.public_member_directory TO anon, authenticated;

-- Allow the view to bypass profiles RLS for these safe columns by using a SECURITY DEFINER wrapper is not needed
-- because security_invoker=true means RLS still applies. We need a permissive policy for the public-safe slice.
-- Add a SELECT policy that allows public access to rows where status='approved' but only when queried via the view.
-- Since we cannot scope by view, we add a narrow public SELECT policy that re-enables anon reads only for approved profiles.
CREATE POLICY "Approved profiles readable for directory"
ON public.profiles FOR SELECT
USING (status = 'approved');
