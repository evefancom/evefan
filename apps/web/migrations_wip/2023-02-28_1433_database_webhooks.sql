-- create EXTENSION if not exists pg_net;
-- Need to first go to the supabase dashboard to enable database webhooks
-- before we can run the queries below
-- @see https://share.cleanshot.com/CXtK7n1s

-- This has to be run manually for now because the webhook urls cannot be parametrized during migrations :(

-- [x] Dev
CREATE OR REPLACE TRIGGER "on-users-write"
	AFTER INSERT OR UPDATE OR DELETE ON auth.users FOR ROW
	EXECUTE FUNCTION supabase_functions.http_request ('https://alka.ngrok.io/api/webhook/database', 'POST', '{"Content-type":"application/json"}', '{}', '1000');
CREATE OR REPLACE TRIGGER "on-resource-write"
	AFTER INSERT OR UPDATE OR DELETE ON public.resource FOR ROW
	EXECUTE FUNCTION supabase_functions.http_request ('https://alka.ngrok.io/api/webhook/database', 'POST', '{"Content-type":"application/json"}', '{}', '1000');


-- [x] Staging
CREATE OR REPLACE TRIGGER "on-users-write"
	AFTER INSERT OR UPDATE OR DELETE ON auth.users FOR ROW
	EXECUTE FUNCTION supabase_functions.http_request ('https://app-staging.venice.is/api/webhook/database', 'POST', '{"Content-type":"application/json"}', '{}', '1000');
CREATE OR REPLACE TRIGGER "on-resource-write"
	AFTER INSERT OR UPDATE OR DELETE ON public.resource FOR ROW
	EXECUTE FUNCTION supabase_functions.http_request ('https://app-staging.venice.is/api/webhook/database', 'POST', '{"Content-type":"application/json"}', '{}', '1000');

-- [x] Production
CREATE OR REPLACE TRIGGER "on-users-write"
	AFTER INSERT OR UPDATE OR DELETE ON auth.users FOR ROW
	EXECUTE FUNCTION supabase_functions.http_request ('https://app.venice.is/api/webhook/database', 'POST', '{"Content-type":"application/json"}', '{}', '1000');
CREATE OR REPLACE TRIGGER "on-resource-write"
	AFTER INSERT OR UPDATE OR DELETE ON public.resource FOR ROW
	EXECUTE FUNCTION supabase_functions.http_request ('https://app.venice.is/api/webhook/database', 'POST', '{"Content-type":"application/json"}', '{}', '1000');

