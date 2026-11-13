INSERT INTO settings (key, value) VALUES ('enforce_student_location', 'true')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;
