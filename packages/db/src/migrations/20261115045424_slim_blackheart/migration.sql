CREATE TABLE `comic` (
	`id` text PRIMARY KEY,
	`author_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_comic_author_id_user_id_fk` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `edition_comic` (
	`id` text PRIMARY KEY,
	`edition_id` text NOT NULL,
	`comic_id` text NOT NULL,
	`author_id` text NOT NULL,
	`slot` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`genre` text NOT NULL,
	`price_mxn` integer NOT NULL,
	`page_count` integer NOT NULL,
	`collaborators` text NOT NULL,
	`cover_key` text,
	`pdf_key` text,
	`pdf_bytes` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`rejection_reason` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_edition_comic_edition_id_edition_id_fk` FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`),
	CONSTRAINT `fk_edition_comic_reviewed_by_user_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_edition_comic_comic_id_author_id_comic_id_author_id_fk` FOREIGN KEY (`comic_id`,`author_id`) REFERENCES `comic`(`id`,`author_id`),
	CONSTRAINT "edition_comic_price_check" CHECK("price_mxn" >= 70),
	CONSTRAINT "edition_comic_exclusive_pages_check" CHECK("slot" != 'exclusive' or "page_count" between 12 and 24),
	CONSTRAINT "edition_comic_pages_check" CHECK("page_count" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comic_id_author_idx` ON `comic` (`id`,`author_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `edition_comic_slot_idx` ON `edition_comic` (`edition_id`,`author_id`,`slot`);--> statement-breakpoint
CREATE UNIQUE INDEX `edition_comic_edition_comic_idx` ON `edition_comic` (`edition_id`,`comic_id`);--> statement-breakpoint
CREATE INDEX `edition_comic_editionId_status_idx` ON `edition_comic` (`edition_id`,`status`);