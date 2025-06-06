-- منصة الشهادات والبطاقات الإلكترونية - قاعدة بيانات MySQL شاملة
-- تاريخ الإنشاء: 2025-05-04

-- إنشاء قاعدة البيانات وتحديد ترميز الحروف
CREATE DATABASE IF NOT EXISTS `certificates` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `certificates`;

-- منع الأخطاء بسبب القيود الخارجية
SET FOREIGN_KEY_CHECKS=0;

-- حذف الجداول إذا كانت موجودة (اختياري)
DROP TABLE IF EXISTS `template_logos`;
DROP TABLE IF EXISTS `user_signatures`;
DROP TABLE IF EXISTS `user_logos`;
DROP TABLE IF EXISTS `layers`;
DROP TABLE IF EXISTS `seo`;
DROP TABLE IF EXISTS `auth_settings`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `certificate_batch_items`;
DROP TABLE IF EXISTS `certificate_batches`;
DROP TABLE IF EXISTS `certificates`;
DROP TABLE IF EXISTS `cards`;
DROP TABLE IF EXISTS `template_fields`;
DROP TABLE IF EXISTS `templates`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `fonts`;
DROP TABLE IF EXISTS `users`;

-- إعادة تفعيل القيود الخارجية
SET FOREIGN_KEY_CHECKS=1;

-- إنشاء جدول المستخدمين
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `is_admin` TINYINT DEFAULT 0,
  `role` VARCHAR(50) DEFAULT 'user',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول التصنيفات
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT,
  `display_order` INT NOT NULL DEFAULT 0,
  `icon` VARCHAR(50),
  `active` TINYINT DEFAULT 1 NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول الخطوط
CREATE TABLE `fonts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `name_ar` VARCHAR(255),
  `family` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'google',
  `url` VARCHAR(512),
  `active` TINYINT DEFAULT 1 NOT NULL,
  `is_rtl` TINYINT DEFAULT 0 NOT NULL,
  `display_order` INT DEFAULT 0 NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول القوالب
CREATE TABLE `templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `title_ar` VARCHAR(255),
  `slug` VARCHAR(255) NOT NULL,
  `category_id` INT NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `thumbnail_url` VARCHAR(512),
  `display_order` INT NOT NULL DEFAULT 0,
  `fields` JSON NOT NULL DEFAULT ('[]'),
  `default_values` JSON DEFAULT ('{}'),
  `settings` JSON DEFAULT ('{}'),
  `active` TINYINT DEFAULT 1 NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول حقول القوالب
CREATE TABLE `template_fields` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `label_ar` VARCHAR(255),
  `type` VARCHAR(50) NOT NULL DEFAULT 'text',
  `image_type` VARCHAR(50),
  `required` TINYINT DEFAULT 0 NOT NULL,
  `default_value` VARCHAR(512),
  `placeholder` VARCHAR(255),
  `placeholder_ar` VARCHAR(255),
  `options` JSON DEFAULT ('[]'),
  `position` JSON DEFAULT ('{}'),
  `style` JSON DEFAULT ('{}'),
  `display_order` INT DEFAULT 0 NOT NULL,
  FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول البطاقات
CREATE TABLE `cards` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL,
  `user_id` INT,
  `form_data` JSON NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `thumbnail_url` VARCHAR(512),
  `category_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `last_accessed` DATETIME,
  `quality` VARCHAR(50) DEFAULT 'medium',
  `public_id` VARCHAR(255) UNIQUE,
  `access_count` INT DEFAULT 0 NOT NULL,
  `settings` JSON DEFAULT ('{}'),
  `status` VARCHAR(50) DEFAULT 'active' NOT NULL,
  FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول الشهادات
CREATE TABLE `certificates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `title_ar` VARCHAR(255),
  `template_id` INT NOT NULL,
  `user_id` INT,
  `certificate_type` VARCHAR(50) NOT NULL DEFAULT 'appreciation',
  `form_data` JSON NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `expiry_date` DATE,
  `status` VARCHAR(50) DEFAULT 'active' NOT NULL,
  `issued_to` VARCHAR(255),
  `issued_to_gender` VARCHAR(10) DEFAULT 'male',
  `verification_code` VARCHAR(100) UNIQUE,
  `public_id` VARCHAR(255) UNIQUE,
  FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول دفعات الشهادات
