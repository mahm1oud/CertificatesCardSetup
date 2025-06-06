import { pgTable, text, serial, integer, boolean, timestamp, json, date, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema - المستخدمين
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // كلمة المرور إلزامية في البنية الحالية
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  isAdmin: boolean("is_admin").default(false),
  role: text("role").default("user"), // دور المستخدم: admin, user, moderator, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // الحقول التالية غير موجودة في بنية الجدول الحالية
  // يمكن إضافتها لاحقاً بعد ترقية قاعدة البيانات
  /*
  active: boolean("active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  profileImageUrl: text("profile_image_url"), // رابط صورة الملف الشخصي
  provider: text("provider"), // المزود (google, facebook, twitter, linkedin)
  providerId: text("provider_id"), // معرف المستخدم لدى المزود
  providerData: json("provider_data").default({}), // بيانات إضافية من المزود
  verifiedEmail: boolean("verified_email").default(false), // هل تم التحقق من البريد الإلكتروني
  locale: text("locale").default("ar"), // لغة المستخدم المفضلة
  */
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  isAdmin: true,
  role: true,
  // الحقول المعلقة في تعريف الجدول تم تعليقها هنا أيضًا
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Category schema - التصنيفات
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  icon: text("icon"), // Category icon
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  slug: true,
  description: true,
  displayOrder: true,
  icon: true,
  active: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Template schema - القوالب
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleAr: text("title_ar"), // Arabic title
  slug: text("slug").notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  displayOrder: integer("display_order").notNull().default(0),
  fields: json("fields").notNull().default([]).$type<string[]>(), // Fields that this template requires
  defaultValues: json("default_values").default({}), // Default values for fields
  settings: json("settings").default({}), // Font, color, position settings
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Layers schema - طبقات القوالب
export const layers = pgTable("layers", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => templates.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // text, image, shape, etc.
  properties: json("properties").notNull().default({}), // position, size, color, etc.
  content: text("content"), // text content if applicable
  zIndex: integer("z_index").notNull().default(0),
  required: boolean("required").default(false).notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Template Fields schema - حقول القوالب
export const templateFields = pgTable("template_fields", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => templates.id),
  name: text("name").notNull(),
  label: text("label").notNull(),
  labelAr: text("label_ar"), // النسخة العربية للتسمية
  type: text("type").notNull(), // text, number, date, select, static_text, static_image, etc.
  imageType: text("image_type"), // نوع الصورة إذا كان الحقل من نوع صورة
  required: boolean("required").default(false).notNull(),
  isStatic: boolean("is_static").default(false).notNull(), // حقل ثابت غير قابل للتحرير
  staticContent: text("static_content"), // المحتوى الثابت (نص أو رابط صورة)
  defaultValue: text("default_value"),
  placeholder: text("placeholder"),
  placeholderAr: text("placeholder_ar"), // النسخة العربية للنص التوضيحي
  options: json("options").default([]).$type<string[]>(), // options for select fields
  position: json("position").default({}), // موقع الحقل
  style: json("style").default({}), // نمط الحقل
  displayOrder: integer("display_order").notNull().default(0),
});

// User Logos schema - شعارات المستخدمين
export const userLogos = pgTable("user_logos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User Signatures schema - توقيعات المستخدمين
export const userSignatures = pgTable("user_signatures", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Template Logos schema - شعارات القوالب
export const templateLogos = pgTable("template_logos", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => templates.id),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  position: json("position").default({}).$type<{ x: number, y: number }>(), // position on the template
  zIndex: integer("z_index").notNull().default(0),
  required: boolean("required").default(false).notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cards schema - البطاقات
export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => templates.id),
  userId: integer("user_id").references(() => users.id),
  formData: json("form_data").notNull(),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastAccessed: timestamp("last_accessed"),
  quality: text("quality").default("medium"),
  publicId: text("public_id").unique(),
  accessCount: integer("access_count").default(0).notNull(),
  settings: json("settings").default({}),
  status: text("status").default("active").notNull(),
});

// Certificates schema - الشهادات
export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  templateId: integer("template_id").references(() => templates.id),
  title: text("title").notNull(),
  code: text("code").notNull().unique(),
  data: json("data").default({}), // field values
  imageUrl: text("image_url"),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// SEO schema - تحسين محركات البحث
