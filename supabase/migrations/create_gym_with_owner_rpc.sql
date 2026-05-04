-- Fix: brand-new users could not create their first gym because
-- supabase.from('gyms').insert([...]).select() requires a SELECT RLS policy
-- to permit reading back the just-inserted row. The existing SELECT policies
-- require an existing gym_users row, which doesn't exist yet at signup time.
-- Result: every new signup hit "new row violates row-level security policy
-- for table 'gyms'" and bounced.
--
-- Fix: do the gym + gym_users INSERT atomically via a SECURITY DEFINER RPC.
-- This is the official Supabase pattern for first-tenant bootstrap.

CREATE OR REPLACE FUNCTION public.create_gym_with_owner(
  p_name text,
  p_slug text,
  p_primary_color text,
  p_logo_letter text
)
RETURNS public.gyms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_user_id uuid;
  v_email text;
  v_gym public.gyms;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.gyms (name, slug, primary_color, logo_letter)
  VALUES (p_name, p_slug, p_primary_color, p_logo_letter)
  RETURNING * INTO v_gym;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  INSERT INTO public.gym_users (user_id, gym_id, role, email)
  VALUES (v_user_id, v_gym.id, 'admin', v_email);

  RETURN v_gym;
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_gym_with_owner(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_gym_with_owner(text, text, text, text) TO authenticated;
