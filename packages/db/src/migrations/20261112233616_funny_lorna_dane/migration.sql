CREATE TABLE `author_profile` (
	`user_id` text PRIMARY KEY,
	`slug` text NOT NULL UNIQUE,
	`display_name` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`instagram_url` text,
	`x_url` text,
	`facebook_url` text,
	`portfolio_url` text,
	CONSTRAINT `fk_author_profile_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `registration` (
	`id` text PRIMARY KEY,
	`edition_id` text NOT NULL,
	`user_id` text NOT NULL,
	`proposal_id` text NOT NULL UNIQUE,
	`amount_mxn` integer NOT NULL,
	`stripe_checkout_session_id` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_registration_edition_id_edition_id_fk` FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`),
	CONSTRAINT `fk_registration_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_registration_proposal_id_proposal_id_fk` FOREIGN KEY (`proposal_id`) REFERENCES `proposal`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_edition_user_idx` ON `registration` (`edition_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `registration_userId_idx` ON `registration` (`user_id`);--> statement-breakpoint
-- drizzle-kit does not diff the WHERE clause of a partial index, so the change is written by hand.
DROP INDEX `proposal_one_open_per_email_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `proposal_one_open_per_email_idx` ON `proposal` (`edition_id`,`email`) WHERE status in ('pending', 'accepted', 'registered');
