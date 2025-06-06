-- منصة الشهادات والبطاقات الإلكترونية - قاعدة بيانات PostgreSQL شاملة
-- تاريخ الإنشاء: 2025-05-04

-- إلغاء القيود الخارجية مؤقتاً
SET session_replication_role = 'replica';

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "is_admin" BOOLEAN DEFAULT false,
  "role" TEXT DEFAULT 'user',
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول التصنيفات
CREATE TABLE IF NOT EXISTS "categories" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "icon" TEXT,
  "active" BOOLEAN DEFAULT true NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول الخطوط
CREATE TABLE IF NOT EXISTS "fonts" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "name_ar" TEXT,
  "family" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'google',
  "url" TEXT,
  "active" BOOLEAN DEFAULT true NOT NULL,
  "is_rtl" BOOLEAN DEFAULT false NOT NULL,
  "display_order" INTEGER DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول القوالب
CREATE TABLE IF NOT EXISTS "templates" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "title_ar" TEXT,
  "slug" TEXT NOT NULL,
  "category_id" INTEGER NOT NULL REFERENCES "categories"("id"),
  "image_url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "fields" JSONB NOT NULL DEFAULT '[]',
  "default_values" JSONB DEFAULT '{}',
  "settings" JSONB DEFAULT '{}',
  "active" BOOLEAN DEFAULT true NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول حقول القوالب
CREATE TABLE IF NOT EXISTS "template_fields" (
  "id" SERIAL PRIMARY KEY,
  "template_id" INTEGER NOT NULL REFERENCES "templates"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "label_ar" TEXT,
  "type" TEXT NOT NULL DEFAULT 'text',
  "image_type" TEXT,
  "required" BOOLEAN DEFAULT false NOT NULL,
  "default_value" TEXT,
  "placeholder" TEXT,
  "placeholder_ar" TEXT,
  "options" JSONB DEFAULT '[]',
  "position" JSONB DEFAULT '{}',
  "style" JSONB DEFAULT '{}',
  "display_order" INTEGER DEFAULT 0 NOT NULL
);

-- جدول البطاقات
CREATE TABLE IF NOT EXISTS "cards" (
  "id" SERIAL PRIMARY KEY,
  "template_id" INTEGER NOT NULL REFERENCES "templates"("id"),
  "user_id" INTEGER REFERENCES "users"("id"),
  "form_data" JSONB NOT NULL,
  "image_url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "category_id" INTEGER NOT NULL REFERENCES "categories"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_accessed" TIMESTAMP,
  "quality" TEXT DEFAULT 'medium',
  "public_id" TEXT UNIQUE,
  "access_count" INTEGER DEFAULT 0 NOT NULL,
  "settings" JSONB DEFAULT '{}',
  "status" TEXT DEFAULT 'active' NOT NULL
);

-- جدول الشهادات
CREATE TABLE IF NOT EXISTS "certificates" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "title_ar" TEXT,
  "template_id" INTEGER NOT NULL REFERENCES "templates"("id"),
  "user_id" INTEGER REFERENCES "users"("id"),
  "certificate_type" TEXT NOT NULL DEFAULT 'appreciation',
  "form_data" JSONB NOT NULL,
  "image_url" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiry_date" DATE,
  "status" TEXT DEFAULT 'active' NOT NULL,
  "issued_to" TEXT,
  "issued_to_gender" TEXT DEFAULT 'male',
  "verification_code" TEXT UNIQUE,
  "public_id" TEXT UNIQUE
);

-- جدول دفعات الشهادات
CREATE TABLE IF NOT EXISTS "certificate_batches" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "user_id" INTEGER REFERENCES "users"("id"),
  "template_id" INTEGER NOT NULL REFERENCES "templates"("id"),
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "total_items" INTEGER DEFAULT 0 NOT NULL,
  "processed_items" INTEGER DEFAULT 0 NOT NULL,
  "source_type" TEXT DEFAULT 'excel' NOT NULL,
  "source_data" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP
);

