DO $$
BEGIN
  IF (SELECT to_regclass('auth.users') IS NOT null)
  THEN
    CREATE INDEX IF NOT EXISTS users_api_key
    ON "auth"."users" ((raw_app_meta_data ->> 'apiKey'));
  END IF;
END $$
