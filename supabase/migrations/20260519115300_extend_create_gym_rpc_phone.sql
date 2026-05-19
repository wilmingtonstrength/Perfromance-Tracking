-- Extend create_gym_with_owner to optionally accept a phone number for the owner.
CREATE OR REPLACE FUNCTION public.create_gym_with_owner(
  p_name text,
  p_slug text,
  p_primary_color text,
  p_logo_letter text,
  p_phone text DEFAULT NULL
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

  INSERT INTO public.gym_users (user_id, gym_id, role, email, phone)
  VALUES (v_user_id, v_gym.id, 'admin', v_email, NULLIF(TRIM(p_phone), ''));

  RETURN v_gym;
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_gym_with_owner(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_gym_with_owner(text, text, text, text, text) TO authenticated;
