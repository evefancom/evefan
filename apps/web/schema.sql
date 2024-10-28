--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1
-- Dumped by pg_dump version 15.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '@graphql({
	"inflect_names": true
})';


--
-- Name: graphql_json; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.graphql_json AS jsonb
	CONSTRAINT graphql_json_check CHECK (true);


--
-- Name: format_relative_date(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.format_relative_date(date timestamp with time zone) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
	time_difference INTERVAL;
BEGIN
	time_difference := now() - date;
	IF time_difference < INTERVAL '1 minute' THEN
		RETURN EXTRACT(SECOND FROM time_difference)::INTEGER || ' seconds ago';
	ELSIF time_difference < INTERVAL '1 hour' THEN
		RETURN EXTRACT(MINUTE FROM time_difference)::INTEGER || ' minutes ago';
	ELSIF time_difference < INTERVAL '1 day' THEN
		RETURN EXTRACT(HOUR FROM time_difference)::INTEGER || ' hours ago';
	ELSE
		RETURN EXTRACT(DAY FROM time_difference)::INTEGER || ' days ago';
	END IF;
END;
$$;


--
-- Name: generate_ulid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_ulid() RETURNS text
    LANGUAGE plpgsql
    AS $$ DECLARE encoding BYTEA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; timestamp BYTEA = E'\\000\\000\\000\\000\\000\\000'; output TEXT = ''; unix_time BIGINT; ulid BYTEA; BEGIN unix_time = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT; timestamp = SET_BYTE(timestamp, 0, (unix_time >> 40)::BIT(8)::INTEGER); timestamp = SET_BYTE(timestamp, 1, (unix_time >> 32)::BIT(8)::INTEGER); timestamp = SET_BYTE(timestamp, 2, (unix_time >> 24)::BIT(8)::INTEGER); timestamp = SET_BYTE(timestamp, 3, (unix_time >> 16)::BIT(8)::INTEGER); timestamp = SET_BYTE(timestamp, 4, (unix_time >> 8)::BIT(8)::INTEGER); timestamp = SET_BYTE(timestamp, 5, unix_time::BIT(8)::INTEGER); ulid = timestamp || gen_random_bytes(10); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 0) & 224) >> 5)); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 0) & 31))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 1) & 248) >> 3)); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 1) & 7) << 2) | ((GET_BYTE(ulid, 2) & 192) >> 6))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 2) & 62) >> 1)); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 2) & 1) << 4) | ((GET_BYTE(ulid, 3) & 240) >> 4))); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 3) & 15) << 1) | ((GET_BYTE(ulid, 4) & 128) >> 7))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 4) & 124) >> 2)); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 4) & 3) << 3) | ((GET_BYTE(ulid, 5) & 224) >> 5))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 5) & 31))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 6) & 248) >> 3)); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 6) & 7) << 2) | ((GET_BYTE(ulid, 7) & 192) >> 6))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 7) & 62) >> 1)); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 7) & 1) << 4) | ((GET_BYTE(ulid, 8) & 240) >> 4))); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 8) & 15) << 1) | ((GET_BYTE(ulid, 9) & 128) >> 7))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 9) & 124) >> 2)); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 9) & 3) << 3) | ((GET_BYTE(ulid, 10) & 224) >> 5))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 10) & 31))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 11) & 248) >> 3)); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 11) & 7) << 2) | ((GET_BYTE(ulid, 12) & 192) >> 6))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 12) & 62) >> 1)); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 12) & 1) << 4) | ((GET_BYTE(ulid, 13) & 240) >> 4))); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 13) & 15) << 1) | ((GET_BYTE(ulid, 14) & 128) >> 7))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 14) & 124) >> 2)); output = output || CHR(GET_BYTE(encoding, ((GET_BYTE(ulid, 14) & 3) << 3) | ((GET_BYTE(ulid, 15) & 224) >> 5))); output = output || CHR(GET_BYTE(encoding, (GET_BYTE(ulid, 15) & 31))); RETURN output; END $$;


--
-- Name: jsonb_array_to_text_array(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jsonb_array_to_text_array(_js jsonb) RETURNS text[]
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $$SELECT ARRAY(SELECT jsonb_array_elements_text(_js))$$;


--
-- Name: jwt_end_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jwt_end_user_id() RETURNS character varying
    LANGUAGE sql STABLE
    AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.end_user_id', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'end_user_id')
  )
