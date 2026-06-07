CREATE TABLE `user_played_songs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`song_id` integer NOT NULL,
	`arcade_score` integer NOT NULL,
	`stage` integer,
	`batch_id` text,
	`ex_score` integer,
	`speed_modifier` text,
	`played_at` integer NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_played_songs_user_played_at_idx` ON `user_played_songs` (`user_id`,`played_at`);
--> statement-breakpoint
CREATE INDEX `user_played_songs_user_batch_idx` ON `user_played_songs` (`user_id`,`batch_id`);
--> statement-breakpoint
CREATE INDEX `user_played_songs_user_song_stage_idx` ON `user_played_songs` (`user_id`,`song_id`,`stage`);
