
DROP POLICY IF EXISTS end_user_access ON public.resource;
CREATE POLICY end_user_access ON public.resource
  USING ((
    with cached as MATERIALIZED(select auth.uid())
    select end_user_id = uid from cached
  ))
  WITH CHECK ((
    with cached as MATERIALIZED(select auth.uid())
    select end_user_id = uid from cached
  ));


DROP POLICY IF EXISTS end_user_access ON public.pipeline;
CREATE POLICY end_user_access ON "public"."pipeline"
  USING ((
    with cached as MATERIALIZED(
      select id as resource_id from resource where end_user_id = auth.uid()
    )
    -- Prevent user from seeing pipelines that don't have a source or destination that they have access to
    select array(select resource_id from cached) @> array[source_id, destination_id]
  ))
  WITH CHECK ((
    with cached as MATERIALIZED(
      select id as resource_id from resource where end_user_id = auth.uid()
    )
    -- Prevent user from creating/updating pipelines that don't have a source or destination that they have access to
    select array(select resource_id from cached) @> array[source_id, destination_id]
  ));

DROP POLICY IF EXISTS end_user_access ON public.institution;
CREATE POLICY public_readonly_access ON "public"."institution" FOR SELECT USING (true);

-- Getting rid of pre-request and extraneous functions

DO $$ BEGIN IF (SELECT to_regclass('auth.users') IS NOT null) THEN
  ALTER ROLE authenticator RESET pgrst.db_pre_request;
END IF; END $$;
NOTIFY pgrst, 'reload config';

DROP FUNCTION IF EXISTS auth.pre_request;
DROP FUNCTION IF EXISTS auth.resource_ids;
DROP FUNCTION IF EXISTS auth.institution_ids;

-- Won't need these for too long, but still

CREATE INDEX transaction_end_user_id ON raw_transaction (end_user_id);
CREATE INDEX account_end_user_id ON raw_account (end_user_id);
CREATE INDEX commodity_end_user_id ON raw_commodity (end_user_id);

DROP POLICY IF EXISTS end_user_access ON public.raw_transaction;
CREATE POLICY end_user_access ON public.raw_transaction
  USING ((
    with cached as MATERIALIZED(select auth.uid())
    select end_user_id = uid from cached
  ))
  WITH CHECK ((
    with cached as MATERIALIZED(select auth.uid())
    select end_user_id = uid from cached
  ));

DROP POLICY IF EXISTS end_user_access ON public.raw_account;
CREATE POLICY end_user_access ON public.raw_account
  USING ((
    with cached as MATERIALIZED(select auth.uid())
    select end_user_id = uid from cached
  ))
  WITH CHECK ((
    with cached as MATERIALIZED(select auth.uid())
    select end_user_id = uid from cached
  ));


DROP POLICY IF EXISTS end_user_access ON public.raw_commodity;
CREATE POLICY end_user_access ON public.raw_commodity
  USING ((
    with cached as MATERIALIZED(select auth.uid())
    select end_user_id = uid from cached
  ))
  WITH CHECK ((
    with cached as MATERIALIZED(select auth.uid())
    select end_user_id = uid from cached
  ));