$$;


--
-- Name: jwt_org_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jwt_org_id() RETURNS character varying
    LANGUAGE sql STABLE
    AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.org_id', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'org_id')
  )
$$;


--
-- Name: jwt_sub(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jwt_sub() RETURNS character varying
    LANGUAGE sql STABLE
    AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._migrations (
    name text NOT NULL,
    hash text NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: raw_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_account (
    id character varying DEFAULT concat('acct_', public.generate_ulid()) NOT NULL,
    source_id character varying,
    standard jsonb DEFAULT '{}'::jsonb NOT NULL,
    external jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_name character varying GENERATED ALWAYS AS (split_part((id)::text, '_'::text, 2)) STORED NOT NULL,
    end_user_id character varying,
    CONSTRAINT raw_account_id_prefix_check CHECK (starts_with((id)::text, 'acct_'::text))
);


--
-- Name: account; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.account WITH (security_invoker='true') AS
 SELECT raw_account.end_user_id,
    raw_account.id,
    (raw_account.standard ->> 'name'::text) AS name,
    (raw_account.standard ->> 'type'::text) AS type,
    (raw_account.standard ->> 'lastFour'::text) AS last_four,
    (raw_account.standard ->> 'institutionName'::text) AS institution_name,
    (raw_account.standard ->> 'defaultUnit'::text) AS default_unit,
    ((raw_account.standard #> '{informationalBalances,current,quantity}'::text[]))::double precision AS current_balance,
    ((raw_account.standard #> '{informationalBalances,available,quantity}'::text[]))::double precision AS available_balance,
    (raw_account.external)::public.graphql_json AS external,
    raw_account.provider_name,
    raw_account.updated_at,
    raw_account.created_at
   FROM public.raw_account;


--
-- Name: institution; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution (
    id character varying DEFAULT concat('ins_', public.generate_ulid()) NOT NULL,
    standard jsonb DEFAULT '{}'::jsonb NOT NULL,
    external jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_name character varying GENERATED ALWAYS AS (split_part((id)::text, '_'::text, 2)) STORED NOT NULL,
    CONSTRAINT institution_id_prefix_check CHECK (starts_with((id)::text, 'ins_'::text))
);


--
-- Name: integration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration (
    id character varying DEFAULT concat('int_', public.generate_ulid()) NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_name character varying GENERATED ALWAYS AS (split_part((id)::text, '_'::text, 2)) STORED NOT NULL,
    org_id character varying NOT NULL,
    display_name character varying,
    end_user_access boolean,
    env_name character varying GENERATED ALWAYS AS ((config ->> 'envName'::text)) STORED,
    CONSTRAINT integration_id_prefix_check CHECK (starts_with((id)::text, 'int_'::text))
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    name text NOT NULL,
    hash text NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pipeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pipeline (
    id character varying DEFAULT concat('pipe_', public.generate_ulid()) NOT NULL,
    source_id character varying,
    source_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    destination_id character varying,
    destination_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    link_options jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sync_started_at timestamp with time zone,
    last_sync_completed_at timestamp with time zone,
    CONSTRAINT pipeline_id_prefix_check CHECK (starts_with((id)::text, 'pipe_'::text))
);


--
-- Name: raw_commodity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_commodity (
    id character varying DEFAULT concat('comm_', public.generate_ulid()) NOT NULL,
    source_id character varying,
    standard jsonb DEFAULT '{}'::jsonb NOT NULL,
    external jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_name character varying GENERATED ALWAYS AS (split_part((id)::text, '_'::text, 2)) STORED NOT NULL,
    end_user_id character varying,
    CONSTRAINT raw_commodity_id_prefix_check CHECK (starts_with((id)::text, 'comm_'::text))
);


--
-- Name: raw_transaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_transaction (
    id character varying DEFAULT concat('txn_', public.generate_ulid()) NOT NULL,
    source_id character varying,
    standard jsonb DEFAULT '{}'::jsonb NOT NULL,
    external jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_name character varying GENERATED ALWAYS AS (split_part((id)::text, '_'::text, 2)) STORED NOT NULL,
    end_user_id character varying,
    CONSTRAINT raw_transaction_id_prefix_check CHECK (starts_with((id)::text, 'txn_'::text))
);


--
-- Name: resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource (
    id character varying DEFAULT concat('reso', public.generate_ulid()) NOT NULL,
    end_user_id character varying,
    integration_id character varying,
    institution_id character varying,
    env_name character varying,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_name character varying GENERATED ALWAYS AS (split_part((id)::text, '_'::text, 2)) STORED NOT NULL,
    display_name character varying,
    CONSTRAINT resource_id_prefix_check CHECK (starts_with((id)::text, 'reso'::text))
);


--
-- Name: transaction; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.transaction WITH (security_invoker='true') AS
 SELECT raw_transaction.end_user_id,
    raw_transaction.id,
    (raw_transaction.standard ->> 'date'::text) AS date,
    (raw_transaction.standard ->> 'description'::text) AS description,
    (raw_transaction.standard ->> 'payee'::text) AS payee,
    ((raw_transaction.standard #> '{postingsMap,main,amount,quantity}'::text[]))::double precision AS amount_quantity,
    (raw_transaction.standard #>> '{postingsMap,main,amount,unit}'::text[]) AS amount_unit,
    (raw_transaction.standard #>> '{postingsMap,main,accountId}'::text[]) AS account_id,
    (raw_transaction.standard ->> 'externalCategory'::text) AS external_category,
    (raw_transaction.standard ->> 'notes'::text) AS notes,
    ((raw_transaction.standard -> 'postingsMap'::text))::public.graphql_json AS splits,
    (raw_transaction.external)::public.graphql_json AS external,
    raw_transaction.provider_name,
    raw_transaction.updated_at,
    raw_transaction.created_at
   FROM public.raw_transaction;


--
-- Name: transaction_split; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.transaction_split WITH (security_invoker='true') AS
 SELECT raw_transaction.end_user_id,
    raw_transaction.id AS transaction_id,
    s.key,
    ((s.value #> '{amount,quantity}'::text[]))::double precision AS amount_quantity,
    (s.value #>> '{amount,unit}'::text[]) AS amount_unit,
    (s.value ->> 'accountId'::text) AS account_id,
    (s.value)::public.graphql_json AS data,
    raw_transaction.updated_at,
    raw_transaction.created_at
   FROM public.raw_transaction,
    LATERAL jsonb_each((raw_transaction.standard -> 'postingsMap'::text)) s(key, value);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (name);


--
-- Name: raw_account pk_account; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_account
    ADD CONSTRAINT pk_account PRIMARY KEY (id);


--
-- Name: raw_commodity pk_commodity; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_commodity
    ADD CONSTRAINT pk_commodity PRIMARY KEY (id);


--
-- Name: institution pk_institution; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution
    ADD CONSTRAINT pk_institution PRIMARY KEY (id);


--
-- Name: integration pk_integration; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration
    ADD CONSTRAINT pk_integration PRIMARY KEY (id);


--
-- Name: pipeline pk_pipeline; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline
    ADD CONSTRAINT pk_pipeline PRIMARY KEY (id);


--
-- Name: resource pk_resource; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource
    ADD CONSTRAINT pk_resource PRIMARY KEY (id);


--
-- Name: raw_transaction pk_transaction; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_transaction
    ADD CONSTRAINT pk_transaction PRIMARY KEY (id);


--
-- Name: account_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_created_at ON public.raw_account USING btree (created_at);


--
-- Name: account_end_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_end_user_id ON public.raw_account USING btree (end_user_id);


--
-- Name: account_provider_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_provider_name ON public.raw_account USING btree (provider_name);


--
-- Name: account_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_source_id ON public.raw_account USING btree (source_id);


--
-- Name: account_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_updated_at ON public.raw_account USING btree (updated_at);


--
-- Name: commodity_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commodity_created_at ON public.raw_commodity USING btree (created_at);


--
-- Name: commodity_end_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commodity_end_user_id ON public.raw_commodity USING btree (end_user_id);


--
-- Name: commodity_provider_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commodity_provider_name ON public.raw_commodity USING btree (provider_name);


--
-- Name: commodity_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commodity_source_id ON public.raw_commodity USING btree (source_id);


--
-- Name: commodity_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commodity_updated_at ON public.raw_commodity USING btree (updated_at);


--
-- Name: institution_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX institution_created_at ON public.institution USING btree (created_at);


--
-- Name: institution_provider_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX institution_provider_name ON public.institution USING btree (provider_name);


--
-- Name: institution_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX institution_updated_at ON public.institution USING btree (updated_at);


--
-- Name: integration_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_created_at ON public.integration USING btree (created_at);


--
-- Name: integration_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_org_id ON public.integration USING btree (org_id);


--
-- Name: integration_provider_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_provider_name ON public.integration USING btree (provider_name);


--
-- Name: integration_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_updated_at ON public.integration USING btree (updated_at);


--
-- Name: pipeline_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pipeline_created_at ON public.pipeline USING btree (created_at);


--
-- Name: pipeline_destination_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pipeline_destination_id ON public.pipeline USING btree (destination_id);


--
-- Name: pipeline_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pipeline_source_id ON public.pipeline USING btree (source_id);


--
-- Name: pipeline_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pipeline_updated_at ON public.pipeline USING btree (updated_at);


--
-- Name: resource_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resource_created_at ON public.resource USING btree (created_at);


--
-- Name: resource_end_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resource_end_user_id ON public.resource USING btree (end_user_id);


--
-- Name: resource_provider_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resource_provider_name ON public.resource USING btree (provider_name);


--
-- Name: resource_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resource_updated_at ON public.resource USING btree (updated_at);


--
-- Name: transaction_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transaction_created_at ON public.raw_transaction USING btree (created_at);


--
-- Name: transaction_end_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transaction_end_user_id ON public.raw_transaction USING btree (end_user_id);


--
-- Name: transaction_provider_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transaction_provider_name ON public.raw_transaction USING btree (provider_name);


--
-- Name: transaction_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transaction_source_id ON public.raw_transaction USING btree (source_id);


--
-- Name: transaction_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transaction_updated_at ON public.raw_transaction USING btree (updated_at);


--
-- Name: resource on-resource-write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "on-resource-write" AFTER INSERT OR DELETE OR UPDATE ON public.resource FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://alka.ngrok.io/api/webhook/database', 'POST', '{"Content-type":"application/json"}', '{}', '1000');


--
-- Name: pipeline fk_destination_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline
    ADD CONSTRAINT fk_destination_id FOREIGN KEY (destination_id) REFERENCES public.resource(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CONSTRAINT fk_destination_id ON pipeline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT fk_destination_id ON public.pipeline IS '@graphql({"foreign_name": "destination", "local_name": "destinationOfPipelines"})';


--
-- Name: resource fk_institution_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource
    ADD CONSTRAINT fk_institution_id FOREIGN KEY (institution_id) REFERENCES public.institution(id) ON DELETE RESTRICT;


--
-- Name: resource fk_integration_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource
    ADD CONSTRAINT fk_integration_id FOREIGN KEY (integration_id) REFERENCES public.integration(id) ON DELETE RESTRICT;


--
-- Name: pipeline fk_source_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline
    ADD CONSTRAINT fk_source_id FOREIGN KEY (source_id) REFERENCES public.resource(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CONSTRAINT fk_source_id ON pipeline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT fk_source_id ON public.pipeline IS '@graphql({"foreign_name": "source", "local_name": "sourceOfPipelines"})';


--
-- Name: integration end_user_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY end_user_access ON public.integration TO end_user USING ((((org_id)::text = (public.jwt_org_id())::text) AND (end_user_access = true)));


--
-- Name: pipeline end_user_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY end_user_access ON public.pipeline TO end_user USING (( SELECT (ARRAY( SELECT resource.id
           FROM public.resource
          WHERE (((resource.integration_id)::text IN ( SELECT integration.id
                   FROM public.integration
                  WHERE ((integration.org_id)::text = (public.jwt_org_id())::text))) AND ((resource.end_user_id)::text = (( SELECT public.jwt_end_user_id() AS jwt_end_user_id))::text))) && ARRAY[pipeline.source_id, pipeline.destination_id])));


--
-- Name: resource end_user_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY end_user_access ON public.resource TO end_user USING ((((integration_id)::text IN ( SELECT integration.id
   FROM public.integration
  WHERE ((integration.org_id)::text = (public.jwt_org_id())::text))) AND ((end_user_id)::text = (( SELECT public.jwt_end_user_id() AS jwt_end_user_id))::text)));


--
-- Name: institution; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.institution ENABLE ROW LEVEL SECURITY;

--
-- Name: integration; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: integration org_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_access ON public.integration TO org USING (((org_id)::text = (public.jwt_org_id())::text)) WITH CHECK (((org_id)::text = (public.jwt_org_id())::text));


--
-- Name: pipeline org_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_access ON public.pipeline TO org USING (( SELECT (ARRAY( SELECT r.id
           FROM (public.resource r
             JOIN public.integration i ON (((r.integration_id)::text = (i.id)::text)))
          WHERE ((i.org_id)::text = (public.jwt_org_id())::text)) && ARRAY[pipeline.source_id, pipeline.destination_id]))) WITH CHECK (( SELECT (ARRAY( SELECT r.id
           FROM (public.resource r
             JOIN public.integration i ON (((r.integration_id)::text = (i.id)::text)))
          WHERE ((i.org_id)::text = (public.jwt_org_id())::text)) @> ARRAY[pipeline.source_id, pipeline.destination_id])));


--
-- Name: resource org_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_access ON public.resource TO org USING (((integration_id)::text IN ( SELECT integration.id
   FROM public.integration
  WHERE ((integration.org_id)::text = (public.jwt_org_id())::text)))) WITH CHECK (((integration_id)::text IN ( SELECT integration.id
   FROM public.integration
  WHERE ((integration.org_id)::text = (public.jwt_org_id())::text))));


--
-- Name: integration org_member_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_member_access ON public.integration TO authenticated USING (((org_id)::text = (public.jwt_org_id())::text)) WITH CHECK (((org_id)::text = (public.jwt_org_id())::text));


--
-- Name: pipeline org_member_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_member_access ON public.pipeline TO authenticated USING ((ARRAY( SELECT r.id
   FROM (public.resource r
     JOIN public.integration i ON (((i.id)::text = (r.integration_id)::text)))
  WHERE ((i.org_id)::text = (public.jwt_org_id())::text)) && ARRAY[source_id, destination_id])) WITH CHECK ((ARRAY( SELECT r.id
   FROM (public.resource r
     JOIN public.integration i ON (((i.id)::text = (r.integration_id)::text)))
  WHERE ((i.org_id)::text = (public.jwt_org_id())::text)) @> ARRAY[source_id, destination_id]));


--
-- Name: resource org_member_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_member_access ON public.resource TO authenticated USING (((integration_id)::text IN ( SELECT integration.id
   FROM public.integration
  WHERE ((integration.org_id)::text = (public.jwt_org_id())::text)))) WITH CHECK (((integration_id)::text IN ( SELECT integration.id
   FROM public.integration
  WHERE ((integration.org_id)::text = (public.jwt_org_id())::text))));


--
-- Name: institution org_write_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_write_access ON public.institution USING (true) WITH CHECK (true);


--
-- Name: pipeline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;

--
-- Name: institution public_readonly_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_readonly_access ON public.institution FOR SELECT USING (true);


--
-- Name: raw_account; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.raw_account ENABLE ROW LEVEL SECURITY;

--
-- Name: raw_commodity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.raw_commodity ENABLE ROW LEVEL SECURITY;

--
-- Name: raw_transaction; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.raw_transaction ENABLE ROW LEVEL SECURITY;

--
-- Name: resource; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resource ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO tonyx;
GRANT USAGE ON SCHEMA public TO end_user;
GRANT USAGE ON SCHEMA public TO org;


--
-- Name: FUNCTION format_relative_date(date timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.format_relative_date(date timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.format_relative_date(date timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.format_relative_date(date timestamp with time zone) TO service_role;


--
-- Name: FUNCTION generate_ulid(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_ulid() TO anon;
GRANT ALL ON FUNCTION public.generate_ulid() TO authenticated;
GRANT ALL ON FUNCTION public.generate_ulid() TO service_role;


--
-- Name: FUNCTION jsonb_array_to_text_array(_js jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jsonb_array_to_text_array(_js jsonb) TO anon;
GRANT ALL ON FUNCTION public.jsonb_array_to_text_array(_js jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.jsonb_array_to_text_array(_js jsonb) TO service_role;


--
-- Name: FUNCTION jwt_end_user_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jwt_end_user_id() TO anon;
GRANT ALL ON FUNCTION public.jwt_end_user_id() TO authenticated;
GRANT ALL ON FUNCTION public.jwt_end_user_id() TO service_role;


--
-- Name: FUNCTION jwt_org_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jwt_org_id() TO anon;
GRANT ALL ON FUNCTION public.jwt_org_id() TO authenticated;
GRANT ALL ON FUNCTION public.jwt_org_id() TO service_role;


--
-- Name: FUNCTION jwt_sub(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.jwt_sub() TO anon;
GRANT ALL ON FUNCTION public.jwt_sub() TO authenticated;
GRANT ALL ON FUNCTION public.jwt_sub() TO service_role;


--
-- Name: TABLE _migrations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public._migrations TO anon;
GRANT ALL ON TABLE public._migrations TO authenticated;
GRANT ALL ON TABLE public._migrations TO service_role;


--
-- Name: TABLE raw_account; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.raw_account TO anon;
GRANT ALL ON TABLE public.raw_account TO authenticated;
GRANT ALL ON TABLE public.raw_account TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.raw_account TO tonyx;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.raw_account TO org;


--
-- Name: TABLE account; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.account TO anon;
GRANT ALL ON TABLE public.account TO authenticated;
GRANT ALL ON TABLE public.account TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account TO org;


--
-- Name: TABLE institution; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.institution TO anon;
GRANT ALL ON TABLE public.institution TO authenticated;
GRANT ALL ON TABLE public.institution TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.institution TO tonyx;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.institution TO org;
GRANT SELECT ON TABLE public.institution TO end_user;


--
-- Name: TABLE integration; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.integration TO anon;
GRANT ALL ON TABLE public.integration TO authenticated;
GRANT ALL ON TABLE public.integration TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.integration TO tonyx;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.integration TO org;


--
-- Name: COLUMN integration.id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(id) ON TABLE public.integration TO end_user;


--
-- Name: COLUMN integration.org_id; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT(org_id) ON TABLE public.integration TO end_user;


--
-- Name: TABLE migrations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.migrations TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.migrations TO tonyx;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.migrations TO org;


--
-- Name: TABLE pipeline; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pipeline TO anon;
GRANT ALL ON TABLE public.pipeline TO authenticated;
GRANT ALL ON TABLE public.pipeline TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pipeline TO tonyx;
GRANT SELECT ON TABLE public.pipeline TO end_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pipeline TO org;


--
-- Name: TABLE raw_commodity; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.raw_commodity TO anon;
GRANT ALL ON TABLE public.raw_commodity TO authenticated;
GRANT ALL ON TABLE public.raw_commodity TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.raw_commodity TO tonyx;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.raw_commodity TO org;


--
-- Name: TABLE raw_transaction; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.raw_transaction TO anon;
GRANT ALL ON TABLE public.raw_transaction TO authenticated;
GRANT ALL ON TABLE public.raw_transaction TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.raw_transaction TO tonyx;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.raw_transaction TO org;


--
-- Name: TABLE resource; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.resource TO anon;
GRANT ALL ON TABLE public.resource TO authenticated;
GRANT ALL ON TABLE public.resource TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.resource TO tonyx;
GRANT SELECT,DELETE ON TABLE public.resource TO end_user;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.resource TO org;


--
-- Name: COLUMN resource.display_name; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(display_name) ON TABLE public.resource TO end_user;


--
-- Name: TABLE transaction; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transaction TO anon;
GRANT ALL ON TABLE public.transaction TO authenticated;
GRANT ALL ON TABLE public.transaction TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transaction TO org;


--
-- Name: TABLE transaction_split; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transaction_split TO anon;
GRANT ALL ON TABLE public.transaction_split TO authenticated;
GRANT ALL ON TABLE public.transaction_split TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transaction_split TO org;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- PostgreSQL database dump complete
--

