ALTER TABLE public.institution
  ALTER COLUMN id SET DEFAULT concat('ins_', public.generate_ulid()),
  ADD CONSTRAINT institution_id_prefix_check CHECK (starts_with(id, 'ins_'));
ALTER TABLE public.integration
  ALTER COLUMN id SET DEFAULT concat('int_', public.generate_ulid()),
  ADD CONSTRAINT integration_id_prefix_check CHECK (starts_with(id, 'int_'));
ALTER TABLE public.resource
  ALTER COLUMN id SET DEFAULT concat('reso', public.generate_ulid()),
  ADD CONSTRAINT resource_id_prefix_check CHECK (starts_with(id, 'reso'));
ALTER TABLE public.pipeline
  ALTER COLUMN id SET DEFAULT concat('pipe_', public.generate_ulid()),
  ADD CONSTRAINT pipeline_id_prefix_check CHECK (starts_with(id, 'pipe_'));
ALTER TABLE public.raw_transaction
  ALTER COLUMN id SET DEFAULT concat('txn_', public.generate_ulid()),
  ADD CONSTRAINT raw_transaction_id_prefix_check CHECK (starts_with(id, 'txn_'));
ALTER TABLE public.raw_account
  ALTER COLUMN id SET DEFAULT concat('acct_', public.generate_ulid()),
  ADD CONSTRAINT raw_account_id_prefix_check CHECK (starts_with(id, 'acct_'));
ALTER TABLE public.raw_commodity
  ALTER COLUMN id SET DEFAULT concat('comm_', public.generate_ulid()),
  ADD CONSTRAINT raw_commodity_id_prefix_check CHECK (starts_with(id, 'comm_'));