-- جدول عناصر دفعات الشهادات
CREATE TABLE IF NOT EXISTS "certificate_batch_items" (
  "id" SERIAL PRIMARY KEY,
  "batch_id" INTEGER NOT NULL REFERENCES "certificate_batches"("id") ON DELETE CASCADE,
  "certificate_id" INTEGER REFERENCES "certificates"("id"),
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "form_data" JSONB NOT NULL,
  "error_message" TEXT,
  "row_number" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP
);

-- جدول الإعدادات
CREATE TABLE IF NOT EXISTS "settings" (
  "id" SERIAL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "category" TEXT DEFAULT 'general' NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" INTEGER REFERENCES "users"("id"),
  UNIQUE ("category", "key")
);

-- جدول إعدادات المصادقة
CREATE TABLE IF NOT EXISTS "auth_settings" (
  "id" SERIAL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "client_id" TEXT,
  "client_secret" TEXT,
  "redirect_uri" TEXT,
  "enabled" BOOLEAN DEFAULT false NOT NULL,
  "settings" JSONB DEFAULT '{}',
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" INTEGER REFERENCES "users"("id")
);

-- جدول إعدادات SEO
CREATE TABLE IF NOT EXISTS "seo" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "keywords" JSONB DEFAULT '[]',
  "og_image" TEXT,
  "entity_type" TEXT NOT NULL,
  "entity_id" INTEGER,
  "canonical_url" TEXT,
  "structured_data" JSONB DEFAULT '{}',
  "no_index" BOOLEAN DEFAULT false NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" INTEGER REFERENCES "users"("id"),
  UNIQUE ("entity_type", "entity_id")
);

-- جدول الطبقات
CREATE TABLE IF NOT EXISTS "layers" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "template_id" INTEGER NOT NULL REFERENCES "templates"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL DEFAULT 'shape',
  "content" TEXT,
  "z_index" INTEGER DEFAULT 0 NOT NULL,
  "position" JSONB DEFAULT '{}',
  "is_default" BOOLEAN DEFAULT false NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول شعارات المستخدم
CREATE TABLE IF NOT EXISTS "user_logos" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_active" BOOLEAN DEFAULT true NOT NULL
);

-- جدول توقيعات المستخدم
CREATE TABLE IF NOT EXISTS "user_signatures" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_active" BOOLEAN DEFAULT true NOT NULL
);

