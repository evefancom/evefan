-- Delete existing database users

DO $$
DECLARE
	ele record;
BEGIN
	FOR ele IN
		SELECT
			usename
		FROM
			pg_user
		WHERE
			starts_with (usename, 'usr_')
	LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I', ele.usename);
    EXECUTE format('REVOKE USAGE ON SCHEMA public FROM %I', ele.usename);
    EXECUTE format('DROP USER %I', ele.usename);
	END LOOP;
END;
$$;

-- Remove the reference to CURRENT_USER in RLS functions by resetting the uid function

CREATE OR REPLACE FUNCTION public._uid()
 RETURNS varchar
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )
$function$;

-- Setup helper functions for testing policies moving forward
-- @see https://github.com/supabase/supabase/blob/master/apps/docs/pages/guides/auth/row-level-security.mdx#testing-policies

DO
$do$
BEGIN
-- Surround in a check so that this migration does not fail in a vanilla postgres instance
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'anon') THEN
      RAISE NOTICE 'Role "anon" does not exists. Skipping grant.';
   ELSE
      grant anon, authenticated to postgres;
   END IF;
END
$do$;


create or replace procedure auth.login_as_user (user_email text)
    language plpgsql
    as $$
declare
    auth_user record;
begin
    select
        * into auth_user
    from
        auth.users
    where
        email = user_email;
    execute format('set request.jwt.claim.sub=%L', auth_user.id::text);
    execute format('set request.jwt.claim.role=%I', auth_user.role);
    execute format('set request.jwt.claim.email=%L', auth_user.email);
    execute format('set request.jwt.claims=%L', json_strip_nulls(json_build_object('app_metadata', auth_user.raw_app_meta_data))::text);

    -- https://share.cleanshot.com/9Yrd6Zsg Not sure why we are getting this, temp workaround
    -- raise notice '%', format('set role %I; -- logging in as %L (%L)', auth_user.role, auth_user.id, auth_user.email);
    raise notice 'set role as user';

    execute format('set role %I', auth_user.role);
end
$$;

create or replace procedure auth.login_as_anon ()
    language plpgsql
    as $$
begin
    set request.jwt.claim.sub='';
    set request.jwt.claim.role='';
    set request.jwt.claim.email='';
    set request.jwt.claims='';
    set role anon;
end
$$;

create or replace procedure auth.logout ()
    language plpgsql
    as $$
begin
    set request.jwt.claim.sub='';
    set request.jwt.claim.role='';
    set request.jwt.claim.email='';
    set request.jwt.claims='';
    set role postgres;
end
$$;
