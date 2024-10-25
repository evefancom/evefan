/*
Checklist:
- [ ] Add a table of end users
- [ ] Scoping end user id to workspace id
*/

-- CREATE TABLE IF NOT EXISTS "public"."end_user" (
--   "id" character varying NOT NULL DEFAULT generate_ulid(),
--   "provider_name" character varying NOT NULL GENERATED ALWAYS AS (split_part(id, '_', 2)) STORED,
--   -- "standard" jsonb NOT NULL DEFAULT '{}', What should it be?
--   "config" jsonb NOT NULL DEFAULT '{}',
--   "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
--   "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
--   CONSTRAINT "pk_end_user" PRIMARY KEY ("id")
-- );
-- ALTER TABLE "public"."connection" ENABLE ROW LEVEL SECURITY;
-- CREATE INDEX IF NOT EXISTS integration_created_at ON integration (created_at);
-- CREATE INDEX IF NOT EXISTS integration_updated_at ON integration (updated_at);
-- CREATE INDEX IF NOT EXISTS integration_provider_name ON integration (provider_name);
