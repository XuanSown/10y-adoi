-- Migration: Update event name to "A Decade Of Inspiration"
UPDATE events SET name = 'A Decade Of Inspiration' WHERE id IS NOT NULL;
