--- Meta table updates

ALTER TABLE "public"."connection" RENAME TO "resource";
ALTER TABLE "public"."resource" RENAME CONSTRAINT pk_connection TO pk_resource;
ALTER INDEX connection_created_at RENAME TO resource_created_at;
ALTER INDEX connection_updated_at RENAME TO resource_updated_at;
ALTER INDEX connection_provider_name RENAME TO resource_provider_name;
ALTER INDEX connection_creator_id RENAME TO resource_creator_id;
ALTER POLICY connection_creator_access ON public.pipeline RENAME TO resource_creator_access;

ALTER TABLE "public"."pipeline" DROP CONSTRAINT fk_destination_id,
	ADD CONSTRAINT "fk_destination_id" FOREIGN KEY ("destination_id")
    REFERENCES "public"."resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."pipeline" DROP CONSTRAINT fk_source_id,
	ADD CONSTRAINT "fk_source_id" FOREIGN KEY ("source_id")
    REFERENCES "public"."resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

--- Data table update

ALTER TABLE "public"."raw_transaction" RENAME COLUMN "ledger_connection_id" TO "ledger_resource_id";
ALTER TABLE "public"."raw_account" RENAME COLUMN "ledger_connection_id" TO "ledger_resource_id";
ALTER TABLE "public"."raw_commodity" RENAME COLUMN "ledger_connection_id" TO "ledger_resource_id";


ALTER TABLE "public"."raw_account" DROP CONSTRAINT fk_account_ledger_connection_id,
	ADD CONSTRAINT "fk_account_ledger_connection_id" FOREIGN KEY ("ledger_resource_id")
    REFERENCES "public"."resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "public"."raw_transaction" DROP CONSTRAINT fk_transaction_ledger_connection_id,
	ADD CONSTRAINT "fk_transaction_ledger_connection_id" FOREIGN KEY ("ledger_resource_id")
    REFERENCES "public"."resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "public"."raw_commodity" DROP CONSTRAINT fk_commodity_ledger_connection_id,
	ADD CONSTRAINT "fk_commodity_ledger_connection_id" FOREIGN KEY ("ledger_resource_id")
    REFERENCES "public"."resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER POLICY ledger_connection_creator_access ON public.raw_transaction RENAME TO ledger_resource_creator_access;
ALTER POLICY ledger_connection_creator_access ON public.raw_account RENAME TO ledger_resource_creator_access;
ALTER POLICY ledger_connection_creator_access ON public.raw_commodity RENAME TO ledger_resource_creator_access;

--- RLS update

ALTER FUNCTION auth.connection_ids RENAME TO resource_ids;

CREATE OR REPLACE FUNCTION auth.resource_ids()
 RETURNS character varying[]
 LANGUAGE sql
 STABLE
AS $function$
  select array(select id from "resource" where creator_id = public._uid())
$function$;

-- Update existing data


-- select 'reso_' || SUBSTRING(id, 6) from resource where starts_with(id, 'conn_');
UPDATE resource set id = 'reso_' || SUBSTRING(id, 6) where starts_with(id, 'conn_');
UPDATE raw_account set source_id = 'reso_' || SUBSTRING(source_id, 6) where starts_with(source_id, 'conn_');
UPDATE raw_transaction set source_id = 'reso_' || SUBSTRING(source_id, 6) where starts_with(source_id, 'conn_');
UPDATE raw_commodity set source_id = 'reso_' || SUBSTRING(source_id, 6) where starts_with(source_id, 'conn_');
