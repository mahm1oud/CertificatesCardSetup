import {
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  templates, type Template, type InsertTemplate,
  templateFields, type TemplateField, type InsertTemplateField,
  cards, type Card, type InsertCard,
  certificates, type Certificate, type InsertCertificate,
  fonts, type Font, type InsertFont,
  layers, type Layer, type InsertLayer,
  userLogos, type UserLogo, type InsertUserLogo,
  userSignatures, type UserSignature, type InsertUserSignature,
  templateLogos, type TemplateLogo, type InsertTemplateLogo,
  mediaFiles, type MediaFile, type InsertMediaFile
} from "@shared/schema";

import { db } from "./db";
import { eq, and, desc, sql, like, asc, ilike, or, isNull } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session, { Store } from "express-session";
import { pool } from "./db";
import { randomBytes } from "crypto";
import { formatISO } from "date-fns";
import { hashPassword } from "./auth";

// Session store setup
const PostgresSessionStore = connectPg(session);
const sessionStore = new PostgresSessionStore({ 
  pool: pool as any, 
  createTableIfMissing: false,
  tableName: 'session'
});

export interface IStorage {
  sessionStore: Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUserByProvider(provider: string, providerId: string): Promise<User | undefined>;

  // Category methods
  getAllCategories(options?: { active?: boolean }): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Template methods
  getAllTemplates(options?: { categoryId?: number; active?: boolean; limit?: number; offset?: number; search?: string }): Promise<{ templates: Template[]; total: number }>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, data: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<boolean>;

  // Template Field methods
  getTemplateFields(templateId: number): Promise<TemplateField[]>;
  getTemplateField(id: number): Promise<TemplateField | undefined>;
  createTemplateField(field: InsertTemplateField): Promise<TemplateField>;
  updateTemplateField(id: number, data: Partial<InsertTemplateField>): Promise<TemplateField | undefined>;
  deleteTemplateField(id: number): Promise<boolean>;

