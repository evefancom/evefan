-- https://supabase.com/docs/guides/realtime/quickstart
-- https://supabase.com/docs/guides/auth/row-level-security#enable-realtime-for-database-tables

BEGIN;
  DROP publication IF EXISTS supabase_realtime;
  CREATE publication supabase_realtime;
  ALTER publication supabase_realtime ADD TABLE integration, resource, pipeline, institution;
COMMIT;

-- ALTER publication supabase_realtime DROP TABLE integration, resource, pipeline, institution;
