-- TODO: Create a view out of this

WITH runs AS (
        SELECT row_number() OVER (PARTITION BY sr.customer_id, sr.provider_name ORDER BY sr.started_at DESC) AS rn,
          ss.customer_id,
          ss.provider_name,
          sr.id AS run_id,
          sr.metrics,
          sr.status,
          sr.started_at,
          sr.duration,
          sr.error_type,
          sr.error_detail,
          sr.initial_state,
          sr.final_state
          FROM sync_state ss
            LEFT JOIN sync_run sr ON ss.customer_id = sr.customer_id::text AND ss.provider_name = sr.provider_name::text
      ), last_runs AS (
        SELECT runs.rn,
          runs.customer_id,
          runs.provider_name,
          runs.run_id,
          runs.metrics,
          runs.status,
          runs.started_at,
          runs.duration,
          runs.error_type,
          runs.error_detail,
          runs.initial_state,
          runs.final_state
          FROM runs
        WHERE runs.rn = 1
        ORDER BY runs.started_at DESC
      )
SELECT lr.rn,
  lr.customer_id,
  lr.provider_name,
  lr.run_id,
  lr.metrics,
  lr.status,
  lr.started_at,
  lr.duration,
  lr.error_type,
  lr.error_detail,
  lr.initial_state,
  lr.final_state
  FROM last_runs lr
    JOIN customer c ON lr.customer_id = c.id;