CREATE TABLE `episodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movieId` int NOT NULL,
	`episodeNumber` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`videoUrl` text,
	`languageTags` json NOT NULL,
	`quality` varchar(24) NOT NULL DEFAULT '1080p',
	`qualityVariants` json,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `episodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `episode_movie_number_unique` UNIQUE(`movieId`,`episodeNumber`)
);
--> statement-breakpoint
ALTER TABLE `categories` ADD `coverUrl` text;--> statement-breakpoint
ALTER TABLE `movies` ADD `contentType` enum('movie','series') DEFAULT 'movie' NOT NULL;--> statement-breakpoint
ALTER TABLE `movies` ADD `posterUrl` text;--> statement-breakpoint
ALTER TABLE `watchSessions` ADD `episodeId` int;--> statement-breakpoint
ALTER TABLE `episodes` ADD CONSTRAINT `episodes_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `episode_movie_idx` ON `episodes` (`movieId`);--> statement-breakpoint
ALTER TABLE `watchSessions` ADD CONSTRAINT `watchSessions_episodeId_episodes_id_fk` FOREIGN KEY (`episodeId`) REFERENCES `episodes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `watch_session_episode_idx` ON `watchSessions` (`episodeId`);