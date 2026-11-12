CREATE TABLE `edition` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`proposals_open_at` integer NOT NULL,
	`proposals_close_at` integer NOT NULL,
	`sales_open_at` integer NOT NULL,
	`sales_close_at` integer NOT NULL,
	`registration_price_mxn` integer NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proposal` (
	`id` text PRIMARY KEY,
	`edition_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`portfolio_url` text,
	`about` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`accepted_at` integer,
	`decided_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_proposal_edition_id_edition_id_fk` FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`)
);
--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'author' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `edition_one_active_idx` ON `edition` (`is_active`) WHERE is_active = 1;--> statement-breakpoint
CREATE INDEX `proposal_editionId_status_idx` ON `proposal` (`edition_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `proposal_one_open_per_email_idx` ON `proposal` (`edition_id`,`email`) WHERE status in ('pending', 'accepted');