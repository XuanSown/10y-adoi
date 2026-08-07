-- Migration: Fix admin_reset_votes to satisfy Postgres safeupdate requirement
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
  UPDATE voters SET has_voted = false, voted_at = NULL WHERE id IS NOT NULL;
  UPDATE events SET status = 'draft', updated_at = now() WHERE id = v_event_id;

  INSERT INTO admin_audit_logs (action, metadata) VALUES ('reset_votes', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true);
END;
$$;
