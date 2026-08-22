ALTER TABLE course_modules ADD COLUMN archived_at TEXT;
ALTER TABLE course_lessons ADD COLUMN archived_at TEXT;
ALTER TABLE lesson_contents ADD COLUMN archived_at TEXT;

CREATE INDEX course_modules_active_idx ON course_modules(course_id, archived_at, sort_order);
CREATE INDEX course_lessons_active_idx ON course_lessons(module_id, archived_at, sort_order);
CREATE INDEX lesson_contents_active_idx ON lesson_contents(lesson_id, archived_at, sort_order);
