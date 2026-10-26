-- Migration: 20261023154000_staff_invitations_and_audit_logs.sql
-- Description: Creates staff_invitations table, acceptance RPC, and updates admin_activity_log to record both admin and moderator actions while keeping log viewing strictly restricted to admins.

-- 1. Create staff_invitations table
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'moderator',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.staff_invitations;
CREATE POLICY "Admins can manage invitations"
  ON public.staff_invitations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;
CREATE POLICY "Anyone can view invitation by token"
  ON public.staff_invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());

-- 2. Helper RPC for accepting staff invitation securely
CREATE OR REPLACE FUNCTION public.accept_staff_invitation(_token TEXT, _user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Look up valid invitation
  SELECT * INTO inv
  FROM public.staff_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now();

  IF inv IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid, expired, or already used invitation token');
  END IF;

  -- Delete any prior conflicting role rows for this user
  DELETE FROM public.user_roles WHERE user_id = _user_id;

  -- Assign the invited role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, inv.role);

  -- Mark invitation as accepted
  UPDATE public.staff_invitations
  SET status = 'accepted'
  WHERE id = inv.id;

  -- Ensure profile status is approved for staff
  UPDATE public.profiles
  SET status = 'approved', updated_at = now()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'role', inv.role,
    'email', inv.email,
    'message', 'Invitation accepted! You have been granted the ' || inv.role || ' role.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_staff_invitation(TEXT, UUID) TO anon, authenticated;

-- 3. Enhance admin_activity_log for detailed staff audit trails
ALTER TABLE public.admin_activity_log ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.admin_activity_log ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.admin_activity_log ADD COLUMN IF NOT EXISTS user_role TEXT;

-- Staff (both Admin and Moderator) can log actions they take
DROP POLICY IF EXISTS "Admins can insert activity log" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Staff can insert activity log" ON public.admin_activity_log;

CREATE POLICY "Staff can insert activity log"
  ON public.admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = admin_id);

-- Viewing activity log remains STRICTLY ADMIN ONLY
DROP POLICY IF EXISTS "Admins can view activity log" ON public.admin_activity_log;
CREATE POLICY "Admins can view activity log"
  ON public.admin_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
