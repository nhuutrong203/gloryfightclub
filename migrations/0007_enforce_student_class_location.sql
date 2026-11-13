CREATE TRIGGER student_class_location_insert
BEFORE INSERT ON student_classes
WHEN (SELECT location_id FROM students WHERE id = NEW.student_id)
  IS NOT (SELECT location_id FROM classes WHERE id = NEW.class_id)
BEGIN
  SELECT RAISE(ABORT, 'student_class_location_mismatch');
END;
--> statement-breakpoint
CREATE TRIGGER student_location_update
BEFORE UPDATE OF location_id ON students
WHEN NEW.location_id IS NOT OLD.location_id
AND EXISTS (SELECT 1 FROM settings WHERE key = 'enforce_student_location' AND value = 'true')
AND EXISTS (
  SELECT 1 FROM student_classes sc JOIN classes c ON c.id = sc.class_id
  WHERE sc.student_id = OLD.id AND c.location_id IS NOT NEW.location_id
)
BEGIN
  SELECT RAISE(ABORT, 'student_class_location_mismatch');
END;
--> statement-breakpoint
CREATE TRIGGER class_location_update
BEFORE UPDATE OF location_id ON classes
WHEN NEW.location_id IS NOT OLD.location_id AND EXISTS (
  SELECT 1 FROM student_classes WHERE class_id = OLD.id
)
BEGIN
  SELECT RAISE(ABORT, 'student_class_location_mismatch');
END;
