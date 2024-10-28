-- Introduce the concept of end-user and remove the concept of ledger.
-- Pipelines should also have the concept of end-user-id for situations where
-- end user does not own either resource (e.g. postgres -> heron data)

/*
Checklist:
- [x] Rename creator_id to end_user_id on creator
  - [x] Update RLS policy names while we are at it
- [x] Stop using ledger_resource_id and use end_user_id in code
  - [x] Get rid of connectWith
- [x] Regenerate types
*/


ALTER TABLE "public"."resource" RENAME COLUMN "creator_id" TO "end_user_id";
ALTER POLICY creator_access ON public.resource RENAME TO end_user_access;
ALTER POLICY resource_creator_access ON public.pipeline RENAME TO end_user_access;
ALTER POLICY connection_creator_access ON public.institution RENAME TO end_user_access;

-- Gotta introduce end user id because
-- 1) resources metadata are not always stored in the same db as the data
-- 2) It's possible that the end user does not own the resource but still should have access to some of the data
--   2.1) Consider postgres -> heron data pipeline with an endUserId specified
ALTER TABLE "public"."raw_transaction" ADD COLUMN "end_user_id" varchar;
ALTER TABLE "public"."raw_account" ADD COLUMN "end_user_id" varchar;
ALTER TABLE "public"."raw_commodity" ADD COLUMN "end_user_id" varchar;

UPDATE "public"."raw_transaction" SET end_user_id = REPLACE(ledger_resource_id, 'reso_postgres_', '');
UPDATE "public"."raw_account" SET end_user_id = REPLACE(ledger_resource_id, 'reso_postgres_', '');
UPDATE "public"."raw_commodity" SET end_user_id = REPLACE(ledger_resource_id, 'reso_postgres_', '');

DROP POLICY IF EXISTS ledger_resource_creator_access on public.raw_transaction;
CREATE POLICY end_user_access ON public.raw_transaction
  USING (end_user_id = auth.uid())
  WITH CHECK (end_user_id = auth.uid());

DROP POLICY IF EXISTS ledger_resource_creator_access on public.raw_account;
CREATE POLICY end_user_access ON public.raw_account
  USING (end_user_id = auth.uid())
  WITH CHECK (end_user_id = auth.uid());

DROP POLICY IF EXISTS ledger_resource_creator_access on public.raw_commodity;
CREATE POLICY end_user_access ON public.raw_commodity
  USING (end_user_id = auth.uid())
  WITH CHECK (end_user_id = auth.uid());

-- WARNING: Will need to rerun 2023-01-07_create-views.sql manually due to dependecy on ledger_resource_id
ALTER TABLE "public"."raw_transaction" DROP COLUMN "ledger_resource_id" CASCADE;
ALTER TABLE "public"."raw_account" DROP COLUMN "ledger_resource_id" CASCADE;
ALTER TABLE "public"."raw_commodity" DROP COLUMN "ledger_resource_id" CASCADE;

-- Update references which were previously missed

CREATE OR REPLACE FUNCTION auth.pre_request() RETURNS void AS $$
  select set_config(
    'request.jwt.claim.resource_ids'
    , COALESCE((select jsonb_agg(id)::text from "resource" where end_user_id = auth.uid()), '[]')
    , true
  );
  select set_config(
    'request.jwt.claim.sub'
    , (current_setting('request.jwt.claims', true))::jsonb->>'sub'
    , true
  );
$$ LANGUAGE sql;

CREATE or replace FUNCTION auth.resource_ids() RETURNS character varying[]
    LANGUAGE sql stable AS $$
  select
    case when nullif(current_setting('request.jwt.claim.resource_ids', true), '') is not null then
      ARRAY(select jsonb_array_elements_text(
        nullif(current_setting('request.jwt.claim.resource_ids', true), '')::jsonb
      ))
    else
      -- Fallback for when pre_request() hasn't been called yet for some reason, such as possibly
      -- in supabase/realtime
      ARRAY(select id from "resource" where end_user_id = auth.uid())
    end;
$$;

CREATE OR REPLACE FUNCTION auth.institution_ids() RETURNS character varying[]
    LANGUAGE sql STABLE
    AS $$
  select array(
    SELECT DISTINCT institution_id FROM "resource"
    WHERE end_user_id = auth.uid() AND institution_id IS NOT NULL
  )
$$;

ALTER INDEX resource_creator_id RENAME TO resource_end_user_id;


-- For debugging
-- SELECT tablename, policyname, qual, with_check FROM pg_policies WHERE schemaname = 'public' ;