-- جدول شعارات القوالب
CREATE TABLE IF NOT EXISTS "template_logos" (
  "id" SERIAL PRIMARY KEY,
  "template_id" INTEGER NOT NULL REFERENCES "templates"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'logo',
  "image_url" TEXT NOT NULL,
  "z_index" INTEGER DEFAULT 10 NOT NULL,
  "is_required" BOOLEAN DEFAULT false NOT NULL,
  "display_order" INTEGER DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول مشاهدات الشهادات
CREATE TABLE IF NOT EXISTS "certificate_views" (
  "id" SERIAL PRIMARY KEY,
  "certificate_id" INTEGER NOT NULL REFERENCES "certificates"("id") ON DELETE CASCADE,
  "ip" TEXT,
  "user_agent" TEXT,
  "viewed_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول مشاركات الشهادات
CREATE TABLE IF NOT EXISTS "certificate_shares" (
  "id" SERIAL PRIMARY KEY,
  "certificate_id" INTEGER NOT NULL REFERENCES "certificates"("id") ON DELETE CASCADE,
  "platform" TEXT,
  "ip" TEXT,
  "shared_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول جلسات المستخدمين
CREATE TABLE IF NOT EXISTS "session" (
  "sid" TEXT NOT NULL PRIMARY KEY,
  "sess" JSONB NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

-- إعادة تفعيل القيود الخارجية
SET session_replication_role = 'origin';

-- إنشاء المستخدم الافتراضي admin
INSERT INTO "users" ("username", "password", "full_name", "email", "is_admin", "role")
VALUES ('admin', '$2a$10$W8CvogXvJ0rD.eso7hWnGOfD1WOUEDLMXbJ2UZOc7Os8AJQgQvWLK', 'مدير النظام', 'admin@example.com', true, 'admin');

-- إضافة تصنيف افتراضي
INSERT INTO "categories" ("name", "slug", "description", "display_order", "icon", "active") 
VALUES ('شهادات تقدير', 'appreciation', 'شهادات تقدير متنوعة', 1, '🏆', true);

-- إضافة الخطوط العربية
INSERT INTO "fonts" ("name", "name_ar", "family", "type", "is_rtl", "active", "display_order") VALUES
('Cairo', 'القاهرة', 'Cairo, sans-serif', 'google', true, true, 1),
('Tajawal', 'تجوال', 'Tajawal, sans-serif', 'google', true, true, 2),
('Amiri', 'أميري', 'Amiri, serif', 'google', true, true, 3),
('IBM Plex Sans Arabic', 'IBM بلكس سانس', 'IBM Plex Sans Arabic, sans-serif', 'google', true, true, 4),
('Noto Sans Arabic', 'نوتو سانس', 'Noto Sans Arabic, sans-serif', 'google', true, true, 5),
('Noto Kufi Arabic', 'نوتو كوفي', 'Noto Kufi Arabic, sans-serif', 'google', true, true, 6);

-- إضافة قالب نموذجي للاختبار
INSERT INTO "templates" ("title", "title_ar", "slug", "category_id", "image_url", "thumbnail_url", "display_order", "fields", "default_values", "settings", "active") 
VALUES (
    'شهادة تقدير نموذجية', 
    'شهادة تقدير نموذجية', 
    'basic-certificate',
    1, 
    '/static/certificate-template-1.jpg', 
    '/static/certificate-template-1-thumb.jpg',
    1,
    '["recipient_name", "certificate_title", "description", "issuer_name", "issue_date"]',
    '{"certificate_title": "شهادة تقدير", "description": "نقدم هذه الشهادة تقديرًا للجهود المتميزة"}',
    '{"font": "Cairo", "direction": "rtl", "paperSize": "A4", "orientation": "landscape"}',
    true
);

-- إضافة حقول القالب النموذجي
INSERT INTO "template_fields" ("template_id", "name", "label", "label_ar", "type", "required", "default_value", "placeholder", "placeholder_ar", "display_order") VALUES
(1, 'recipient_name', 'Recipient Name', 'اسم المستلم', 'text', true, NULL, 'Enter recipient name', 'أدخل اسم المستلم', 1),
(1, 'certificate_title', 'Certificate Title', 'عنوان الشهادة', 'text', true, 'شهادة تقدير', 'Enter certificate title', 'أدخل عنوان الشهادة', 2),
(1, 'description', 'Description', 'وصف الشهادة', 'textarea', true, 'نقدم هذه الشهادة تقديرًا للجهود المتميزة', 'Enter description', 'أدخل وصف الشهادة', 3),
(1, 'issuer_name', 'Issuer Name', 'اسم المصدر', 'text', true, NULL, 'Enter issuer name', 'أدخل اسم المصدر', 4),
(1, 'issue_date', 'Issue Date', 'تاريخ الإصدار', 'date', true, NULL, 'Select date', 'اختر التاريخ', 5);

-- إضافة إعدادات النظام الأساسية
INSERT INTO "settings" ("key", "value", "category", "description")
VALUES 
('site_name', '{"ar": "منصة الشهادات والبطاقات الإلكترونية", "en": "Certificates Platform"}', 'general', 'اسم الموقع'),
('display_mode', '{"mode": "multi"}', 'display', 'نمط عرض القوالب (single/multi)'),
('analytics', '{"enable_tracking": true, "track_views": true, "track_shares": true}', 'analytics', 'إعدادات تحليلات الشهادات');

-- إضافة إعدادات SEO الافتراضية
INSERT INTO "seo" ("title", "description", "entity_type")
VALUES ('منصة الشهادات والبطاقات الإلكترونية', 'منصة لإنشاء وإدارة الشهادات والبطاقات الإلكترونية بسهولة وحرفية', 'global');

-- إنهاء الملف
-- تم إنشاء هذا الملف تلقائياً لمنصة الشهادات والبطاقات الإلكترونية