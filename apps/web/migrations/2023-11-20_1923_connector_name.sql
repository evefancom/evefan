ALTER TABLE institution RENAME COLUMN provider_name TO connector_name;
ALTER TABLE integration RENAME COLUMN provider_name TO connector_name;
ALTER TABLE resource RENAME COLUMN provider_name TO connector_name;
