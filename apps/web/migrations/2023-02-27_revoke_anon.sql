
-- TODO: Use the supabase image rather than postgres image for testing in ci
DO
$do$
BEGIN
-- Surround in a check so that this migration does not fail in a vanilla postgres instance
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'anon') THEN
      RAISE NOTICE 'Role "anon" does not exists. Skipping grant.';
   ELSE
      REVOKE ALL PRIVILEGES ON public._migrations from anon, authenticated;
   END IF;
END
$do$;

