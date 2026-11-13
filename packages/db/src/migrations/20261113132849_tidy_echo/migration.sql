PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_registration` (
	`id` text PRIMARY KEY,
	`edition_id` text NOT NULL,
	`user_id` text NOT NULL,
	`proposal_id` text NOT NULL UNIQUE,
	`amount_mxn` integer NOT NULL,
	`stripe_checkout_session_id` text UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_registration_edition_id_edition_id_fk` FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`),
	CONSTRAINT `fk_registration_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_registration_proposal_id_proposal_id_fk` FOREIGN KEY (`proposal_id`) REFERENCES `proposal`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_registration`(`id`, `edition_id`, `user_id`, `proposal_id`, `amount_mxn`, `stripe_checkout_session_id`, `created_at`) SELECT `id`, `edition_id`, `user_id`, `proposal_id`, `amount_mxn`, `stripe_checkout_session_id`, `created_at` FROM `registration`;--> statement-breakpoint
DROP TABLE `registration`;--> statement-breakpoint
ALTER TABLE `__new_registration` RENAME TO `registration`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `registration_edition_user_idx` ON `registration` (`edition_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `registration_userId_idx` ON `registration` (`user_id`);