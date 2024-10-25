-- Unfortunately we cannot do this because of of 1) uuid <> varchar mismatch
-- 2) OSS where users are managed outside of supabase
-- ALTER TABLE "public"."connection" DROP COLUMN "ledger_id"; -- Not yet, but soon
-- ALTER TABLE "public"."connection" ADD COLUMN "creator_id" uuid; -- TODO: Make me not null
-- ALTER TABLE "public"."connection" ADD CONSTRAINT "fk_connection_creator_id"
--   FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."connection" RENAME COLUMN "ledger_id" to "creator_id";
CREATE INDEX IF NOT EXISTS connection_creator_id ON connection (creator_id);


-- TODO: Do things like easy mustache template for SQL exist? So we can avoid the duplication without needing to go into a full programming language?

-- Workaround for RLS issue where user can invoke `auth.connection_ids` but not
-- the referenced function inside with is `auth.uid`
-- Overall this seems safer than granting privileges on the auth schema which the postres user
-- does not have by default anyways...
CREATE OR REPLACE FUNCTION public._uid()
 RETURNS varchar
 LANGUAGE sql
 STABLE
AS $function$
  select
  	case when starts_with(current_user, 'usr_') then
  		substring(CURRENT_USER, 5) -- 1 indexed
  	else
      coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      )
	  end
$function$;

-- Given that we allow user to actually login to postgres with raw URL, we need to
-- prevent them from impersonating other users...
CREATE SCHEMA IF NOT EXISTS auth;
DROP FUNCTION IF EXISTS auth.uid CASCADE;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS varchar LANGUAGE sql STABLE
AS $function$
  select public._uid()
$function$;

CREATE OR REPLACE FUNCTION auth.connection_ids()
 RETURNS varchar[]
 LANGUAGE sql
 STABLE
AS $function$
  select array(select id from "connection" where creator_id = public._uid())
$function$;

ALTER TABLE "public"."connection" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "creator_access" on "public"."connection";
CREATE POLICY "creator_access" ON "public"."connection"
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());


CREATE INDEX IF NOT EXISTS pipeline_source_id ON "pipeline" (source_id);
CREATE INDEX IF NOT EXISTS pipeline_destination_id ON "pipeline" (destination_id);

ALTER TABLE "public"."pipeline" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "connection_creator_access" on "public"."pipeline";
CREATE POLICY "connection_creator_access" ON "public"."pipeline"
  USING ("source_id" = ANY(auth.connection_ids()) OR "destination_id" = ANY(auth.connection_ids()))
  WITH CHECK ("source_id" = ANY(auth.connection_ids()) OR "destination_id" = ANY(auth.connection_ids()));


-- Contains secrets that shouldn't be publicly available
ALTER TABLE "public"."integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."institution" ENABLE ROW LEVEL SECURITY;
-- Should this be allowed?
CREATE POLICY "public_readable" ON public.institution FOR SELECT USING (true);

-- Beware postgres does not automatically create indexes on foreign keys
-- https://stackoverflow.com/questions/970562/postgres-and-indexes-on-foreign-keys-and-primary-keys

--| Transaction |--

ALTER TABLE "public"."transaction" ADD COLUMN "ledger_connection_id" VARCHAR; -- How do we make this non-null?
ALTER TABLE "public"."transaction" ADD CONSTRAINT "fk_transaction_ledger_connection_id"
  FOREIGN KEY ("ledger_connection_id") REFERENCES "public"."connection"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS transaction_ledger_creator_id ON "transaction" (ledger_connection_id);

ALTER TABLE "public"."transaction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ledger_connection_creator_access" on "public"."transaction";
CREATE POLICY "ledger_connection_creator_access" ON "public"."transaction"
  USING (ledger_connection_id = ANY(auth.connection_ids()))
  WITH CHECK (ledger_connection_id = ANY(auth.connection_ids()));

--| Account |--

ALTER TABLE "public"."account" ADD COLUMN "ledger_connection_id" varchar;
ALTER TABLE "public"."account" ADD CONSTRAINT "fk_account_ledger_connection_id"
  FOREIGN KEY ("ledger_connection_id") REFERENCES "public"."connection"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS account_ledger_creator_id ON "account" (ledger_connection_id);

ALTER TABLE "public"."account" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ledger_connection_creator_access" on "public"."account";
CREATE POLICY "ledger_connection_creator_access" ON "public"."account"
  USING (ledger_connection_id = ANY(auth.connection_ids()))
  WITH CHECK (ledger_connection_id = ANY(auth.connection_ids()));

--| Commodity |--
ALTER TABLE "public"."commodity" ADD COLUMN "ledger_connection_id" varchar;
ALTER TABLE "public"."commodity" ADD CONSTRAINT "fk_commodity_ledger_connection_id"
  FOREIGN KEY ("ledger_connection_id") REFERENCES "public"."connection"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS commodity_ledger_creator_id ON "commodity" (ledger_connection_id);


ALTER TABLE "public"."commodity" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ledger_connection_creator_access" on "public"."commodity";
CREATE POLICY "ledger_connection_creator_access" ON "public"."commodity"
  USING (ledger_connection_id = ANY(auth.connection_ids()))
  WITH CHECK (ledger_connection_id = ANY(auth.connection_ids()));


