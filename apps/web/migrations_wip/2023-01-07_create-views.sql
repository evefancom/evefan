-- Courtesy of oli :)
-- https://usevenice.slack.com/archives/C04NUANB7FW/p1677385998317849?thread_ts=1677383064.384539&cid=C04NUANB7FW
drop domain if exists graphql_json;
create domain graphql_json as jsonb check (true);


comment on schema "public" is e'@graphql({
	"inflect_names": true
})';

DROP VIEW IF EXISTS transaction;
CREATE VIEW transaction WITH (security_invoker) AS SELECT
  end_user_id
	,id -- standard->>'_id' as id
  ,standard->>'date' as date
	,standard->> 'description' as description
	,standard->> 'payee' as payee
	,(standard#> '{postingsMap,main,amount,quantity}') :: double precision as amount_quantity
	,standard#>> '{postingsMap,main,amount,unit}' as amount_unit
	,standard#>> '{postingsMap,main,accountId}' as account_id
	,standard->> 'externalCategory' as external_category
	,standard->> 'notes'  as notes
	,(standard-> 'postingsMap')::graphql_json as splits -- keep type as jsonb rather than turn into string
	,external :: graphql_json
	,provider_name
	,updated_at
	,created_at
FROM
	"raw_transaction";
comment on view "transaction" is e'TODO: Add description of transaction data type here...

@graphql({
	"primary_key_columns": ["id"],
	"totalCount": {"enabled": true},
	"description": "Double entry transaction",
	"foreign_keys": [
		{
      "local_name": "transactions",
      "local_columns": ["account_id"],
      "foreign_name": "account",
      "foreign_schema": "public",
      "foreign_table": "account",
      "foreign_columns": ["id"]
		}
	]
})';

DROP VIEW IF EXISTS account;
CREATE VIEW account WITH (security_invoker) AS SELECT
  end_user_id
	,id -- standard->>'_id' as id
	,standard->>'name' as name
	,standard->> 'type' as type
	,standard->> 'lastFour' as last_four
	,standard->> 'institutionName' as institution_name
	,standard->> 'defaultUnit' as default_unit
	,(standard#> '{informationalBalances,current,quantity}') :: double precision as current_balance
	,(standard#> '{informationalBalances,available,quantity}') :: double precision as available_balance
	,external :: graphql_json
	,provider_name
	,updated_at
	,created_at
FROM
	"raw_account";

comment on view "account" is e'TODO: Add description of account data type here...

@graphql({
	"primary_key_columns": ["id"],
	"totalCount": {"enabled": true},
	"foreign_keys": []
})';

DROP VIEW IF EXISTS transaction_split;
CREATE VIEW transaction_split WITH (security_invoker) AS SELECT
	end_user_id
	,id as transaction_id
	,s.key
	,(s.value #>'{amount,quantity}')  :: double precision as amount_quantity
	,s.value #>>'{amount,unit}' as amount_unit
	,s.value ->>'accountId' as account_id
	,s.value :: graphql_json as data
	,updated_at
	,created_at
FROM "raw_transaction",
	jsonb_each("raw_transaction".standard->'postingsMap') AS s;


-- CREATE OR REPLACE FUNCTION jsonb_array_to_text_array(_js jsonb)
--   RETURNS text[]
--   LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
-- 'SELECT ARRAY(SELECT jsonb_array_elements_text(_js))';


-- ALTER TABLE "transaction"
-- 	ADD COLUMN "account_ids" text [] NOT NULL GENERATED ALWAYS AS (
-- jsonb_array_to_text_array (jsonb_path_query_array (standard, '$.postingsMap.*.accountId'))) STORED;


-- SELECT
-- 	id,
-- 	ARRAY (
-- 		SELECT DISTINCT kv.value ->> 'accountId'
-- 		FROM
-- 			jsonb_each(standard -> 'postingsMap') AS kv) as account_ids
-- 	FROM
-- 		"transaction";
