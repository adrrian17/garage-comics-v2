CREATE TABLE `order` (
	`id` text PRIMARY KEY,
	`number` integer,
	`edition_id` text NOT NULL,
	`customer_email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stripe_checkout_session_id` text NOT NULL UNIQUE,
	`stripe_payment_intent_id` text,
	`paid_at` integer,
	`confirmation_sent_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_order_edition_id_edition_id_fk` FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`),
	CONSTRAINT "order_paid_check" CHECK(("status" = 'paid') = ("number" is not null and "paid_at" is not null)),
	CONSTRAINT "order_number_check" CHECK("number" is null or "number" >= 1000)
);
--> statement-breakpoint
CREATE TABLE `order_item` (
	`id` text PRIMARY KEY,
	`order_id` text NOT NULL,
	`edition_comic_id` text NOT NULL,
	`title` text NOT NULL,
	`price_centavos` integer NOT NULL,
	`commission_centavos` integer NOT NULL,
	CONSTRAINT `fk_order_item_order_id_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`),
	CONSTRAINT `fk_order_item_edition_comic_id_edition_comic_id_fk` FOREIGN KEY (`edition_comic_id`) REFERENCES `edition_comic`(`id`),
	CONSTRAINT "order_item_commission_check" CHECK("commission_centavos" >= 0 and "commission_centavos" < "price_centavos")
);
--> statement-breakpoint
CREATE TABLE `transfer` (
	`order_item_id` text PRIMARY KEY,
	`stripe_transfer_id` text UNIQUE,
	`attempts` integer DEFAULT 0 NOT NULL,
	`first_attempt_at` integer,
	`last_error` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_transfer_order_item_id_order_item_id_fk` FOREIGN KEY (`order_item_id`) REFERENCES `order_item`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_number_idx` ON `order` (`number`);--> statement-breakpoint
CREATE INDEX `order_editionId_status_idx` ON `order` (`edition_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `order_item_order_comic_idx` ON `order_item` (`order_id`,`edition_comic_id`);--> statement-breakpoint
CREATE INDEX `transfer_unsent_idx` ON `transfer` (`created_at`) WHERE stripe_transfer_id is null;