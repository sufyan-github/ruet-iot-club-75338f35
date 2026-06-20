
-- 1) Revoke sensitive event columns from anonymous role; keep for authenticated
REVOKE SELECT ON public.events FROM anon;
GRANT SELECT (id, title, date, venue, description, type, max_participants, created_at, image_url, is_paid, registration_fee, payment_methods) ON public.events TO anon;
-- Authenticated keeps full access
GRANT SELECT ON public.events TO authenticated;

-- 2) Remove sensitive tables from realtime publication. Profiles must never be broadcast.
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
