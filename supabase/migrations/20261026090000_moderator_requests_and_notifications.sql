-- Migration: 20261026090000_moderator_requests_and_notifications.sql
-- Description: RPCs and policies for member moderator requests, approval workflow, and email notifications

-- 1. Ensure anyone (authenticated or anonymous) can insert into contact_messages
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Secure RPC to submit a Moderator Role Request
CREATE OR REPLACE FUNCTION public.request_moderator_access(
  _name TEXT,
  _email TEXT,
  _department TEXT DEFAULT NULL,
  _student_id TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL,
  _skills TEXT DEFAULT NULL,
  _reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_email TEXT;
  clean_name TEXT;
  payload JSONB;
BEGIN
  clean_email := lower(trim(_email));
  clean_name := trim(_name);

  IF clean_email IS NULL OR clean_email = '' OR clean_name IS NULL OR clean_name = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Name and Email are required');
  END IF;

  payload := jsonb_build_object(
    'name', clean_name,
    'email', clean_email,
    'department', coalesce(_department, '—'),
    'student_id', coalesce(_student_id, '—'),
    'phone', coalesce(_phone, '—'),
    'skills', coalesce(_skills, '—'),
    'reason', coalesce(_reason, '—'),
    'requested_role', 'moderator',
    'status', 'pending',
    'created_at', now()
  );

  -- Insert into contact_messages
  INSERT INTO public.contact_messages (name, email, subject, message, status)
  VALUES (
    clean_name,
    clean_email,
    'MODERATOR_REQUEST: Application for Club Moderator',
    payload::text,
    'new'
  );

  -- Upsert announcement record for fast query
  DELETE FROM public.announcements WHERE title = 'MODERATOR_REQUEST:' || clean_email;
  INSERT INTO public.announcements (title, message)
  VALUES ('MODERATOR_REQUEST:' || clean_email, payload::text);

  RETURN jsonb_build_object(
    'success', true,
    'email', clean_email,
    'message', 'Moderator access request submitted successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_moderator_access(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 3. Secure Admin RPC to approve moderator request
CREATE OR REPLACE FUNCTION public.approve_moderator_access_request(_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_email TEXT;
  target_user_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve moderator requests';
  END IF;

  clean_email := lower(trim(_email));

  -- Lookup user ID in profiles or auth.users
  SELECT p.user_id INTO target_user_id
  FROM public.profiles p
  WHERE lower(p.email) = clean_email
  LIMIT 1;

  IF target_user_id IS NULL THEN
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE lower(email) = clean_email
    LIMIT 1;
  END IF;

  IF target_user_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'moderator');
  END IF;

  -- Update message status
  UPDATE public.contact_messages
  SET status = 'approved',
      admin_reply = 'Approved by Club Administrator as Moderator',
      replied_at = now(),
      replied_by = auth.uid()
  WHERE lower(email) = clean_email AND subject LIKE 'MODERATOR_REQUEST:%';

  -- Remove pending announcement marker
  DELETE FROM public.announcements WHERE title = 'MODERATOR_REQUEST:' || clean_email;

  RETURN jsonb_build_object(
    'success', true,
    'email', clean_email,
    'user_id', target_user_id,
    'message', 'Approved as Moderator successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_moderator_access_request(TEXT) TO authenticated;

-- Reload schema
NOTIFY pgrst, 'reload schema';
