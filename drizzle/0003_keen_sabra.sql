ALTER TABLE `categories` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_parentId_categories_id_fk` FOREIGN KEY (`parentId`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `category_parent_idx` ON `categories` (`parentId`);