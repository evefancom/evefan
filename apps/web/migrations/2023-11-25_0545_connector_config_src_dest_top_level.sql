ALTER TABLE connector_config DROP CONSTRAINT "fk_default_source_id";
ALTER TABLE connector_config DROP CONSTRAINT "fk_default_destination_id";
ALTER TABLE connector_config DROP COLUMN default_source_id;
ALTER TABLE connector_config DROP COLUMN default_destination_id;

ALTER TABLE connector_config ADD COLUMN default_destination_id varchar;
ALTER TABLE connector_config
  ADD CONSTRAINT "fk_default_destination_id" FOREIGN KEY ("default_destination_id")
  REFERENCES "public"."resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE connector_config ADD COLUMN default_source_id varchar;
ALTER TABLE connector_config
  ADD CONSTRAINT "fk_default_source_id" FOREIGN KEY ("default_source_id")
  REFERENCES "public"."resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;


