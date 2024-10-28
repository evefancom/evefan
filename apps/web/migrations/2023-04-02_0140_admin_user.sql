create or replace procedure auth.set_user_admin (user_email text, admin boolean)
    language plpgsql
    as $$
declare
    auth_user record;
begin
	UPDATE
		auth.users
	SET
		raw_app_meta_data = raw_app_meta_data || jsonb_build_object('isAdmin', admin)
	WHERE
		email = user_email;
end
$$;


-- Performance is really bad as an admin user using RLS due to auth.is_admin() check being
-- enforced on every row rather than being treated as a constant...We don't want to
-- use IMMUTABLE function because of the dependency on current_setting, which is not immutable
-- even though empirically it works because this is security we are gonna be more cautious.
-- Will see if the supabase team has any ideas...
-- @see https://usevenice.slack.com/archives/C04NUANB7FW/p1680462683033239
CREATE OR REPLACE FUNCTION auth.is_admin()
    RETURNS boolean
    LANGUAGE sql
    STABLE
AS $function$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb #> '{app_metadata,isAdmin}' = 'true'::jsonb
$function$;

CREATE POLICY "admin_access" ON "public"."raw_commodity" USING (auth.is_admin());
CREATE POLICY "admin_access" ON "public"."raw_transaction" USING (auth.is_admin());
CREATE POLICY "admin_access" ON "public"."raw_account" USING (auth.is_admin());
CREATE POLICY "admin_access" ON "public"."institution" USING (auth.is_admin());

CREATE POLICY "admin_access" ON "public"."integration" USING (auth.is_admin());
CREATE POLICY "admin_access" ON "public"."resource" USING (auth.is_admin());
CREATE POLICY "admin_access" ON "public"."pipeline" USING (auth.is_admin());

CREATE POLICY "admin_access" ON "public"."_migrations" USING (auth.is_admin());

DO $$
BEGIN
  IF (SELECT to_regclass('auth.users') IS NOT null)
  THEN
    DROP INDEX IF EXISTS auth.users_api_key;
    CREATE INDEX IF NOT EXISTS users_api_key
    ON "auth"."users" ((raw_app_meta_data ->> 'apiKey'));
  END IF;
END $$