CREATE TABLE `certificate_batches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `user_id` INT,
  `template_id` INT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending' NOT NULL,
  `total_items` INT DEFAULT 0 NOT NULL,
  `processed_items` INT DEFAULT 0 NOT NULL,
  `source_type` VARCHAR(50) DEFAULT 'excel' NOT NULL,
  `source_data` VARCHAR(512),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `completed_at` DATETIME,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول عناصر دفعات الشهادات
CREATE TABLE `certificate_batch_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `batch_id` INT NOT NULL,
  `certificate_id` INT,
  `status` VARCHAR(50) DEFAULT 'pending' NOT NULL,
  `form_data` JSON NOT NULL,
  `error_message` TEXT,
  `row_number` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `processed_at` DATETIME,
  FOREIGN KEY (`batch_id`) REFERENCES `certificate_batches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`certificate_id`) REFERENCES `certificates`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول الإعدادات
CREATE TABLE `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(255) NOT NULL,
  `value` JSON NOT NULL,
  `category` VARCHAR(100) DEFAULT 'general' NOT NULL,
  `description` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_by` INT,
  UNIQUE KEY `category_key_idx` (`category`, `key`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول إعدادات المصادقة
CREATE TABLE `auth_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provider` VARCHAR(50) NOT NULL,
  `client_id` VARCHAR(255),
  `client_secret` VARCHAR(255),
  `redirect_uri` VARCHAR(512),
  `enabled` TINYINT DEFAULT 0 NOT NULL,
  `settings` JSON DEFAULT ('{}'),
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_by` INT,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول إعدادات SEO
CREATE TABLE `seo` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `keywords` JSON DEFAULT ('[]'),
  `og_image` VARCHAR(512),
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT,
  `canonical_url` VARCHAR(512),
  `structured_data` JSON DEFAULT ('{}'),
  `no_index` TINYINT DEFAULT 0 NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_by` INT,
  UNIQUE KEY `entity_type_id_idx` (`entity_type`, `entity_id`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول الطبقات
CREATE TABLE `layers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `template_id` INT NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'shape',
  `content` TEXT,
  `z_index` INT DEFAULT 0 NOT NULL,
  `position` JSON DEFAULT ('{}'),
  `is_default` TINYINT DEFAULT 0 NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول شعارات المستخدم
CREATE TABLE `user_logos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `thumbnail_url` VARCHAR(512),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `is_active` TINYINT DEFAULT 1 NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول توقيعات المستخدم
CREATE TABLE `user_signatures` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `thumbnail_url` VARCHAR(512),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `is_active` TINYINT DEFAULT 1 NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول شعارات القوالب
CREATE TABLE `template_logos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'logo',
  `image_url` VARCHAR(512) NOT NULL,
  `z_index` INT DEFAULT 10 NOT NULL,
  `is_required` TINYINT DEFAULT 0 NOT NULL,
  `display_order` INT DEFAULT 0 NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول مشاهدات الشهادات
CREATE TABLE `certificate_views` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `certificateId` INT NOT NULL,
  `ip` VARCHAR(50) DEFAULT NULL,
  `userAgent` TEXT,
  `viewedAt` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`certificateId`) REFERENCES `certificates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء جدول مشاركات الشهادات
CREATE TABLE `certificate_shares` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `certificateId` INT NOT NULL,
  `platform` VARCHAR(50) DEFAULT NULL,
  `ip` VARCHAR(50) DEFAULT NULL,
  `sharedAt` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`certificateId`) REFERENCES `certificates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إنشاء المستخدم الافتراضي admin
INSERT INTO `users` (`username`, `password`, `full_name`, `email`, `is_admin`, `role`)
VALUES ('admin', '$2a$10$W8CvogXvJ0rD.eso7hWnGOfD1WOUEDLMXbJ2UZOc7Os8AJQgQvWLK', 'مدير النظام', 'admin@example.com', 1, 'admin');

-- إضافة تصنيف افتراضي
INSERT INTO `categories` (`name`, `slug`, `description`, `display_order`, `icon`, `active`) 
VALUES ('شهادات تقدير', 'appreciation', 'شهادات تقدير متنوعة', 1, '🏆', 1);

-- إضافة الخطوط العربية
INSERT INTO `fonts` (`name`, `name_ar`, `family`, `type`, `is_rtl`, `active`, `display_order`) VALUES
('Cairo', 'القاهرة', 'Cairo, sans-serif', 'google', 1, 1, 1),
('Tajawal', 'تجوال', 'Tajawal, sans-serif', 'google', 1, 1, 2),
('Amiri', 'أميري', 'Amiri, serif', 'google', 1, 1, 3),
('IBM Plex Sans Arabic', 'IBM بلكس سانس', 'IBM Plex Sans Arabic, sans-serif', 'google', 1, 1, 4),
('Noto Sans Arabic', 'نوتو سانس', 'Noto Sans Arabic, sans-serif', 'google', 1, 1, 5),
('Noto Kufi Arabic', 'نوتو كوفي', 'Noto Kufi Arabic, sans-serif', 'google', 1, 1, 6);

