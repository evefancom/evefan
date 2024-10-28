-- @see https://github.com/supabase/pg_graphql/issues/167
comment on constraint fk_source_id
  on "pipeline"
  is E'@graphql({"foreign_name": "source", "local_name": "sourceOfPipelines"})';

comment on constraint fk_destination_id
  on "pipeline"
  is E'@graphql({"foreign_name": "destination", "local_name": "destinationOfPipelines"})';
