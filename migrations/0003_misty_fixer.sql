ALTER TABLE `trial_registrations` ADD `birth_date` text;--> statement-breakpoint
ALTER TABLE `trial_registrations` ADD `class_id` integer REFERENCES classes(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `trial_registrations` ADD `trial_date` text;