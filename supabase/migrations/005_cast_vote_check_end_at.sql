-- Add end_at check to cast_vote to prevent voting after time expires
-- This provides server-side protection even if the status hasn't been updated yet

CREATE OR REPLACE FUNCTION cast_vote(
  p_voter_id uuid,
  p_candidate_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_event_status text;
  v_end_at timestamptz;
  v_has_voted boolean;
  v_result jsonb;
BEGIN
  -- Lock and check event
  SELECT id, status, end_at INTO v_event_id, v_event_status, v_end_at
  FROM events
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_event_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'VOTING_NOT_OPEN', 'message', 'Không có sự kiện đang hoạt động');
  END IF;

  IF v_event_status NOT IN ('voting', 'countdown') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'VOTING_CLOSED', 'message', 'Đang trong thời gian bình chọn');
  END IF;

  -- Check if voting time has expired (server-side enforcement)
  IF v_end_at IS NOT NULL AND now() >= v_end_at THEN
    -- Auto-lock the event
    UPDATE events SET status = 'locked', updated_at = now() WHERE id = v_event_id;
    INSERT INTO admin_audit_logs (action, metadata)
    VALUES ('auto_lock_expired', jsonb_build_object('end_at', v_end_at));
    RETURN jsonb_build_object('ok', false, 'code', 'VOTING_CLOSED', 'message', 'Thời gian bình chọn đã kết thúc');
  END IF;

  -- Check if voter exists and hasn't voted
  SELECT has_voted INTO v_has_voted
  FROM voters
  WHERE id = p_voter_id;

  IF v_has_voted IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED', 'message', 'Session không hợp lệ');
  END IF;

  IF v_has_voted = true THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_VOTED', 'message', 'Bạn đã bình chọn rồi');
  END IF;

  -- Verify candidate belongs to event
  IF NOT EXISTS (SELECT 1 FROM candidates WHERE id = p_candidate_id AND event_id = v_event_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'message', 'Thí sinh không hợp lệ');
  END IF;

  -- Insert vote (will fail on duplicate due to constraint)
  BEGIN
    INSERT INTO votes (event_id, voter_id, candidate_id, idempotency_key)
    VALUES (v_event_id, p_voter_id, p_candidate_id, p_idempotency_key);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_VOTED', 'message', 'Bạn đã bình chọn rồi');
  END;

  -- Increment vote count
  UPDATE candidates
  SET vote_count = vote_count + 1
  WHERE id = p_candidate_id;

  -- Mark voter as voted
  UPDATE voters
  SET has_voted = true, voted_at = now()
  WHERE id = p_voter_id;

  RETURN jsonb_build_object('ok', true, 'code', NULL, 'message', 'Bình chọn thành công');
END;
$$;
