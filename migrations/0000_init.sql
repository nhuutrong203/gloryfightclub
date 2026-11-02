CREATE TABLE `achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`title_en` text,
	`event_name` text,
	`event_date` text,
	`description` text,
	`description_en` text,
	`image_key` text,
	`coach_id` integer,
	`is_public` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `belts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`discipline_id` integer NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`color` text NOT NULL,
	`rank` integer NOT NULL,
	`requirements` text,
	`requirements_en` text,
	`min_months` integer,
	FOREIGN KEY (`discipline_id`) REFERENCES `disciplines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`discipline_ids` text DEFAULT '[]' NOT NULL,
	`location_id` integer NOT NULL,
	`days` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`coach_id` integer,
	`level` text DEFAULT 'all' NOT NULL,
	`note` text,
	`note_en` text,
	`is_public` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `classes_location_idx` ON `classes` (`location_id`);--> statement-breakpoint
CREATE TABLE `coaches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`full_name` text NOT NULL,
	`photo_key` text,
	`title` text,
	`title_en` text,
	`bio` text,
	`bio_en` text,
	`achievements` text,
	`achievements_en` text,
	`discipline_ids` text DEFAULT '[]' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coaches_slug_unique` ON `coaches` (`slug`);--> statement-breakpoint
CREATE TABLE `disciplines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`summary` text,
	`summary_en` text,
	`description` text,
	`description_en` text,
	`cover_key` text,
	`has_belts` integer DEFAULT false NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `disciplines_slug_unique` ON `disciplines` (`slug`);--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question` text NOT NULL,
	`question_en` text,
	`answer` text NOT NULL,
	`answer_en` text,
	`is_public` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fee_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`headline` text,
	`headline_en` text,
	`condition` text,
	`condition_en` text,
	`price_per_month` integer NOT NULL,
	`features` text,
	`features_en` text,
	`badge` text,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gallery_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`key` text,
	`video_url` text,
	`caption` text,
	`caption_en` text,
	`album` text,
	`is_public` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`address` text NOT NULL,
	`map_url` text,
	`phone` text,
	`schedule_image_key` text,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`fee_plan_id` integer,
	`month` text NOT NULL,
	`amount` integer NOT NULL,
	`paid_at` text NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`note` text,
	`created_by` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fee_plan_id`) REFERENCES `fee_plans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `payments_month_idx` ON `payments` (`month`);--> statement-breakpoint
CREATE INDEX `payments_student_idx` ON `payments` (`student_id`);--> statement-breakpoint
CREATE TABLE `post_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`key` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text,
	`title_en` text,
	`content` text NOT NULL,
	`content_en` text,
	`published_at` integer NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`created_by` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_published_idx` ON `posts` (`published_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `student_classes` (
	`student_id` integer NOT NULL,
	`class_id` integer NOT NULL,
	PRIMARY KEY(`student_id`, `class_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text,
	`birth_year` integer,
	`parent_name` text,
	`parent_phone` text,
	`location_id` integer,
	`fee_plan_id` integer,
	`joined_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`fee_plan_id`) REFERENCES `fee_plans`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_code_unique` ON `students` (`code`);--> statement-breakpoint
CREATE INDEX `students_name_idx` ON `students` (`full_name`);--> statement-breakpoint
CREATE INDEX `students_phone_idx` ON `students` (`phone`);--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_name` text NOT NULL,
	`author_role` text,
	`author_role_en` text,
	`content` text NOT NULL,
	`content_en` text,
	`photo_key` text,
	`is_public` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trial_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`age` integer,
	`discipline_id` integer,
	`location_id` integer,
	`preferred_time` text,
	`note` text,
	`status` text DEFAULT 'new' NOT NULL,
	`student_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`discipline_id`) REFERENCES `disciplines`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trial_student_idx` ON `trial_registrations` (`student_id`);--> statement-breakpoint
CREATE INDEX `trial_status_idx` ON `trial_registrations` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text DEFAULT 'coach' NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	`coach_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);