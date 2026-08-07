-- Get current event
CREATE OR REPLACE FUNCTION get_current_event()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'status', status,
    'open_at', open_at,
    'end_at', end_at,
    'version', version
  ) INTO v_event
  FROM events
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_event, '{}'::jsonb);
END;
$$;

-- Start voting (with optional countdown)
CREATE OR REPLACE FUNCTION admin_start_voting(
  p_duration_minutes integer DEFAULT NULL,
  p_end_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_open_at timestamptz;
  v_end timestamptz;
BEGIN
  SELECT id INTO v_event_id FROM events ORDER BY created_at DESC LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INTERNAL_ERROR', 'message', 'Không có sự kiện');
  END IF;

  v_open_at := now();

  IF p_end_at IS NOT NULL THEN
    v_end := p_end_at;
  ELSIF p_duration_minutes IS NOT NULL THEN
    v_end := v_open_at + (p_duration_minutes || ' minutes')::interval;
  ELSE
    v_end := NULL;
  END IF;

  UPDATE events
  SET status = 'voting', open_at = v_open_at, end_at = v_end, updated_at = now()
  WHERE id = v_event_id;

  INSERT INTO admin_audit_logs (action, metadata)
  VALUES ('start_voting', jsonb_build_object('open_at', v_open_at, 'end_at', v_end));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Lock voting
CREATE OR REPLACE FUNCTION admin_lock_voting()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT id INTO v_event_id FROM events ORDER BY created_at DESC LIMIT 1;

  UPDATE events SET status = 'locked', updated_at = now() WHERE id = v_event_id;

  INSERT INTO admin_audit_logs (action, metadata) VALUES ('lock_voting', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Reopen voting
CREATE OR REPLACE FUNCTION admin_reopen_voting(
  p_duration_minutes integer DEFAULT NULL,
  p_end_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_open_at timestamptz;
  v_end timestamptz;
BEGIN
  SELECT id INTO v_event_id FROM events ORDER BY created_at DESC LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INTERNAL_ERROR', 'message', 'Không có sự kiện');
  END IF;

  v_open_at := now();

  IF p_end_at IS NOT NULL THEN
    v_end := p_end_at;
  ELSIF p_duration_minutes IS NOT NULL AND p_duration_minutes > 0 THEN
    v_end := v_open_at + (p_duration_minutes || ' minutes')::interval;
  ELSE
    v_end := NULL;
  END IF;

  UPDATE events
  SET status = 'voting', open_at = v_open_at, end_at = v_end, updated_at = now()
  WHERE id = v_event_id;

  INSERT INTO admin_audit_logs (action, metadata)
  VALUES ('reopen_voting', jsonb_build_object('open_at', v_open_at, 'end_at', v_end));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Reveal result
CREATE OR REPLACE FUNCTION admin_reveal_result()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT id INTO v_event_id FROM events ORDER BY created_at DESC LIMIT 1;

  UPDATE events SET status = 'result', updated_at = now() WHERE id = v_event_id;

  INSERT INTO admin_audit_logs (action, metadata) VALUES ('reveal_result', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Reset votes only
CREATE OR REPLACE FUNCTION admin_reset_votes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT id INTO v_event_id FROM events ORDER BY created_at DESC LIMIT 1;

  DELETE FROM votes WHERE event_id = v_event_id;
  UPDATE candidates SET vote_count = 0 WHERE event_id = v_event_id;
  UPDATE voters SET has_voted = false, voted_at = NULL;
  UPDATE events SET status = 'draft', updated_at = now() WHERE id = v_event_id;

  INSERT INTO admin_audit_logs (action, metadata) VALUES ('reset_votes', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Reset entire event
CREATE OR REPLACE FUNCTION admin_reset_event()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT id INTO v_event_id FROM events ORDER BY created_at DESC LIMIT 1;

  DELETE FROM votes WHERE event_id = v_event_id;
  DELETE FROM candidates WHERE event_id = v_event_id;
  DELETE FROM voters WHERE event_id = v_event_id;
  DELETE FROM events WHERE id = v_event_id;

  INSERT INTO admin_audit_logs (action, metadata) VALUES ('reset_event', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Get snapshot
CREATE OR REPLACE FUNCTION get_snapshot(p_voter_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event jsonb;
  v_candidates jsonb;
  v_voter jsonb;
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
    SELECT jsonb_build_object(
      'id', id, 'display_name', display_name, 'has_voted', has_voted, 'voted_at', voted_at
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
