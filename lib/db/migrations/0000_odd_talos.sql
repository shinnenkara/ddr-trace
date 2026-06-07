CREATE TABLE `songs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`folder` text NOT NULL,
	`title` text NOT NULL,
	`difficulty` text NOT NULL,
	`rating` integer NOT NULL,
	`song_length` integer NOT NULL,
	`display_bpm_min` integer NOT NULL,
	`display_bpm_max` integer NOT NULL,
	`bpm_changes` integer NOT NULL,
	`artist` text NOT NULL,
	`notes` integer NOT NULL,
	`steps` integer NOT NULL,
	`jumps` integer NOT NULL,
	`holds` integer NOT NULL,
	`shock_arrows` integer NOT NULL,
	`max_combo_steps_shock_arrows` integer NOT NULL
);
