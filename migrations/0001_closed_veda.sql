ALTER TABLE `post_images` ADD `type` text DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `format` text DEFAULT 'text' NOT NULL;