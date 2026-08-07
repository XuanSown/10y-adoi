-- Migration: Update candidates with real contestant data
-- This updates the 5 candidates with actual names and images.
-- If candidates don't exist yet, insert them.

-- Step 1: Delete old candidates for the current event
DELETE FROM votes WHERE event_id = (SELECT id FROM events ORDER BY created_at DESC LIMIT 1);
DELETE FROM candidates WHERE event_id = (SELECT id FROM events ORDER BY created_at DESC LIMIT 1);

-- Step 2: Insert the 5 real contestants
INSERT INTO candidates (event_id, name, image_path, display_order)
SELECT
  (SELECT id FROM events ORDER BY created_at DESC LIMIT 1),
  unnest(ARRAY[
    'Trần Lê Phước Phước',
    'Hồ Thị Xuân Thảo',
    'Trần Minh Nhựt',
    'Lâm Kim Thơi',
    'Hà Đông'
  ]),
  unnest(ARRAY[
    '/images/candidates/thi_sinh_01.jpg',
    '/images/candidates/thi_sinh_02.jpg',
    '/images/candidates/thi_sinh_03.jpg',
    '/images/candidates/thi_sinh_04.jpg',
    '/images/candidates/thi_sinh_05.jpg'
  ]),
  generate_series(1, 5);

-- Step 3: Reset voters state so everyone can vote again
UPDATE voters SET has_voted = false, voted_at = NULL;

-- Step 4: Reset event to draft
UPDATE events SET status = 'draft', updated_at = now()
WHERE id = (SELECT id FROM events ORDER BY created_at DESC LIMIT 1);
