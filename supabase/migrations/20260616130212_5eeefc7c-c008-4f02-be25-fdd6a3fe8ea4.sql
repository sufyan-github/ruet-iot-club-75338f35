
DROP VIEW IF EXISTS public.public_member_directory;

CREATE OR REPLACE FUNCTION public.get_public_members()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  student_id text,
  department text,
  batch text,
  session text,
  membership_id text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.full_name, p.avatar_url, p.student_id,
         p.department, p.batch, p.session, p.membership_id, p.status, p.created_at
  FROM public.profiles p
  WHERE p.status = 'approved'
  ORDER BY p.full_name ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_members() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_members() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_approved_member_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.profiles WHERE status = 'approved';
$$;

REVOKE EXECUTE ON FUNCTION public.get_approved_member_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_approved_member_count() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_certificate_holder(_user_id uuid)
RETURNS TABLE (full_name text, department text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name, p.department FROM public.profiles p WHERE p.user_id = _user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_certificate_holder(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_certificate_holder(uuid) TO anon, authenticated;
