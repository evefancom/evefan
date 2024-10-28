ALTER TABLE connector_config ADD COLUMN default_destination_id varchar
  GENERATED ALWAYS AS (config ->> 'default_destination_id') STORED;
ALTER TABLE connector_config
  ADD CONSTRAINT "fk_default_destination_id" FOREIGN KEY ("default_destination_id")
  REFERENCES "public"."resource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE connector_config ADD COLUMN default_source_id varchar
  GENERATED ALWAYS AS (config ->> 'default_source_id') STORED;
ALTER TABLE connector_config
  ADD CONSTRAINT "fk_default_source_id" FOREIGN KEY ("default_source_id")
  REFERENCES "public"."resource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
