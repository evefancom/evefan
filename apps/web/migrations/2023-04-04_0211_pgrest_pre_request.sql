-- Workaround for multiple RLS policies being slow when applied together.
-- TODO: Check if this approach works with supabase/realtime
-- @see https://usevenice.slack.com/archives/C04NUANB7FW/p1680566799056489?thread_ts=1680462683.033239&cid=C04NUANB7FW
CREATE OR REPLACE FUNCTION auth.pre_request() RETURNS void AS $$
  select set_config(
    'request.jwt.claim.resource_ids'
    , COALESCE((select jsonb_agg(id)::text from "resource" where creator_id = auth.uid()), '[]')
    , true
  );
  select set_config(
    'request.jwt.claim.sub'
    , (current_setting('request.jwt.claims', true))::jsonb->>'sub'
    , true
  );
$$ LANGUAGE sql;

DO $$ BEGIN IF (SELECT to_regclass('auth.users') IS NOT null) THEN
  ALTER ROLE authenticator set pgrst.db_pre_request = 'auth.pre_request';
END IF; END $$;

NOTIFY pgrst, 'reload config';

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
      ARRAY(select id from "resource" where creator_id = auth.uid())
    end;
$$;