export const seo = pgTable("seo", {
  id: serial("id").primaryKey(),
  path: text("path").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  keywords: text("keywords"),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Fonts schema
export const fonts = pgTable("fonts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  family: text("family").notNull(),
  type: text("type").default("sans-serif"),
  url: text("url").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  isRtl: boolean("is_rtl").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Settings schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  category: text("category").default("general").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Certificate Batches schema
export const certificateBatches = pgTable("certificate_batches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  templateId: integer("template_id").references(() => templates.id),
  status: text("status").default("draft").notNull(),
  totalItems: integer("total_items").default(0).notNull(),
  processedItems: integer("processed_items").default(0).notNull(),
  errorItems: integer("error_items").default(0).notNull(),
  data: json("data").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Certificate Batch Items schema
export const certificateBatchItems = pgTable("certificate_batch_items", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => certificateBatches.id),
  rowNumber: integer("row_number").default(0).notNull(),
  certificateId: integer("certificate_id").references(() => certificates.id),
  recipientName: text("recipient_name").notNull(),
  recipientEmail: text("recipient_email"),
  status: text("status").default("pending").notNull(),
  errorMessage: text("error_message"),
  data: json("data").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Export schemas
export const insertTemplateSchema = createInsertSchema(templates, {
  // إضافة قواعد التحقق المخصصة لبعض الحقول
  title: (schema) => schema.min(1, "عنوان القالب مطلوب"),
  categoryId: (schema) => schema.int("معرف التصنيف يجب أن يكون رقماً"), 
}).pick({
  title: true,
  titleAr: true,
  slug: true,
  categoryId: true,
  imageUrl: true,
  thumbnailUrl: true,
  displayOrder: true,
  fields: true,
  defaultValues: true,
  settings: true,
  active: true,
});

export const insertLayerSchema = createInsertSchema(layers).pick({
  templateId: true,
  name: true,
  type: true,
  properties: true,
  content: true,
  zIndex: true,
  required: true,
  displayOrder: true,
});

export const insertTemplateFieldSchema = createInsertSchema(templateFields).pick({
  templateId: true,
  name: true,
  label: true,
  labelAr: true,
  type: true,
  imageType: true,
  required: true,
  isStatic: true,
  staticContent: true,
  defaultValue: true,
  placeholder: true,
  placeholderAr: true,
  options: true,
  position: true,
  style: true,
  displayOrder: true,
});

export const insertUserLogoSchema = createInsertSchema(userLogos).pick({
  userId: true,
  name: true,
  imageUrl: true,
});

export const insertUserSignatureSchema = createInsertSchema(userSignatures).pick({
  userId: true,
  name: true,
  imageUrl: true,
});

export const insertTemplateLogoSchema = createInsertSchema(templateLogos).pick({
  templateId: true,
  name: true,
  imageUrl: true,
  position: true,
  zIndex: true,
  required: true,
  displayOrder: true,
});

export const insertCardSchema = createInsertSchema(cards).pick({
  userId: true,
  templateId: true,
  formData: true,
  imageUrl: true,
  thumbnailUrl: true,
  categoryId: true,
  quality: true,
  publicId: true,
  settings: true,
  status: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).pick({
  userId: true,
  templateId: true,
  title: true,
  code: true,
  data: true,
  imageUrl: true,
  isVerified: true,
});

export const insertSeoSchema = createInsertSchema(seo).pick({
  path: true,
  title: true,
  description: true,
  keywords: true,
  updatedBy: true,
});

// Types
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

export type InsertLayer = z.infer<typeof insertLayerSchema>;
export type Layer = typeof layers.$inferSelect;

export type InsertTemplateField = z.infer<typeof insertTemplateFieldSchema>;
export type TemplateField = typeof templateFields.$inferSelect;

export type InsertUserLogo = z.infer<typeof insertUserLogoSchema>;
export type UserLogo = typeof userLogos.$inferSelect;

export type InsertUserSignature = z.infer<typeof insertUserSignatureSchema>;
export type UserSignature = typeof userSignatures.$inferSelect;

export type InsertTemplateLogo = z.infer<typeof insertTemplateLogoSchema>;
export type TemplateLogo = typeof templateLogos.$inferSelect;

export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cards.$inferSelect;

export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;

export type InsertSeo = z.infer<typeof insertSeoSchema>;
export type Seo = typeof seo.$inferSelect;

export const insertFontSchema = createInsertSchema(fonts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertFont = z.infer<typeof insertFontSchema>;
export type Font = typeof fonts.$inferSelect;

// Media Files schema - ملفات الوسائط
export const mediaFiles = pgTable("media_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertMediaFileSchema = createInsertSchema(mediaFiles).pick({
  filename: true,
  originalName: true,
  url: true,
  thumbnailUrl: true,
  size: true,
  mimeType: true,
  userId: true
});

export type InsertMediaFile = z.infer<typeof insertMediaFileSchema>;
export type MediaFile = typeof mediaFiles.$inferSelect;

// Font styles table for predefined text effects
export const fontStyles = pgTable("font_styles", {
  id: serial("id").primaryKey(),
  fontId: integer("font_id").references(() => fonts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  cssProperties: json("css_properties").notNull(), // Store CSS properties as JSON
  previewImage: text("preview_image"), // URL to preview image
  displayOrder: integer("display_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tags table for hierarchical organization
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id"),
  color: text("color").default("#3b82f6"),
  icon: text("icon"), // Icon name from Lucide
  displayOrder: integer("display_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Add self-reference after table definition using a separate function
export const createTagsRelations = () => relations(tags, ({ one, many }) => ({
  parent: one(tags, { fields: [tags.parentId], references: [tags.id] }),
  children: many(tags),
}));

// Content library items
export const contentLibrary = pgTable("content_library", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  type: text("type").notNull(), // 'image', 'icon', 'emoji', 'background', 'frame', 'shape'
  category: text("category").notNull(), // 'photos', 'illustrations', 'vectors', etc.
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  width: integer("width"),
  height: integer("height"),
  description: text("description"),
  keywords: text("keywords").array(),
  properties: json("properties"), // Additional metadata as JSON
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(false),
  downloadCount: integer("download_count").default(0),
  featured: boolean("featured").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Junction table for content library tags
export const contentLibraryTags = pgTable("content_library_tags", {
  contentId: integer("content_id").references(() => contentLibrary.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").references(() => tags.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.contentId, table.tagId] }),
}));

// Define relationships
export const layersRelations = relations(layers, ({ one }) => ({
  template: one(templates, { fields: [layers.templateId], references: [templates.id] }),
}));

export const templateFieldsRelations = relations(templateFields, ({ one }) => ({
  template: one(templates, { fields: [templateFields.templateId], references: [templates.id] }),
}));

export const userLogosRelations = relations(userLogos, ({ one }) => ({
  user: one(users, { fields: [userLogos.userId], references: [users.id] }),
}));

export const userSignaturesRelations = relations(userSignatures, ({ one }) => ({
  user: one(users, { fields: [userSignatures.userId], references: [users.id] }),
}));

export const templateLogosRelations = relations(templateLogos, ({ one }) => ({
  template: one(templates, { fields: [templateLogos.templateId], references: [templates.id] }),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  user: one(users, { fields: [cards.userId], references: [users.id] }),
  template: one(templates, { fields: [cards.templateId], references: [templates.id] }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  user: one(users, { fields: [certificates.userId], references: [users.id] }),
  template: one(templates, { fields: [certificates.templateId], references: [templates.id] }),
}));

export const seoRelations = relations(seo, ({ one }) => ({
  user: one(users, { fields: [seo.updatedBy], references: [users.id] }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  category: one(categories, { fields: [templates.categoryId], references: [categories.id] }),
  layers: many(layers),
  fields: many(templateFields),
  logos: many(templateLogos),
  cards: many(cards),
  certificates: many(certificates),
}));

export const usersRelations = relations(users, ({ many }) => ({
  logos: many(userLogos),
  signatures: many(userSignatures),
  cards: many(cards),
  certificates: many(certificates),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  templates: many(templates),
}));

export const certificateBatchesRelations = relations(certificateBatches, ({ one, many }) => ({
  user: one(users, { fields: [certificateBatches.userId], references: [users.id] }),
  template: one(templates, { fields: [certificateBatches.templateId], references: [templates.id] }),
  items: many(certificateBatchItems),
}));

export const certificateBatchItemsRelations = relations(certificateBatchItems, ({ one }) => ({
  batch: one(certificateBatches, { fields: [certificateBatchItems.batchId], references: [certificateBatches.id] }),
  certificate: one(certificates, { fields: [certificateBatchItems.certificateId], references: [certificates.id] }),
}));

export const fontsRelations = relations(fonts, ({}) => ({}));

// Auth Settings schema
export const authSettings = pgTable("auth_settings", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().unique(),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  redirectUri: text("redirect_uri"),
  enabled: boolean("enabled").default(false).notNull(),
  settings: json("settings").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const authSettingsRelations = relations(authSettings, ({ one }) => ({
  updatedByUser: one(users, { fields: [authSettings.updatedBy], references: [users.id] }),
}));

// جدول الجلسات لإدارة جلسات المستخدمين
export const sessions = pgTable("session", {
  sid: text("sid").notNull().primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Certificate Views schema
export const certificateViews = pgTable("certificate_views", {
  id: serial("id").primaryKey(),
  certificateId: integer("certificate_id").notNull().references(() => certificates.id),
  ip: text("ip"),
  userAgent: text("user_agent"),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

export const certificateViewsRelations = relations(certificateViews, ({ one }) => ({
  certificate: one(certificates, { fields: [certificateViews.certificateId], references: [certificates.id] }),
}));

// Certificate Shares schema
export const certificateShares = pgTable("certificate_shares", {
  id: serial("id").primaryKey(),
  certificateId: integer("certificate_id").notNull().references(() => certificates.id),
  platform: text("platform"),
  ip: text("ip"),
  sharedAt: timestamp("shared_at").notNull().defaultNow(),
});

export const certificateSharesRelations = relations(certificateShares, ({ one }) => ({
  certificate: one(certificates, { fields: [certificateShares.certificateId], references: [certificates.id] }),
}));