-- Atomic vote function
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
  v_has_voted boolean;
  v_result jsonb;
BEGIN
  -- Lock and check event
  SELECT id, status INTO v_event_id, v_event_status
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
