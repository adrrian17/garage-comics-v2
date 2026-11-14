ALTER TABLE `author_profile` ADD `stripe_account_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `author_profile_stripe_account_id_idx` ON `author_profile` (`stripe_account_id`);