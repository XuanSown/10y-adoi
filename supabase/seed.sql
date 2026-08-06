-- Seed: one event + 5 candidates
INSERT INTO events (name, status, version)
VALUES ('10th Anniversary - A Decade Of Inspiration', 'draft', 1);

INSERT INTO candidates (event_id, name, image_path, display_order)
SELECT
  (SELECT id FROM events ORDER BY created_at DESC LIMIT 1),
  unnest(ARRAY['Trần Văn A', 'Trần Xuân B', 'Nguyễn Thị C', 'Phạm Quốc D', 'Lê Triệu E']),
  unnest(ARRAY[
    '/images/candidates/anh1.jpg',
    '/images/candidates/anh2.jpg',
    '/images/candidates/anh3.jpg',
    '/images/candidates/anh4.jpg',
    '/images/candidates/anh5.jpg'
  ]),
  generate_series(1, 5);
