ALTER TABLE resource DROP CONSTRAINT fk_institution_id;
ALTER TABLE institution DROP CONSTRAINT institution_id_prefix_check;

ALTER TABLE institution RENAME TO integration;
ALTER TABLE resource RENAME COLUMN institution_id TO integration_id;

ALTER TABLE resource
  ADD CONSTRAINT "fk_integration_id" FOREIGN KEY ("integration_id")
  REFERENCES "public"."integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE integration set id = CONCAT('int_', SUBSTRING(id, LENGTH('ins_') + 1));
ALTER TABLE integration
  ALTER COLUMN id SET DEFAULT concat('int_', public.generate_ulid()),
  ADD CONSTRAINT integration_id_prefix_check CHECK (starts_with(id, 'int_'));
