CREATE TABLE IF NOT EXISTS "customer" (
	"id" text PRIMARY KEY DEFAULT substr(md5(random()::text), 0, 25) NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	"name" text,
	"email" text
);
--> statement-breakpoint
-- Should be ulid instead...
CREATE TABLE IF NOT EXISTS "sync_run" (
	"id" text PRIMARY KEY DEFAULT substr(md5(random()::text), 0, 25) NOT NULL,
	"created_at" timestamp(3) DEFAULT now(),
	"updated_at" timestamp(3) DEFAULT now(),
	"input_event" jsonb NOT NULL,
	"started_at" timestamp(3),
	"completed_at" timestamp(3),
	"initial_state" jsonb,
	"final_state" jsonb,
	"metrics" jsonb,
	"duration" interval GENERATED ALWAYS AS (completed_at - started_at) STORED,
	"status" varchar GENERATED ALWAYS AS
    (CASE WHEN error_type IS NOT NULL THEN error_type
          WHEN completed_at IS NOT NULL THEN 'SUCCESS'
          ELSE 'PENDING' END) STORED,
  "resource_id" varchar GENERATED ALWAYS AS (input_event#>>'{data,resource_id}') STORED,
	"error_detail" text,
	"error_type" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_state" (
	"resource_id" text PRIMARY KEY NOT NULL,
	"state" jsonb,
	"created_at" timestamp(3) DEFAULT now(),
	"updated_at" timestamp(3) DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resource_id" ON "sync_run" ("resource_id");
