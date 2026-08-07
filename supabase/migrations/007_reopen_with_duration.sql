-- Migration: Allow setting duration when reopening voting
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
