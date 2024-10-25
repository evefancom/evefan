
-- Supabase specific now --

-- How do we ensure connections are deleted with their corresponding users are deleted?

CREATE TABLE IF NOT EXISTS "public"."connection_user" (
  "connection_id" varchar NOT NULL,
  "user_id" varchar NOT NULL,
  -- "permission" -- To be added later
  CONSTRAINT "fk_connection_id" FOREIGN KEY ("connection_id")
    REFERENCES "public"."connection"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_user_id" FOREIGN KEY ("user_id")
    REFERENCES "auth"."users"("id") ON DELETE CASCADE,
)
