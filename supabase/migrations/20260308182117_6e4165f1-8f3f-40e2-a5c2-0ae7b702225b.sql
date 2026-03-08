
-- Add membership_id column to profiles
ALTER TABLE public.profiles ADD COLUMN membership_id text UNIQUE;

-- Create function to generate next membership ID
CREATE OR REPLACE FUNCTION public.generate_membership_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'RIC-' || EXTRACT(YEAR FROM now())::text || LPAD(
    (COALESCE(
      (SELECT MAX(SUBSTRING(membership_id FROM '[0-9]{3}$')::int) FROM public.profiles WHERE membership_id IS NOT NULL),
      0
    ) + 1)::text,
    3, '0'
  )
$$;
