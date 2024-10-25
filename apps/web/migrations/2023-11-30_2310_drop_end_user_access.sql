DROP POLICY IF EXISTS end_user_access ON public.connector_config;
CREATE POLICY end_user_access ON public.connector_config TO end_user
  USING (org_id = jwt_org_id());

ALTER TABLE connector_config DROP COLUMN end_user_access;
