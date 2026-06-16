
DROP POLICY IF EXISTS "Approved profiles readable for directory" ON public.profiles;

-- Recreate the directory view as SECURITY DEFINER (security_invoker = false) so that
-- only the curated column subset is exposed to anon/authenticated, bypassing the
-- restrictive RLS on the underlying profiles table.
DROP VIEW IF EXISTS public.public_member_directory;

CREATE VIEW public.public_member_directory
WITH (security_invoker = false) AS
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
