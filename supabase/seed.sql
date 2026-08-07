-- Seed: one event + 5 candidates
INSERT INTO events (name, status, version)
VALUES ('A Decade Of Inspiration', 'draft', 1);

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
