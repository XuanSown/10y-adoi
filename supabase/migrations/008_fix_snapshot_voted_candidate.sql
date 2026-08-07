CREATE OR REPLACE FUNCTION get_snapshot(p_voter_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event jsonb;
  v_candidates jsonb;
  v_voter jsonb;
  v_voted_candidate_id uuid;
BEGIN
  SELECT jsonb_build_object(
    'id', id, 'name', name, 'status', status,
    'open_at', open_at, 'end_at', end_at, 'version', version
  ) INTO v_event
  FROM events ORDER BY created_at DESC LIMIT 1;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id, 'name', name, 'image_path', image_path,
      'display_order', display_order, 'vote_count', vote_count
    ) ORDER BY display_order
  ) INTO v_candidates
  FROM candidates;

  IF p_voter_id IS NOT NULL THEN
    SELECT candidate_id INTO v_voted_candidate_id FROM votes WHERE voter_id = p_voter_id LIMIT 1;

    SELECT jsonb_build_object(
      'id', id, 'display_name', display_name, 'has_voted', has_voted, 'voted_at', voted_at, 'voted_candidate_id', v_voted_candidate_id
    ) INTO v_voter
    FROM voters WHERE id = p_voter_id;
  END IF;

  RETURN jsonb_build_object(
    'event', COALESCE(v_event, '{}'::jsonb),
    'candidates', COALESCE(v_candidates, '[]'::jsonb),
    'voter', COALESCE(v_voter, '{}'::jsonb)
  );
END;
$$;
