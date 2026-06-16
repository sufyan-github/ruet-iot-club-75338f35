
-- 1. event_registrations: remove public exposure of approved registrations
DROP POLICY IF EXISTS "Approved registrations publicly viewable" ON public.event_registrations;

-- 2. events: keep public read, but hide payment credentials from anon
REVOKE SELECT (bank_account, payment_number) ON public.events FROM anon;

-- 3. lessons: gate paid course lessons by enrollment
DROP POLICY IF EXISTS "Lessons viewable by everyone" ON public.lessons;
CREATE POLICY "Lessons viewable by enrolled or for free courses"
ON public.lessons FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.is_paid = false)
  OR EXISTS (
    SELECT 1 FROM public.course_registrations cr
    WHERE cr.course_id = lessons.course_id
      AND cr.user_id = auth.uid()
      AND cr.payment_status = 'confirmed'
  )
);

-- 4. profiles: restrict to owner + admin
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5. user_roles: restrict viewing to own row + admin
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 6. resumes storage: scope by user folder, add update/delete
DROP POLICY IF EXISTS "Users can view own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own resume" ON storage.objects;

CREATE POLICY "Users can view own resume"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own resume"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own resume"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own resume"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 7. contact_messages: tighten insert with input validation
DROP POLICY IF EXISTS "Anyone can submit a message" ON public.contact_messages;
CREATE POLICY "Anyone can submit a message"
ON public.contact_messages FOR INSERT
WITH CHECK (
  length(name) BETWEEN 1 AND 100
  AND length(email) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(subject) BETWEEN 1 AND 200
  AND length(message) BETWEEN 1 AND 5000
);

-- 8. Revoke EXECUTE on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_certificate_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_membership_id() FROM PUBLIC, anon, authenticated;
-- has_role stays callable (used in RLS expressions)
