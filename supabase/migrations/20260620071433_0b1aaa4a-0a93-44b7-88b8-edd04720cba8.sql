
-- 1) Allow 'unpaid' as a valid payment status (used for Cash submissions)
ALTER TABLE public.membership_payments
  DROP CONSTRAINT IF EXISTS membership_payments_payment_status_check;
ALTER TABLE public.membership_payments
  ADD CONSTRAINT membership_payments_payment_status_check
  CHECK (payment_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'unpaid'::text]));

-- 2) Backfill missing profile rows for existing auth users so the recruitment form's UPDATE succeeds
INSERT INTO public.profiles (user_id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;
