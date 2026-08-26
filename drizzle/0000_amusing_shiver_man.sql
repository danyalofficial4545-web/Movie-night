CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`movieId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `downloads_id` PRIMARY KEY(`id`),
	CONSTRAINT `download_user_movie_unique` UNIQUE(`userId`,`movieId`)
);
--> statement-breakpoint
CREATE TABLE `movies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`description` text NOT NULL,
	`thumbnailUrl` text,
	`bannerUrl` text,
	`videoUrl` text,
	`languageTags` json NOT NULL,
	`quality` enum('720p','1080p') NOT NULL DEFAULT '1080p',
	`releaseYear` int NOT NULL,
	`downloadCost` int NOT NULL DEFAULT 1000,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `movies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`mobile` varchar(32),
	`avatarUrl` text,
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`coinBalance` int NOT NULL DEFAULT 0,
	`isBlocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_mobile_unique` UNIQUE(`mobile`)
);
--> statement-breakpoint
CREATE TABLE `walletTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`movieId` int,
	`activity` enum('watched','downloaded','admin_adjustment') NOT NULL,
	`coinsDelta` int NOT NULL,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `walletTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`movieId` int NOT NULL,
	`episodeLabel` varchar(120),
	`watchedSeconds` int NOT NULL DEFAULT 0,
	`coinsEarned` int NOT NULL DEFAULT 0,
	`lastPlayedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `watchSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `watch_session_user_movie_episode_unique` UNIQUE(`userId`,`movieId`,`episodeLabel`)
);
--> statement-breakpoint
ALTER TABLE `downloads` ADD CONSTRAINT `downloads_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `downloads` ADD CONSTRAINT `downloads_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movies` ADD CONSTRAINT `movies_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `walletTransactions` ADD CONSTRAINT `walletTransactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `walletTransactions` ADD CONSTRAINT `walletTransactions_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchSessions` ADD CONSTRAINT `watchSessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchSessions` ADD CONSTRAINT `watchSessions_movieId_movies_id_fk` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `download_user_idx` ON `downloads` (`userId`);--> statement-breakpoint
CREATE INDEX `movies_category_idx` ON `movies` (`categoryId`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `wallet_transaction_user_idx` ON `walletTransactions` (`userId`);--> statement-breakpoint
CREATE INDEX `wallet_transaction_movie_idx` ON `walletTransactions` (`movieId`);--> statement-breakpoint
CREATE INDEX `watch_session_user_idx` ON `watchSessions` (`userId`);