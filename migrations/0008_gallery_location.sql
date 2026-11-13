ALTER TABLE `gallery_items` ADD `location_id` integer REFERENCES locations(id) ON DELETE SET NULL;
