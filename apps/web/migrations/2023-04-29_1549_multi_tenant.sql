-- 2024-04-26_0646 The has of this migration file has changed though semantically should not have changed
-- Therefore will have to repair the hash of this migration

--- Clean up previous ---

DROP POLICY IF EXISTS admin_access ON raw_transaction;
DROP POLICY IF EXISTS admin_access ON raw_commodity;
DROP POLICY IF EXISTS admin_access ON raw_account;
DROP POLICY IF EXISTS admin_access ON institution;
DROP POLICY IF EXISTS admin_access ON integration;
DROP POLICY IF EXISTS admin_access ON resource;
DROP POLICY IF EXISTS admin_access ON pipeline;
DROP POLICY IF EXISTS admin_access ON _migrations;

DROP FUNCTION IF EXISTS auth.is_admin;
DROP PROCEDURE IF EXISTS auth.set_user_admin;


DROP TABLE IF EXISTS public.workspace CASCADE;
DROP TABLE IF EXISTS public.workspace_member CASCADE;
DROP FUNCTION IF EXISTS auth.workspace_ids CASCADE;
DROP FUNCTION IF EXISTS auth.user_workspace_ids CASCADE;

-- Not dropping the previous tables yet, but we will start iwht policies
DROP POLICY IF EXISTS end_user_access ON raw_account;
DROP POLICY IF EXISTS end_user_access ON raw_commodity;
DROP POLICY IF EXISTS end_user_access ON raw_transaction;

-- Introduce org_id finally --

ALTER TABLE "public"."integration" ADD COLUMN org_id varchar NOT NULL;
CREATE INDEX IF NOT EXISTS integration_org_id ON "public"."integration" (org_id);
ALTER TABLE "public"."integration" ADD COLUMN display_name varchar;
ALTER TABLE "public"."integration" ADD COLUMN end_user_access boolean;

--- New helper functions that no longer depend on auth

-- Even this is hardly used, can basically drop auth.uid as we don't use it

CREATE OR REPLACE FUNCTION jwt_sub() RETURNS varchar LANGUAGE sql STABLE
AS $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )
$function$;

CREATE OR REPLACE FUNCTION jwt_org_id() RETURNS varchar LANGUAGE sql STABLE
AS $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.org_id', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'org_id')
  )
$function$;

CREATE OR REPLACE FUNCTION jwt_end_user_id() RETURNS varchar LANGUAGE sql STABLE
AS $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.end_user_id', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'end_user_id')
  )
$function$;

--- User policies ---

DO
$do$
BEGIN
   IF EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'authenticated') THEN
      RAISE NOTICE 'Role "authenticated" already exists. Skipping.';
   ELSE
      -- We should probably stop depending on objects built into the supabase schema at some point
      -- For now we do this for the test environment
      CREATE ROLE "authenticated" WITH PASSWORD 'thex0hDD123b1!';
      CREATE ROLE "authenticator" WITH PASSWORD 'thex0hDD123b1!';
      GRANT "authenticated" TO CURRENT_USER; -- "postgres";
      GRANT "authenticated" TO "authenticator";
      GRANT USAGE ON SCHEMA public TO "authenticated";
   END IF;
END
$do$;

DROP POLICY IF EXISTS org_member_access ON public.integration;
CREATE POLICY org_member_access ON "public"."integration" TO authenticated
  USING (org_id = jwt_org_id())
  WITH CHECK (org_id = jwt_org_id());

DROP POLICY IF EXISTS org_member_access ON public.resource;
CREATE POLICY org_member_access ON "public"."resource" TO authenticated
  USING (integration_id = ANY(
    select id from integration where org_id = jwt_org_id()
  ))
  WITH CHECK (integration_id = ANY(
    select id from integration where org_id = jwt_org_id()
  ));

DROP POLICY IF EXISTS org_member_access ON public.pipeline;
CREATE POLICY org_member_access ON "public"."pipeline" TO authenticated
  USING (
    array(
      select r.id
      from resource r
      join integration i on i.id = r.integration_id
      where i.org_id = jwt_org_id()
    ) && array[source_id, destination_id]
    -- && and @> is the same, however we are using && to stay consistent with end user policy
  )
  WITH CHECK (
    array(
      select r.id
      from resource r
      join integration i on i.id = r.integration_id
      where i.org_id = jwt_org_id()
    ) @> array[source_id, destination_id]
    -- User must have access to both the source & destination resources
  );


