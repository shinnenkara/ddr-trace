DROP TABLE IF EXISTS `user_played_songs`;--> statement-breakpoint
DROP TABLE IF EXISTS `songs`;--> statement-breakpoint
CREATE TABLE `songs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`folder` text NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`song_length` integer NOT NULL,
	`display_bpm_min` integer NOT NULL,
	`display_bpm_max` integer NOT NULL,
	`bpm_changes` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `songs_title_artist_idx` ON `songs` (`title`,`artist`);--> statement-breakpoint
CREATE TABLE `song_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`song_id` integer NOT NULL,
	`type` text NOT NULL,
	`difficulty` text NOT NULL,
	`rating` integer NOT NULL,
	`notes` integer NOT NULL,
	`steps` integer NOT NULL,
	`jumps` integer NOT NULL,
	`holds` integer NOT NULL,
	`shock_arrows` integer NOT NULL,
	`max_combo_steps_shock_arrows` integer NOT NULL,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `song_variants_song_type_difficulty_idx` ON `song_variants` (`song_id`,`type`,`difficulty`);--> statement-breakpoint
CREATE INDEX `song_variants_song_id_idx` ON `song_variants` (`song_id`);--> statement-breakpoint
CREATE INDEX `song_variants_type_idx` ON `song_variants` (`type`);--> statement-breakpoint
CREATE TABLE `user_played_songs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`song_variant_id` integer NOT NULL,
	`arcade_score` integer NOT NULL,
	`stage` integer,
	`batch_id` text,
	`ex_score` integer,
	`speed_modifier` text,
	`played_at` integer NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`song_variant_id`) REFERENCES `song_variants`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `user_played_songs_user_played_at_idx` ON `user_played_songs` (`user_id`,`played_at`);--> statement-breakpoint
CREATE INDEX `user_played_songs_user_batch_idx` ON `user_played_songs` (`user_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `user_played_songs_user_song_variant_stage_idx` ON `user_played_songs` (`user_id`,`song_variant_id`,`stage`);
