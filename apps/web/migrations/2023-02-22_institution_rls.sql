
CREATE OR REPLACE FUNCTION auth.institution_ids()
 RETURNS character varying[]
 LANGUAGE sql
 STABLE
AS $function$
  select array(
    SELECT DISTINCT institution_id FROM "resource"
    WHERE creator_id = public._uid () AND institution_id IS NOT NULL
  )
$function$;

DROP POLICY IF EXISTS "public_readable" on "public"."institution";
DROP POLICY IF EXISTS "connection_creator_access" on "public"."institution";
CREATE POLICY "connection_creator_access" ON "public"."institution"
  USING ("id" = ANY(auth.institution_ids()))
  WITH CHECK ("id" = ANY(auth.institution_ids()));
