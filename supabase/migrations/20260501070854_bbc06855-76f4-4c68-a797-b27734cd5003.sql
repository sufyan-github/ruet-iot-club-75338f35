-- Add approval status column for admin moderation of registrations
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- Backfill any existing rows to be safe (NOT NULL DEFAULT handles new rows)
UPDATE public.event_registrations
SET approval_status = 'pending'
WHERE approval_status IS NULL;

-- Helpful index for admin queue queries
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_status
ON public.event_registrations (event_id, approval_status);

-- Public read policy: anyone can see basic non-sensitive info for APPROVED registrants
-- (only name + event_id, used to display "confirmed participants" on event cards).
-- The existing "Users can view own registrations" policy still grants users their own row,
-- and the existing "Admins can manage registrations" policy still grants admins everything.
-- Postgres RLS is permissive: any matching policy grants access, so adding this only widens
-- visibility for rows whose approval_status = 'approved'. Sensitive columns (email, phone,
-- transaction_id) are filtered out at the query level by the frontend using a select list.
DROP POLICY IF EXISTS "Approved registrations publicly viewable" ON public.event_registrations;
CREATE POLICY "Approved registrations publicly viewable"
ON public.event_registrations
FOR SELECT
TO public
USING (approval_status = 'approved');