-- إضافة قالب نموذجي للاختبار
INSERT INTO `templates` (`title`, `title_ar`, `slug`, `category_id`, `image_url`, `thumbnail_url`, `display_order`, `fields`, `default_values`, `settings`, `active`) 
VALUES (
    'شهادة تقدير نموذجية', 
    'شهادة تقدير نموذجية', 
    'basic-certificate',
    1, 
    '/static/certificate-template-1.jpg', 
    '/static/certificate-template-1-thumb.jpg',
    1,
    JSON_ARRAY(
        'recipient_name',
        'certificate_title',
        'description',
        'issuer_name',
        'issue_date'
    ),
    JSON_OBJECT(
        'certificate_title', 'شهادة تقدير',
        'description', 'نقدم هذه الشهادة تقديرًا للجهود المتميزة'
    ),
    JSON_OBJECT(
        'font', 'Cairo',
        'direction', 'rtl',
        'paperSize', 'A4',
        'orientation', 'landscape'
    ),
    1
);

-- إضافة حقول القالب النموذجي
INSERT INTO `template_fields` (`template_id`, `name`, `label`, `label_ar`, `type`, `required`, `default_value`, `placeholder`, `placeholder_ar`, `display_order`) VALUES
(1, 'recipient_name', 'Recipient Name', 'اسم المستلم', 'text', 1, NULL, 'Enter recipient name', 'أدخل اسم المستلم', 1),
(1, 'certificate_title', 'Certificate Title', 'عنوان الشهادة', 'text', 1, 'شهادة تقدير', 'Enter certificate title', 'أدخل عنوان الشهادة', 2),
(1, 'description', 'Description', 'وصف الشهادة', 'textarea', 1, 'نقدم هذه الشهادة تقديرًا للجهود المتميزة', 'Enter description', 'أدخل وصف الشهادة', 3),
(1, 'issuer_name', 'Issuer Name', 'اسم المصدر', 'text', 1, NULL, 'Enter issuer name', 'أدخل اسم المصدر', 4),
(1, 'issue_date', 'Issue Date', 'تاريخ الإصدار', 'date', 1, NULL, 'Select date', 'اختر التاريخ', 5);

-- إضافة إعدادات النظام الأساسية
INSERT INTO `settings` (`key`, `value`, `category`, `description`)
VALUES 
('site_name', JSON_OBJECT('ar', 'منصة الشهادات والبطاقات الإلكترونية', 'en', 'Certificates Platform'), 'general', 'اسم الموقع'),
('display_mode', JSON_OBJECT('mode', 'multi'), 'display', 'نمط عرض القوالب (single/multi)'),
('analytics', JSON_OBJECT('enable_tracking', true, 'track_views', true, 'track_shares', true), 'analytics', 'إعدادات تحليلات الشهادات');

-- إضافة إعدادات SEO الافتراضية
INSERT INTO `seo` (`title`, `description`, `entity_type`)
VALUES ('منصة الشهادات والبطاقات الإلكترونية', 'منصة لإنشاء وإدارة الشهادات والبطاقات الإلكترونية بسهولة وحرفية', 'global');

-- تحديث الحقول عند الإنشاء والتحديث
DELIMITER $$
CREATE TRIGGER update_timestamps_on_update
BEFORE UPDATE ON `categories` FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END $$

CREATE TRIGGER update_templates_timestamps_on_update
BEFORE UPDATE ON `templates` FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END $$

CREATE TRIGGER update_cards_timestamps_on_update
BEFORE UPDATE ON `cards` FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END $$

CREATE TRIGGER update_settings_timestamps_on_update
BEFORE UPDATE ON `settings` FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END $$

CREATE TRIGGER update_layers_timestamps_on_update
BEFORE UPDATE ON `layers` FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END $$

CREATE TRIGGER update_user_logos_timestamps_on_update
BEFORE UPDATE ON `user_logos` FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END $$

CREATE TRIGGER update_user_signatures_timestamps_on_update
BEFORE UPDATE ON `user_signatures` FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END $$

CREATE TRIGGER update_template_logos_timestamps_on_update
BEFORE UPDATE ON `template_logos` FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END $$

CREATE TRIGGER update_seo_timestamps_on_update
BEFORE UPDATE ON `seo` FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END $$
DELIMITER ;

-- إنهاء الملف
-- تم إنشاء هذا الملف تلقائياً لمنصة الشهادات والبطاقات الإلكترونية