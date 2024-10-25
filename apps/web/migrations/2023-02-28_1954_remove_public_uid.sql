CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS varchar
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )
$function$;


CREATE OR REPLACE FUNCTION auth.resource_ids()
 RETURNS character varying[]
 LANGUAGE sql
 STABLE
AS $function$
  select array(select id from "resource" where creator_id = auth.uid())
$function$;

CREATE OR REPLACE FUNCTION auth.institution_ids()
 RETURNS character varying[]
 LANGUAGE sql
 STABLE
AS $function$
  select array(
    SELECT DISTINCT institution_id FROM "resource"
    WHERE creator_id = auth.uid() AND institution_id IS NOT NULL
  )
$function$;

-- This workaround is no longer needed now that user are not logging in directly anhmore.
DROP FUNCTION IF EXISTS public._uid();
