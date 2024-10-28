
-- Unrelated

ALTER TABLE resource DROP CONSTRAINT fk_institution_id;
ALTER TABLE resource
  ADD CONSTRAINT "fk_institution_id" FOREIGN KEY ("institution_id")
    REFERENCES "public"."institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop constraints rename and re-add constraints

ALTER TABLE resource DROP CONSTRAINT fk_integration_id;
ALTER TABLE integration DROP CONSTRAINT integration_id_prefix_check;

ALTER TABLE integration RENAME TO connector_config;
ALTER TABLE resource RENAME COLUMN integration_id TO connector_config_id;

ALTER TABLE resource
  ADD CONSTRAINT "fk_connector_config_id" FOREIGN KEY ("connector_config_id")
  REFERENCES "public"."connector_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE connector_config set id = REPLACE(id, 'int_', 'ccfg_');
ALTER TABLE connector_config
  ALTER COLUMN id SET DEFAULT concat('ccfg_', public.generate_ulid()),
  ADD CONSTRAINT connector_config_id_prefix_check CHECK (starts_with(id, 'ccfg_'));
