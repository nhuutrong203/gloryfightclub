CREATE TABLE `partners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`kind` text DEFAULT 'supporter' NOT NULL,
	`image_key` text NOT NULL,
	`website` text,
	`is_public` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
