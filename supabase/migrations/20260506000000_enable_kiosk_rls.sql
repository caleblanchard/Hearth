-- Enable RLS on kiosk tables that were flagged as missing RLS.
-- All access to these tables goes through server-side API routes using the
-- service role key, which bypasses RLS. No permissive policies are needed.
ALTER TABLE kiosk_activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_device_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_child_sessions ENABLE ROW LEVEL SECURITY;
