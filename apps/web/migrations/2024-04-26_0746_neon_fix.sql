-- Get the logic working for neon which does not come with a lot of Supabase features

DO
$do$
BEGIN
-- Surround in a check so that this migration does not fail in a vanilla postgres instance
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'anon') THEN
      create role anon with PASSWORD 'thex0hDD123b1!';
      grant anon, authenticated to CURRENT_USER;

      GRANT USAGE ON SCHEMA public TO "authenticated";
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "authenticated";
   ELSE
      RAISE NOTICE 'Role "anon" exists. Skipping grant.';
   END IF;
END
$do$;

create or replace procedure auth.login_as (role_name text, sub text)
    language plpgsql
    as $$
declare
    auth_user record;
begin
    execute format('set request.jwt.claim.sub=%L', sub);
    execute format('set request.jwt.claim.role=%I', role_name);

    -- https://share.cleanshot.com/9Yrd6Zsg Not sure why we are getting this, temp workaround
    -- raise notice '%', format('set role %I; -- logging in as %L (%L)', auth_user.role, auth_user.id, auth_user.email);
    raise notice 'set role as %', role_name;

    execute format('set role %I', role_name);
end
$$;


create or replace procedure auth.login_as_user (sub text, org_id text)
    language plpgsql
    as $$
declare
    auth_user record;
begin
    call auth.login_as('authenticated', sub);
    execute format('set request.jwt.claim.org_id=%L', org_id);
end
$$;


create or replace procedure auth.login_as_end_user (sub text, org_id text)
    language plpgsql
    as $$
declare
    auth_user record;
begin
    call auth.login_as('end_user', sub);
    execute format('set request.jwt.claim.org_id=%L', org_id);
end
$$;


create or replace procedure auth.login_as_org (sub text)
    language plpgsql
    as $$
declare
    auth_user record;
begin
    call auth.login_as('org', sub);
end
$$;