  // Card methods
  getAllCards(options?: { userId?: number; templateId?: number; limit?: number; offset?: number }): Promise<{ cards: Card[]; total: number }>;
  getCard(id: number): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: number, data: Partial<InsertCard>): Promise<Card | undefined>;
  deleteCard(id: number): Promise<boolean>;

  // Certificate methods
  getAllCertificates(options?: { userId?: number; templateId?: number; limit?: number; offset?: number }): Promise<{ certificates: Certificate[]; total: number }>;
  getCertificate(id: number): Promise<Certificate | undefined>;
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;
  updateCertificate(id: number, data: Partial<InsertCertificate>): Promise<Certificate | undefined>;
  deleteCertificate(id: number): Promise<boolean>;

  // Font methods
  getAllFonts(): Promise<Font[]>;
  getFont(id: number): Promise<Font | undefined>;
  createFont(font: InsertFont): Promise<Font>;
  updateFont(id: number, data: Partial<InsertFont>): Promise<Font | undefined>;
  deleteFont(id: number): Promise<boolean>;

  // Media methods
  getAllMediaFiles(options?: { userId?: number; type?: string; limit?: number; offset?: number }): Promise<{ files: MediaFile[]; total: number }>;
  getMediaFile(id: number): Promise<MediaFile | undefined>;
  createMediaFile(file: InsertMediaFile): Promise<MediaFile>;
  updateMediaFile(id: number, data: Partial<InsertMediaFile>): Promise<MediaFile | undefined>;
  deleteMediaFile(id: number): Promise<boolean>;

  // Logo methods
  getUserLogos(userId: number): Promise<UserLogo[]>;
  createUserLogo(logo: InsertUserLogo): Promise<UserLogo>;
  deleteUserLogo(id: number): Promise<boolean>;

  // Signature methods
  getUserSignatures(userId: number): Promise<UserSignature[]>;
  createUserSignature(signature: InsertUserSignature): Promise<UserSignature>;
  deleteUserSignature(id: number): Promise<boolean>;

  // Layer methods
  getTemplateLayers(templateId: number): Promise<Layer[]>;
  createLayer(layer: InsertLayer): Promise<Layer>;
  updateLayer(id: number, data: Partial<InsertLayer>): Promise<Layer | undefined>;
  deleteLayer(id: number): Promise<boolean>;

  // Template Logo methods
  getTemplateLogos(templateId: number): Promise<TemplateLogo[]>;
  createTemplateLogo(logo: InsertTemplateLogo): Promise<TemplateLogo>;
  deleteTemplateLogo(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;

  constructor() {
    this.sessionStore = sessionStore;
    this.initializeData();
  }

  private async initializeData() {
    try {
      // Check if categories exist
      const categoriesCount = await db.select({ count: sql<number>`count(*)` }).from(categories);
      if (categoriesCount[0].count === 0) {
        await this.createSampleCategories();
      }

      // Check if fonts exist
      const fontsCount = await db.select({ count: sql<number>`count(*)` }).from(fonts);
      if (fontsCount[0].count === 0) {
        await this.createSampleFonts();
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  }

  private async createSampleCategories() {
    const sampleCategories = [
      { name: "دعوات زفاف", slug: "wedding", description: "دعوات زفاف متنوعة", displayOrder: 1, icon: "💍", active: true },
      { name: "شهادات تقدير", slug: "appreciation", description: "شهادات تقدير وتكريم", displayOrder: 2, icon: "🏆", active: true },
      { name: "دبلومات", slug: "diplomas", description: "دبلومات وشهادات تخرج", displayOrder: 3, icon: "🎓", active: true },
      { name: "بطاقات معايدة", slug: "greeting", description: "بطاقات معايدة ومناسبات", displayOrder: 4, icon: "🎉", active: true },
      { name: "هويات شخصية", slug: "identity", description: "هويات وبطاقات شخصية", displayOrder: 5, icon: "🆔", active: true },
      { name: "دعوات مناسبات", slug: "events", description: "دعوات للمناسبات المختلفة", displayOrder: 6, icon: "🎊", active: true }
    ];

    for (const category of sampleCategories) {
      await db.insert(categories).values(category);
    }
  }

  private async createSampleFonts() {
    const sampleFonts = [
      { name: "Cairo", nameAr: "القاهرة", family: "Cairo, sans-serif", type: "google", url: "https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900&display=swap", active: true, isRtl: true, displayOrder: 1 },
      { name: "Amiri", nameAr: "أميري", family: "Amiri, serif", type: "google", url: "https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap", active: true, isRtl: true, displayOrder: 2 },
      { name: "Tajawal", nameAr: "تجوال", family: "Tajawal, sans-serif", type: "google", url: "https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap", active: true, isRtl: true, displayOrder: 3 }
    ];

    for (const font of sampleFonts) {
      await db.insert(fonts).values(font);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values(user).returning();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users).set(data).where(eq(users.id, id)).returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getUserByProvider(provider: string, providerId: string): Promise<User | undefined> {
    // This would need provider fields in the users table
    return undefined;
  }

  // Category methods
  async getAllCategories(options?: { active?: boolean }): Promise<Category[]> {
    try {
      let query = db.select().from(categories);
      
      if (options?.active !== undefined) {
        query = query.where(eq(categories.active, options.active)) as any;
      }
      
      const result = await query.orderBy(asc(categories.displayOrder));
      return result;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async getCategory(id: number): Promise<Category | undefined> {
    try {
      const [category] = await db.select().from(categories).where(eq(categories.id, id));
      return category;
    } catch (error) {
      console.error('Error getting category:', error);
      return undefined;
    }
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    try {
      const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
      return category;
    } catch (error) {
      console.error('Error getting category by slug:', error);
      return undefined;
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      const [newCategory] = await db.insert(categories).values(category).returning();
      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    try {
      const [updatedCategory] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      return undefined;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      await db.delete(categories).where(eq(categories.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  // Template methods
  async getAllTemplates(options?: { categoryId?: number; active?: boolean; limit?: number; offset?: number; search?: string }): Promise<{ templates: Template[]; total: number }> {
    try {
      let query = db.select().from(templates);
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(templates);

      const conditions = [];
      
      if (options?.categoryId) {
        conditions.push(eq(templates.categoryId, options.categoryId));
      }
      
      if (options?.active !== undefined) {
        conditions.push(eq(templates.active, options.active));
      }
      
      if (options?.search) {
        conditions.push(or(
          ilike(templates.title, `%${options.search}%`),
          ilike(templates.description, `%${options.search}%`)
        ));
      }

      if (conditions.length > 0) {
        const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];
        query = query.where(whereCondition) as any;
        countQuery = countQuery.where(whereCondition) as any;
      }

      const [totalResult] = await countQuery;
      const total = totalResult.count;

      query = query.orderBy(desc(templates.createdAt));

      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }
      
      if (options?.offset) {
        query = query.offset(options.offset) as any;
      }

      const templates_result = await query;
      
      return { templates: templates_result, total };
    } catch (error) {
      console.error('Error getting templates:', error);
      return { templates: [], total: 0 };
    }
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    try {
      const [template] = await db.select().from(templates).where(eq(templates.id, id));
      return template;
    } catch (error) {
      console.error('Error getting template:', error);
      return undefined;
    }
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    try {
      const [newTemplate] = await db.insert(templates).values(template).returning();
      return newTemplate;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  async updateTemplate(id: number, data: Partial<InsertTemplate>): Promise<Template | undefined> {
    try {
      const [updatedTemplate] = await db.update(templates).set(data).where(eq(templates.id, id)).returning();
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      return undefined;
    }
  }

  async deleteTemplate(id: number): Promise<boolean> {
    try {
      await db.delete(templates).where(eq(templates.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  // Template Field methods
  async getTemplateFields(templateId: number): Promise<TemplateField[]> {
    try {
      const fields = await db.select().from(templateFields)
        .where(eq(templateFields.templateId, templateId))
        .orderBy(asc(templateFields.displayOrder));
      return fields;
    } catch (error) {
      console.error('Error getting template fields:', error);
      return [];
    }
  }

  async getTemplateField(id: number): Promise<TemplateField | undefined> {
    try {
      const [field] = await db.select().from(templateFields).where(eq(templateFields.id, id));
      return field;
    } catch (error) {
      console.error('Error getting template field:', error);
      return undefined;
    }
  }

  async createTemplateField(field: InsertTemplateField): Promise<TemplateField> {
    try {
      const [newField] = await db.insert(templateFields).values(field).returning();
      return newField;
    } catch (error) {
      console.error('Error creating template field:', error);
      throw error;
    }
  }

  async updateTemplateField(id: number, data: Partial<InsertTemplateField>): Promise<TemplateField | undefined> {
    try {
      const [updatedField] = await db.update(templateFields).set(data).where(eq(templateFields.id, id)).returning();
      return updatedField;
    } catch (error) {
      console.error('Error updating template field:', error);
      return undefined;
    }
  }

  async deleteTemplateField(id: number): Promise<boolean> {
    try {
      await db.delete(templateFields).where(eq(templateFields.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting template field:', error);
      return false;
    }
  }

  // Card methods
  async getAllCards(options?: { userId?: number; templateId?: number; limit?: number; offset?: number }): Promise<{ cards: Card[]; total: number }> {
    try {
      let query = db.select().from(cards);
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(cards);

      const conditions = [];
      
      if (options?.userId) {
        conditions.push(eq(cards.userId, options.userId));
      }
      
      if (options?.templateId) {
        conditions.push(eq(cards.templateId, options.templateId));
      }

      if (conditions.length > 0) {
        const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];
        query = query.where(whereCondition) as any;
        countQuery = countQuery.where(whereCondition) as any;
      }

      const [totalResult] = await countQuery;
      const total = totalResult.count;

      query = query.orderBy(desc(cards.createdAt));

      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }
      
      if (options?.offset) {
        query = query.offset(options.offset) as any;
      }

      const cards_result = await query;
      
      return { cards: cards_result, total };
    } catch (error) {
      console.error('Error getting cards:', error);
      return { cards: [], total: 0 };
    }
  }

  async getCard(id: number): Promise<Card | undefined> {
    try {
      const [card] = await db.select().from(cards).where(eq(cards.id, id));
      return card;
    } catch (error) {
      console.error('Error getting card:', error);
      return undefined;
    }
  }

  async createCard(card: InsertCard): Promise<Card> {
    try {
      const [newCard] = await db.insert(cards).values(card).returning();
      return newCard;
    } catch (error) {
      console.error('Error creating card:', error);
      throw error;
    }
  }

  async updateCard(id: number, data: Partial<InsertCard>): Promise<Card | undefined> {
    try {
      const [updatedCard] = await db.update(cards).set(data).where(eq(cards.id, id)).returning();
      return updatedCard;
    } catch (error) {
      console.error('Error updating card:', error);
      return undefined;
    }
  }

  async deleteCard(id: number): Promise<boolean> {
    try {
      await db.delete(cards).where(eq(cards.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting card:', error);
      return false;
    }
  }

  // Certificate methods
  async getAllCertificates(options?: { userId?: number; templateId?: number; limit?: number; offset?: number }): Promise<{ certificates: Certificate[]; total: number }> {
    try {
      let query = db.select().from(certificates);
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(certificates);

      const conditions = [];
      
      if (options?.userId) {
        conditions.push(eq(certificates.userId, options.userId));
      }
      
      if (options?.templateId) {
        conditions.push(eq(certificates.templateId, options.templateId));
      }

      if (conditions.length > 0) {
        const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];
        query = query.where(whereCondition) as any;
        countQuery = countQuery.where(whereCondition) as any;
      }

      const [totalResult] = await countQuery;
      const total = totalResult.count;

      query = query.orderBy(desc(certificates.createdAt));

      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }
      
      if (options?.offset) {
        query = query.offset(options.offset) as any;
      }

      const certificates_result = await query;
      
      return { certificates: certificates_result, total };
    } catch (error) {
      console.error('Error getting certificates:', error);
      return { certificates: [], total: 0 };
    }
  }

  async getCertificate(id: number): Promise<Certificate | undefined> {
    try {
      const [certificate] = await db.select().from(certificates).where(eq(certificates.id, id));
      return certificate;
    } catch (error) {
      console.error('Error getting certificate:', error);
      return undefined;
    }
  }

  async createCertificate(certificate: InsertCertificate): Promise<Certificate> {
    try {
      const [newCertificate] = await db.insert(certificates).values(certificate).returning();
      return newCertificate;
    } catch (error) {
      console.error('Error creating certificate:', error);
      throw error;
    }
  }

  async updateCertificate(id: number, data: Partial<InsertCertificate>): Promise<Certificate | undefined> {
    try {
      const [updatedCertificate] = await db.update(certificates).set(data).where(eq(certificates.id, id)).returning();
      return updatedCertificate;
    } catch (error) {
      console.error('Error updating certificate:', error);
      return undefined;
    }
  }

  async deleteCertificate(id: number): Promise<boolean> {
    try {
      await db.delete(certificates).where(eq(certificates.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting certificate:', error);
      return false;
    }
  }

  // Font methods
  async getAllFonts(): Promise<Font[]> {
    try {
      const fonts_result = await db.select().from(fonts)
        .where(eq(fonts.active, true))
        .orderBy(asc(fonts.displayOrder));
      return fonts_result;
    } catch (error) {
      console.error('Error getting fonts:', error);
      return [];
    }
  }

  async getFont(id: number): Promise<Font | undefined> {
    try {
      const [font] = await db.select().from(fonts).where(eq(fonts.id, id));
      return font;
    } catch (error) {
      console.error('Error getting font:', error);
      return undefined;
    }
  }

  async createFont(font: InsertFont): Promise<Font> {
    try {
      const [newFont] = await db.insert(fonts).values(font).returning();
      return newFont;
    } catch (error) {
      console.error('Error creating font:', error);
      throw error;
    }
  }

  async updateFont(id: number, data: Partial<InsertFont>): Promise<Font | undefined> {
    try {
      const [updatedFont] = await db.update(fonts).set(data).where(eq(fonts.id, id)).returning();
      return updatedFont;
    } catch (error) {
      console.error('Error updating font:', error);
      return undefined;
    }
  }

  async deleteFont(id: number): Promise<boolean> {
    try {
      await db.delete(fonts).where(eq(fonts.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting font:', error);
      return false;
    }
  }

  // Media methods
  async getAllMediaFiles(options?: { userId?: number; type?: string; limit?: number; offset?: number }): Promise<{ files: MediaFile[]; total: number }> {
    try {
      let query = db.select().from(mediaFiles);
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(mediaFiles);

      const conditions = [];
      
      if (options?.userId) {
        conditions.push(eq(mediaFiles.userId, options.userId));
      }
      
      if (options?.type) {
        conditions.push(eq(mediaFiles.type, options.type));
      }

      if (conditions.length > 0) {
        const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];
        query = query.where(whereCondition) as any;
        countQuery = countQuery.where(whereCondition) as any;
      }

      const [totalResult] = await countQuery;
      const total = totalResult.count;

      query = query.orderBy(desc(mediaFiles.createdAt));

      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }
      
      if (options?.offset) {
        query = query.offset(options.offset) as any;
      }

      const files_result = await query;
      
      return { files: files_result, total };
    } catch (error) {
      console.error('Error getting media files:', error);
      return { files: [], total: 0 };
    }
  }

  async getMediaFile(id: number): Promise<MediaFile | undefined> {
    try {
      const [file] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, id));
      return file;
    } catch (error) {
      console.error('Error getting media file:', error);
      return undefined;
    }
  }

  async createMediaFile(file: InsertMediaFile): Promise<MediaFile> {
    try {
      const [newFile] = await db.insert(mediaFiles).values(file).returning();
      return newFile;
    } catch (error) {
      console.error('Error creating media file:', error);
      throw error;
    }
  }

  async updateMediaFile(id: number, data: Partial<InsertMediaFile>): Promise<MediaFile | undefined> {
    try {
      const [updatedFile] = await db.update(mediaFiles).set(data).where(eq(mediaFiles.id, id)).returning();
      return updatedFile;
    } catch (error) {
      console.error('Error updating media file:', error);
      return undefined;
    }
  }

  async deleteMediaFile(id: number): Promise<boolean> {
    try {
      await db.delete(mediaFiles).where(eq(mediaFiles.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting media file:', error);
      return false;
    }
  }

  // Logo methods
  async getUserLogos(userId: number): Promise<UserLogo[]> {
    try {
      const logos = await db.select().from(userLogos)
        .where(eq(userLogos.userId, userId))
        .orderBy(desc(userLogos.createdAt));
      return logos;
    } catch (error) {
      console.error('Error getting user logos:', error);
      return [];
    }
  }

  async createUserLogo(logo: InsertUserLogo): Promise<UserLogo> {
    try {
      const [newLogo] = await db.insert(userLogos).values(logo).returning();
      return newLogo;
    } catch (error) {
      console.error('Error creating user logo:', error);
      throw error;
    }
  }

  async deleteUserLogo(id: number): Promise<boolean> {
    try {
      await db.delete(userLogos).where(eq(userLogos.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user logo:', error);
      return false;
    }
  }

  // Signature methods
  async getUserSignatures(userId: number): Promise<UserSignature[]> {
    try {
      const signatures = await db.select().from(userSignatures)
        .where(eq(userSignatures.userId, userId))
        .orderBy(desc(userSignatures.createdAt));
      return signatures;
    } catch (error) {
      console.error('Error getting user signatures:', error);
      return [];
    }
  }

  async createUserSignature(signature: InsertUserSignature): Promise<UserSignature> {
    try {
      const [newSignature] = await db.insert(userSignatures).values(signature).returning();
      return newSignature;
    } catch (error) {
      console.error('Error creating user signature:', error);
      throw error;
    }
  }

  async deleteUserSignature(id: number): Promise<boolean> {
    try {
      await db.delete(userSignatures).where(eq(userSignatures.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user signature:', error);
      return false;
    }
  }

  // Layer methods
  async getTemplateLayers(templateId: number): Promise<Layer[]> {
    try {
      const layers_result = await db.select().from(layers)
        .where(eq(layers.templateId, templateId))
        .orderBy(asc(layers.zIndex));
      return layers_result;
    } catch (error) {
      console.error('Error getting template layers:', error);
      return [];
    }
  }

  async createLayer(layer: InsertLayer): Promise<Layer> {
    try {
      const [newLayer] = await db.insert(layers).values(layer).returning();
      return newLayer;
    } catch (error) {
      console.error('Error creating layer:', error);
      throw error;
    }
  }

  async updateLayer(id: number, data: Partial<InsertLayer>): Promise<Layer | undefined> {
    try {
      const [updatedLayer] = await db.update(layers).set(data).where(eq(layers.id, id)).returning();
      return updatedLayer;
    } catch (error) {
      console.error('Error updating layer:', error);
      return undefined;
    }
  }

  async deleteLayer(id: number): Promise<boolean> {
    try {
      await db.delete(layers).where(eq(layers.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting layer:', error);
      return false;
    }
  }

  // Template Logo methods
  async getTemplateLogos(templateId: number): Promise<TemplateLogo[]> {
    try {
      const logos = await db.select().from(templateLogos)
        .where(eq(templateLogos.templateId, templateId))
        .orderBy(desc(templateLogos.createdAt));
      return logos;
    } catch (error) {
      console.error('Error getting template logos:', error);
      return [];
    }
  }

  async createTemplateLogo(logo: InsertTemplateLogo): Promise<TemplateLogo> {
    try {
      const [newLogo] = await db.insert(templateLogos).values(logo).returning();
      return newLogo;
    } catch (error) {
      console.error('Error creating template logo:', error);
      throw error;
    }
  }

  async deleteTemplateLogo(id: number): Promise<boolean> {
    try {
      await db.delete(templateLogos).where(eq(templateLogos.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting template logo:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();