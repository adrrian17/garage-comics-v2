CREATE TABLE `download_copy` (
	`download_link_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`ready_at` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `download_copy_pk` PRIMARY KEY(`download_link_id`, `order_item_id`),
	CONSTRAINT `fk_download_copy_download_link_id_download_link_id_fk` FOREIGN KEY (`download_link_id`) REFERENCES `download_link`(`id`),
	CONSTRAINT `fk_download_copy_order_item_id_order_item_id_fk` FOREIGN KEY (`order_item_id`) REFERENCES `order_item`(`id`)
);
--> statement-breakpoint
CREATE TABLE `download_link` (
	`id` text PRIMARY KEY,
	`order_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`resent_by` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_download_link_order_id_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`),
	CONSTRAINT `fk_download_link_resent_by_user_id_fk` FOREIGN KEY (`resent_by`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE INDEX `download_link_orderId_idx` ON `download_link` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `download_link_payment_idx` ON `download_link` (`order_id`) WHERE resent_by is null;