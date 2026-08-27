CREATE TABLE `withdrawalRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`method` enum('easypaisa','jazzcash') NOT NULL,
	`accountName` varchar(160) NOT NULL,
	`accountNumber` varchar(32) NOT NULL,
	`coins` int NOT NULL,
	`pkrAmount` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewerNote` varchar(255),
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `withdrawalRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `walletTransactions` MODIFY COLUMN `activity` enum('watched','downloaded','admin_adjustment','referral_bonus','withdrawal_approved','withdrawal_rejected') NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `categoryType` enum('movie','drama') DEFAULT 'movie' NOT NULL;--> statement-breakpoint
ALTER TABLE `episodes` ADD `thumbnailUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(24);--> statement-breakpoint
ALTER TABLE `users` ADD `referredByUserId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `referralCoinsEarned` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `watchSessions` ADD `lastRewardedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_referralCode_unique` UNIQUE(`referralCode`);--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD CONSTRAINT `withdrawalRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `withdrawalRequests` ADD CONSTRAINT `withdrawalRequests_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `withdrawal_user_idx` ON `withdrawalRequests` (`userId`);--> statement-breakpoint
CREATE INDEX `withdrawal_status_idx` ON `withdrawalRequests` (`status`);--> statement-breakpoint
CREATE INDEX `category_type_idx` ON `categories` (`categoryType`);--> statement-breakpoint
CREATE INDEX `users_referrer_idx` ON `users` (`referredByUserId`);