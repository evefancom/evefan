-- For debugging --

SELECT
  *
FROM
  integration;

SELECT
  *
FROM
  integration
WHERE
  config -> 'secrets' -> 'sandbox' IS NOT NULL;

SELECT
--     i.id,
    concat('int_plaid_',generate_ulid()),
    i.org_id,
    i.display_name,
    i.end_user_access,
    (i.config - 'secrets') || jsonb_build_object ('clientSecret',
      s.value,
      'envName',
      s.key) AS newconfig
--     s.key,
--     s.value
  FROM
    integration i,
    LATERAL jsonb_each(i.config -> 'secrets'::text) s (KEY,
      value)
  WHERE
    i.provider_name = 'plaid' and s.key != 'sandbox';

-- For reals --

INSERT INTO integration (id, org_id, display_name, end_user_access, config)
SELECT
  concat('int_plaid_', generate_ulid ()),
  i.org_id,
  i.display_name,
  i.end_user_access,
  (i.config - 'secrets') || jsonb_build_object ('clientSecret',
    s.value,
    'envName',
    s.key)
FROM
  integration i,
  LATERAL jsonb_each(i.config -> 'secrets'::text) s (KEY,
    value)
WHERE
  i.provider_name = 'plaid' and s.key != 'sandbox';

UPDATE
  integration
SET
  config = (config - 'secrets') || jsonb_build_object ('clientSecret',
    config -> 'secrets' -> 'sandbox',
    'envName',
    'sandbox')
    where config->'secrets'->'sandbox' is not null;