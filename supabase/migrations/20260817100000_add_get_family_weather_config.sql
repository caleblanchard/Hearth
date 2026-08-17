-- Add a narrow, security-definer weather config lookup.
-- Previously the weather API routes bypassed RLS with the service-role client
-- whenever the requester was unauthenticated (kiosk device) or a child role.
-- This function is the replacement: it exposes only the columns needed by the
-- weather widgets and only to callers who are members of the requested family.

CREATE OR REPLACE FUNCTION get_family_weather_config(p_family_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT is_member_of_family(p_family_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT f.id, f.name, f.location, f.latitude, f.longitude
  FROM families f
  WHERE f.id = p_family_id;
END;
$$;

-- anon + authenticated both need it: authenticated parents/children satisfy the
-- membership gate; unauthenticated (kiosk) callers get an empty result set.
GRANT EXECUTE ON FUNCTION get_family_weather_config(UUID) TO anon, authenticated;