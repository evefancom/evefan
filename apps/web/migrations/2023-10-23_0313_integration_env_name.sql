ALTER TABLE integration ADD COLUMN env_name varchar
  GENERATED ALWAYS AS (config ->> 'envName') STORED;

GRANT SELECT(env_name, display_name) ON TABLE public.integration TO end_user;
