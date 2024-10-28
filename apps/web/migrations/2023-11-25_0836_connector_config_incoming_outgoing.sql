ALTER TABLE connector_config DROP CONSTRAINT "fk_default_source_id";
ALTER TABLE connector_config DROP CONSTRAINT "fk_default_destination_id";
ALTER TABLE connector_config DROP COLUMN default_source_id;
ALTER TABLE connector_config DROP COLUMN default_destination_id;

ALTER TABLE connector_config ADD COLUMN default_pipe_out jsonb;
ALTER TABLE connector_config ADD COLUMN default_pipe_in jsonb;

ALTER TABLE connector_config ADD COLUMN default_pipe_out_destination_id varchar
  GENERATED ALWAYS AS (default_pipe_out ->> 'destination_id') STORED;
ALTER TABLE connector_config
  ADD CONSTRAINT "fk_default_pipe_out_destination_id" FOREIGN KEY ("default_pipe_out_destination_id")
  REFERENCES "public"."resource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE connector_config ADD COLUMN default_pipe_in_source_id varchar
  GENERATED ALWAYS AS (default_pipe_in ->> 'source_id') STORED;
ALTER TABLE connector_config
  ADD CONSTRAINT "fk_default_pipe_in_source_id" FOREIGN KEY ("default_pipe_in_source_id")
  REFERENCES "public"."resource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