--- End user policies ---

CREATE ROLE "end_user" with PASSWORD 'thex0hDD123b1!';-- Irrelevant pw work around neon, no login allowed
GRANT "end_user" TO CURRENT_USER; -- "postgres"
GRANT "end_user" TO "authenticator";
GRANT USAGE ON SCHEMA public TO "end_user";

GRANT SELECT ON public.institution TO "end_user";
GRANT SELECT (id, org_id) ON public.integration TO "end_user";
DROP POLICY IF EXISTS end_user_access ON public.integration;
CREATE POLICY end_user_access ON public.integration TO end_user
  USING (org_id = jwt_org_id() AND end_user_access = true);


GRANT SELECT, UPDATE (display_name), DELETE ON public.resource TO "end_user";
DROP POLICY IF EXISTS end_user_access ON public.resource;
CREATE POLICY end_user_access ON public.resource TO end_user
  USING (
    integration_id = ANY(
      select id from integration
      where org_id = jwt_org_id()
    )
    AND end_user_id = (select jwt_end_user_id())
  );

-- REVOKE DELETE ON public.pipeline FROM "end_user";
GRANT SELECT ON public.pipeline TO "end_user";
DROP POLICY IF EXISTS end_user_access ON public.pipeline;
CREATE POLICY end_user_access ON public.pipeline TO end_user
  USING ((
    select array(
      select id
      from resource
      where integration_id = ANY(
        select id from integration
        where org_id = jwt_org_id()
      )
        AND end_user_id = (select jwt_end_user_id())
    ) && array[source_id, destination_id]
  -- User can see any pipeline that they their resource is connected to for the moment
  ));

--- Organization policies ---

CREATE ROLE "org" WITH PASSWORD 'thex0hDD123b1!'; -- Irrelevant pw, no login allowed
GRANT "org" TO CURRENT_USER; --  "postgres";
GRANT "end_user" TO "authenticator";
GRANT USAGE ON SCHEMA public TO "org";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "org";

DROP POLICY IF EXISTS org_access ON public.integration;
CREATE POLICY org_access ON public.integration TO org
  USING (org_id = jwt_org_id())
  WITH CHECK (org_id = jwt_org_id());

DROP POLICY IF EXISTS org_access ON public.resource;
CREATE POLICY org_access ON public.resource TO org
  USING (integration_id = ANY(
      select id from integration
      where org_id = jwt_org_id()
  ))
  WITH CHECK (integration_id = ANY(
      select id from integration
      where org_id = jwt_org_id()
  ));

DROP POLICY IF EXISTS org_access ON public.pipeline;
CREATE POLICY org_access ON public.pipeline TO org
  USING ((
    select array(
      select r.id
      from resource r
      join integration i on r.integration_id = i.id
      where i.org_id = jwt_org_id()
    ) && array[source_id, destination_id]
    -- && and @> is the same, however we are using && to stay consistent with end user policy
  ))
  WITH CHECK ((
    select array(
      select r.id
      from resource r
      join integration i on r.integration_id = i.id
      where i.org_id = jwt_org_id()
    ) @> array[source_id, destination_id]
    -- Pipeline must be fully within the org
  ));

-- FiXME: Revoke write access to institution once we figure out a better way...
-- It's not YET an issue because we are not issuing any org-role tokens at the moment
GRANT INSERT, UPDATE ON public.institution TO "org";
DROP POLICY IF EXISTS org_write_access ON public.institution;
CREATE POLICY org_write_access ON "public"."institution" FOR ALL
  USING (true) WITH CHECK (true);

-- @see https://www.postgresql.org/docs/current/sql-createpolicy.html for docs

--- Migrating previous DATA

--  ALTER TABLE "public"."resource" ALTER COLUMN integration_id SET NOT NULL;
--  ALTER TABLE "public"."pipeline" ALTER COLUMN source_id SET NOT NULL;
--  ALTER TABLE "public"."pipeline" ALTER COLUMN destination_id SET NOT NULL;



