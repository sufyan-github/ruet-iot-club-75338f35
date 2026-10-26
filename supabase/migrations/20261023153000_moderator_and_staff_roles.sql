-- Migration: 20261023153000_moderator_and_staff_roles.sql
-- Description: Grant 'moderator' role access to operational content management (events, projects, blogs, gallery, announcements, courses, participants, etc.)
-- Strict Security: Keep financial transactions (membership_payments) and role administration (user_roles) strictly restricted to 'admin'.

-- 1. Helper function to check if a user is Staff (Admin or Moderator)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'moderator')
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO anon, authenticated;

-- 2. Events policies: allow staff to manage events
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Staff can manage events" ON public.events;

CREATE POLICY "Staff can insert events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update events" ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete events" ON public.events
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- 3. Event registrations: allow staff to view and manage participants
DROP POLICY IF EXISTS "Admins can manage registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Staff can manage event registrations" ON public.event_registrations;

CREATE POLICY "Staff can view all event registrations" ON public.event_registrations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "Staff can update event registrations" ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete event registrations" ON public.event_registrations
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- 4. Projects policies: allow staff to manage projects
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Staff can manage projects" ON public.projects;

CREATE POLICY "Staff can insert projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_staff(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.is_staff(auth.uid()));

-- 5. Activity Photos policies: allow staff to manage gallery
DROP POLICY IF EXISTS "Admins can manage photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Staff can manage photos" ON public.activity_photos;

CREATE POLICY "Staff can insert photos" ON public.activity_photos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update photos" ON public.activity_photos
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete photos" ON public.activity_photos
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- 6. Announcements policies: allow staff to manage announcements
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff can manage announcements" ON public.announcements;

CREATE POLICY "Staff can insert announcements" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update announcements" ON public.announcements
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete announcements" ON public.announcements
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- 7. Blog Posts policies: allow staff to manage blogs
DROP POLICY IF EXISTS "Admins can manage blog" ON public.blog_posts;
DROP POLICY IF EXISTS "Staff can manage blog" ON public.blog_posts;

CREATE POLICY "Staff can manage blog" ON public.blog_posts
  FOR ALL TO authenticated
  USING (auth.uid() = author_id OR public.is_staff(auth.uid()))
  WITH CHECK (auth.uid() = author_id OR public.is_staff(auth.uid()));

-- 8. Research Papers policies: allow staff to manage research
DROP POLICY IF EXISTS "Admins can manage research" ON public.research_papers;
DROP POLICY IF EXISTS "Staff can manage research" ON public.research_papers;

CREATE POLICY "Staff can manage research" ON public.research_papers
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 9. Courses and Lessons: allow staff to manage course catalog
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Staff can manage courses" ON public.courses;

CREATE POLICY "Staff can manage courses" ON public.courses
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Staff can manage lessons" ON public.lessons;

CREATE POLICY "Staff can manage lessons" ON public.lessons
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 10. Alumni: allow staff to manage alumni entries
DROP POLICY IF EXISTS "Admins can delete alumni" ON public.alumni;
DROP POLICY IF EXISTS "Staff can manage alumni" ON public.alumni;

CREATE POLICY "Staff can manage alumni" ON public.alumni
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 11. Team Members: allow staff to manage team showcase
DROP POLICY IF EXISTS "Admins can manage team" ON public.team_members;
DROP POLICY IF EXISTS "Staff can manage team" ON public.team_members;

CREATE POLICY "Staff can manage team" ON public.team_members
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 12. Contact Messages: allow staff to view and reply to inquiries
DROP POLICY IF EXISTS "Admins can view messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Staff can view messages" ON public.contact_messages;

CREATE POLICY "Staff can view messages" ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update messages" ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 13. Storage bucket 'club-images': allow staff to upload/modify images
DROP POLICY IF EXISTS "Admins can upload club images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update club images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete club images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload club images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update club images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete club images" ON storage.objects;

CREATE POLICY "Staff can upload club images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'club-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can update club images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'club-images' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'club-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete club images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'club-images' AND public.is_staff(auth.uid()));

-- 14. Ensure user_roles can be read by admins and self, and managed ONLY by admins
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 15. Helper RPC to promote/assign role by email (callable only by admins)
CREATE OR REPLACE FUNCTION public.assign_role_by_email(_email TEXT, _role app_role)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  existing_count INT;
BEGIN
  -- Only admin can invoke this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can assign roles';
  END IF;

  -- Lookup user ID from profiles or auth.users
  SELECT p.user_id INTO target_user_id
  FROM public.profiles p
  WHERE lower(p.email) = lower(_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    -- Fallback lookup in auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE lower(email) = lower(_email)
    LIMIT 1;
  END IF;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No registered user found with email ' || _email);
  END IF;

  -- Delete existing roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Insert new role
  IF _role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, _role);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'role', _role,
    'message', 'Successfully updated role to ' || _role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_role_by_email(TEXT, app_role) TO authenticated;
