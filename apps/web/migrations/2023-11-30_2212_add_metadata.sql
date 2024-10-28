ALTER TABLE connector_config ADD COLUMN metadata jsonb;
ALTER TABLE resource ADD COLUMN metadata jsonb;
ALTER TABLE pipeline ADD COLUMN metadata jsonb;
