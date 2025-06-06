import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processUploadedImage, generateThumbnails, getThumbnailUrl } from "./thumbnail-generator";
import { generateCardImage } from "./image-generator";
import path from "path";
import fs from "fs";
import { setupAuth, isAuthenticated, isAdmin, comparePasswords, hashPassword } from "./auth";
import { generateCertificateImage } from "./certificate-generator";
import { generateOptimizedCertificateImage } from "./optimized-image-generator";
import { processExcelBatch, generateVerificationCode } from "./batch-processor";
import { performDatabaseHealthCheck, attemptDatabaseRecovery } from "./lib/database-health";
import multer from "multer";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  insertCategorySchema,
  insertTemplateSchema,
  insertTemplateFieldSchema,
  insertFontSchema,
  insertMediaFileSchema,
  categories,
  mediaFiles
} from "@shared/schema";
import { db } from "./db";
import adminSettingsRouter from './api/admin-settings';
import authSettingsRouter from './api/auth-settings';
import adminStatsRouter from './api/admin-stats';
import cardsRouter from './api/cards';
import layersRouter from './api/layers';
import logosRouter from './api/logos';
import signaturesRouter from './api/signatures';
import healthCheckRouter from './api/health-check';
import adminMaintenanceRouter from './api/admin-maintenance';
import seoRouter from './api/seo-router';
import { getTemplateFields, updateTemplateFields, deleteTemplateField } from './api/template-fields';
// استيراد مسارات تحليلات الشهادات
import { setupCertificateAnalyticsRoutes } from './routes/certificate-analytics';
// استيراد مسارات تسجيل أخطاء العميل
import { setupClientErrorLoggerRoutes } from './routes/client-error-logger';

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup directory structure
  const uploadsDir = path.join(process.cwd(), "uploads");
  const tempDir = path.join(process.cwd(), "temp");
  
  // Create uploads directory for storing generated images if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Create temp directory for temporary files
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Servir archivos estáticos desde client/static
  const staticDir = path.join(process.cwd(), "client/static");
  if (fs.existsSync(staticDir)) {
    app.use('/static', express.static(staticDir, {
      setHeaders: (res, path) => {
        // Set correct MIME types for JavaScript files
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        }
      }
    }));
    console.log("Serving static files from:", staticDir);
  }
  
  /**
   * دالة مساعدة لتحليل بيانات JSON بشكل آمن
   * @param data البيانات المراد تحليلها
   * @param defaultValue القيمة الافتراضية في حال فشل التحليل
   * @returns البيانات المحللة أو القيمة الافتراضية
   */
  function parseJsonData(data: any, defaultValue: any): any {
    try {
      // إذا كان البيانات سلسلة نصية، حاول تحليلها
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      // إذا كان البيانات كائن، أرجعه كما هو
      else if (data && typeof data === 'object') {
        return data;
      }
      // في حال كانت البيانات غير محددة أو null، أرجع القيمة الافتراضية
      return defaultValue;
    } catch (error) {
      console.warn(`فشل تحليل البيانات JSON: ${error}`);
      return defaultValue;
    }
  }
  
  // Setup file upload middleware
  const multerStorage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, tempDir);
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });
  
  const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept images, excel files, csv files
    if (
      file.mimetype.startsWith('image/') || 
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/csv'
    ) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'));
    }
  };
  
  const upload = multer({ 
    storage: multerStorage, 
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    }
  });
  
  // Setup auth
  setupAuth(app);
  
  // مسار مؤقت لتحديث كلمة مرور مستخدم admin
  app.get('/api/reset-admin-password', async (req, res) => {
    try {
      // الحصول على المستخدم admin
      const admin = await storage.getUserByUsername('admin');
      if (!admin) {
        return res.status(404).json({ message: 'مستخدم admin غير موجود' });
      }
      
      // تشفير كلمة المرور الجديدة
      const hashedPassword = await hashPassword('700700');
      
      // تحديث كلمة المرور
      await storage.updateUser(admin.id, { password: hashedPassword });
      
      res.json({ success: true, message: 'تم تحديث كلمة مرور المستخدم admin' });
    } catch (error) {
      console.error('خطأ في تحديث كلمة المرور:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء تحديث كلمة المرور' });
    }
  });
  
  // ====================
  // PUBLIC API ENDPOINTS
  // ====================
  
  // API routes for categories (public)
  app.get("/api/categories", async (req, res) => {
    try {
      console.log("Fetching categories with options:", { 
        active: req.query.active 
      });
      
      const active = req.query.active === 'true' ? true : 
                     req.query.active === 'false' ? false : undefined;
                     
      // Debug log storage object and db connection
      console.log("Storage methods:", Object.keys(storage));
      
      try {
        // Log the first category as a test
        const testQuery = await db.select().from(categories).limit(1);
        console.log("Test query result:", JSON.stringify(testQuery));
      } catch (dbError) {
        console.error("Database test query failed:", dbError);
        if (dbError instanceof Error) console.error(dbError.stack);
      }
                     
      const categoriesData = await storage.getAllCategories({ active });
      res.json(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
      console.error(error instanceof Error ? error.stack : String(error));
      res.status(500).json({ message: "حدث خطأ أثناء تحميل التصنيفات" });
    }
  });

  // API routes for templates (public)
  app.get("/api/templates", async (req, res) => {
    try {
      console.log("Fetching templates with options:", { 
        active: req.query.active,
        limit: req.query.limit,
        offset: req.query.offset,
        search: req.query.search
      });
      
      const active = req.query.active === 'true' ? true : 
                     req.query.active === 'false' ? false : undefined;
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const search = req.query.search as string;
      
      console.log("Storage methods for templates:", typeof storage.getAllTemplates);
      
      const result = await storage.getAllTemplates({ active, limit, offset, search });
      res.json(result);
    } catch (error) {
      console.error("Error fetching templates:", error);
      console.error(error instanceof Error ? error.stack : String(error));
      res.status(500).json({ message: "حدث خطأ أثناء تحميل القوالب" });
    }
  });

  // Get templates by category (public)
  app.get("/api/categories/:slug/templates", async (req, res) => {
    try {
      const { slug } = req.params;
      const active = req.query.active === 'true' ? true : 
                     req.query.active === 'false' ? false : undefined;
                     
      const category = await storage.getCategoryBySlug(slug);
      
      if (!category) {
        return res.status(404).json({ message: "التصنيف غير موجود" });
      }
      
      const templates = await storage.getTemplatesByCategory(category.id, { active });
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates by category:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل القوالب" });
    }
  });

  // Get template by ID or slug (public)
  app.get("/api/templates/:category/:idOrSlug", async (req, res) => {
    try {
      const { category, idOrSlug } = req.params;
      console.log(`Looking for template: category=${category}, idOrSlug=${idOrSlug}`);
      
      let template;
      // Try to get template by ID first
      if (!isNaN(Number(idOrSlug))) {
        console.log(`Trying to get template by ID: ${idOrSlug}`);
        template = await storage.getTemplate(Number(idOrSlug));
      }
      
      // If not found, try by slug
      if (!template) {
        console.log(`Trying to get template by slug: category=${category}, slug=${idOrSlug}`);
        template = await storage.getTemplateBySlug(category, idOrSlug);
      }
      
      if (!template) {
        console.log(`Template not found: category=${category}, idOrSlug=${idOrSlug}`);
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      console.log(`Template found: ${template.title}, ID: ${template.id}`);
      
      
      // Get template fields
      const fields = await storage.getTemplateFields(template.id);
      
      res.json({ ...template, templateFields: fields });
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل القالب" });
    }
  });
  
  // Get template by just ID (for admin edit form)
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Looking for template with ID: ${id}`);
      
      const template = await storage.getTemplate(Number(id));
      
      if (!template) {
        console.log(`Template not found with ID: ${id}`);
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      console.log(`Template found: ${template.title}, ID: ${template.id}`);
      
      // Get template fields
      const fields = await storage.getTemplateFields(template.id);
      
      res.json({ ...template, templateFields: fields });
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل القالب" });
    }
  });

  // Get fonts (public)
  app.get("/api/fonts", async (req, res) => {
    try {
      const active = req.query.active === 'true' ? true : 
                    req.query.active === 'false' ? false : undefined;
      
      const fonts = await storage.getAllFonts({ active });
      res.json(fonts);
    } catch (error) {
      console.error("Error fetching fonts:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل الخطوط" });
    }
  });

  // Create a new card (public)
  app.post("/api/cards", async (req, res) => {
    try {
      const { templateId, formData, quality } = req.body;
      
      console.log(`Creating card with templateId: ${templateId}`);
      
      // Get the template
      const template = await storage.getTemplate(templateId);
      
      if (!template) {
        console.error(`Template with ID ${templateId} not found`);
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      console.log(`Found template: ${template.title}, image: ${template.imageUrl}`);
      
      // Get the category
      const category = await storage.getCategoryById(template.categoryId);
      
      if (!category) {
        console.error(`Category with ID ${template.categoryId} not found`);
        return res.status(404).json({ message: "التصنيف غير موجود" });
      }
      
      console.log(`Found category: ${category.name}`);
      console.log(`Generating card image with formData:`, formData);
      
      // Generate the card image using optimized generator
      let imagePath;
      try {
        // استخدام المولد المحسن الذي يدعم حقول الصور
        console.log(`Using optimized card image generator`);
        
        // استخراج حقول القالب من قاعدة البيانات
        const templateFields = await storage.getTemplateFields(template.id);
        console.log(`Fetched ${templateFields.length} template fields for template ID ${template.id}`);
        
        // توليد الصورة باستخدام المولد المحسّن
        imagePath = await import('./optimized-image-generator').then(({ generateOptimizedCardImage }) => {
          return generateOptimizedCardImage({
            templatePath: template.imageUrl,
            fields: templateFields,
            formData: formData,
            quality: quality || 'high'
          });
        });
        console.log(`Card image generated with optimized generator at: ${imagePath}`);
      } catch (optimizedGeneratorError) {
        console.error(`Error using optimized card generator:`, optimizedGeneratorError);
        
        // كخطة بديلة، استخدام المولد القديم
        console.log(`Falling back to legacy card generator`);
        imagePath = await generateCardImage(template, formData);
        console.log(`Card image generated with legacy generator at: ${imagePath}`);
      }
      console.log(`Card image generated at: ${imagePath}`);
      
      // Save the card to storage
      const card = await storage.createCard({
        templateId: template.id,
        userId: req.isAuthenticated() ? req.user.id : undefined,
        formData,
        imageUrl: `/uploads/${path.basename(imagePath)}`,
        categoryId: template.categoryId,
        quality: quality || 'medium',
        publicId: randomUUID(),
        status: 'active'
      });
      
      console.log(`Card created with ID: ${card.id}, publicId: ${card.publicId}`);
      res.json({ 
        cardId: card.id, 
        publicId: card.publicId,
        imageUrl: card.imageUrl 
      });
    } catch (error) {
      console.error("Error generating card:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء البطاقة" });
    }
  });
  
  // API endpoint for generating cards (used by template form)
  app.post("/api/cards/generate", upload.any(), async (req, res) => {
    try {
      console.log("Received card generation request:", req.body);
      
      // استخراج البيانات من طلب FormData أو JSON
      const templateId = req.body.templateId;
      const category = req.body.category;
      let formData = req.body.formData;
      const quality = req.body.quality || 'medium';
      
      // Validate required parameters
      if (!templateId) {
        console.error("Missing templateId in the request");
        return res.status(400).json({ message: "معرف القالب مفقود" });
      }
      
      // معالجة حالة تقديم النموذج باستخدام FormData
      if (!formData && Object.keys(req.body).length > 0) {
        // إذا كانت formData غير موجودة، قم بإنشاء كائن من البيانات المرسلة
        formData = {};
        
        // ابحث عن جميع الحقول التي ليست templateId, category, quality
        for (const key in req.body) {
          if (key !== 'templateId' && key !== 'category' && key !== 'quality' && key !== 'isPreview') {
            formData[key] = req.body[key];
          }
        }
        
        // معالجة الملفات المرفقة إذا كانت موجودة
        if (req.files && Array.isArray(req.files)) {
          console.log("Processing uploaded files:", req.files);
          
          for (const file of req.files as Express.Multer.File[]) {
            const fieldName = file.fieldname;
            
            // نقل الملف من المجلد المؤقت إلى مجلد التحميلات
            const targetPath = path.join(uploadsDir, file.filename);
            try {
              // التأكد من أن الملف موجود في المجلد المؤقت
              if (!fs.existsSync(file.path)) {
                console.error(`File not found at temp path: ${file.path}`);
                continue;
              }
              
              // نقل الملف من المجلد المؤقت إلى مجلد التحميلات
              fs.copyFileSync(file.path, targetPath);
              console.log(`File copied from ${file.path} to ${targetPath}`);
              
              // إضافة مسار الملف إلى بيانات النموذج
              formData[fieldName] = `/uploads/${file.filename}`;
              
              console.log(`File processed: ${fieldName}, path: /uploads/${file.filename}`);
            } catch (moveError) {
              console.error(`Error processing file ${fieldName}:`, moveError);
            }
          }
        }
      }
      
      if (!formData || (typeof formData === 'object' && Object.keys(formData).length === 0)) {
        console.error("Missing formData in the request");
        return res.status(400).json({ message: "بيانات النموذج مفقودة" });
      }
      
      console.log(`Generating card for template ID: ${templateId}, category: ${category}`);
      console.log(`Form data type: ${typeof formData} is array?`, Array.isArray(formData));
      
      try {
        // Get the template
        const template = await storage.getTemplate(Number(templateId));
        
        if (!template) {
          console.error(`Template with ID ${templateId} not found`);
          return res.status(404).json({ message: "القالب غير موجود" });
        }
        
        if (!template.imageUrl) {
          console.error(`Template with ID ${templateId} does not have an image URL`);
          return res.status(400).json({ message: "الصورة الأساسية للقالب غير متوفرة" });
        }
        
        console.log(`Found template: ${template.title}, image URL: ${template.imageUrl}`);
        
        // Parse form data if it's a string
        let parsedFormData = formData;
        if (typeof formData === 'string') {
          try {
            parsedFormData = JSON.parse(formData);
          } catch (parseError) {
            console.error("Error parsing form data JSON:", parseError);
            return res.status(400).json({ message: "صيغة بيانات النموذج غير صحيحة" });
          }
        }
        
        console.log(`Generating card with parsed formData:`, parsedFormData);
        
        // Generate the card image
        try {
          console.log(`Attempting to generate card image for template ID: ${template.id}, Title: ${template.title}`);
          console.log(`Template image URL: ${template.imageUrl}`);
          
          let imagePath;
          try {
            // إنشاء صورة البطاقة باستخدام المولد المحسن مع إعدادات الجودة
            const templateFields = await storage.getTemplateFields(template.id);
            console.log(`Fetched ${templateFields.length} template fields from database for template ID ${template.id}`);
            console.log(`Applying custom field positions and styles for ${templateFields.length} fields`);
            
            try {
              // استخراج إعدادات القالب إذا كانت متوفرة
              let templateSettings = template.settings || {};
              
              // إعدادات افتراضية إذا لم تكن موجودة
              const outputWidth = templateSettings.width ? parseInt(templateSettings.width) : 1200;
              const outputHeight = templateSettings.height ? parseInt(templateSettings.height) : 1600;
              const paperSize = templateSettings.paperSize || 'A4';
              const orientation = templateSettings.orientation || 'portrait';
              
              console.log(`Applying template settings: width=${outputWidth}, height=${outputHeight}, paperSize=${paperSize}, orientation=${orientation}`);
              
              // استخدام المولد المحسن بدلاً من المولد القديم
              imagePath = await import('./optimized-image-generator').then(({ generateOptimizedCardImage }) => {
                return generateOptimizedCardImage({
                  templatePath: template.imageUrl,
                  fields: templateFields,
                  formData: parsedFormData,
                  quality: quality as 'preview' | 'download' | 'low' | 'medium' | 'high',
                  outputWidth,
                  outputHeight,
                  outputFormat: 'png' // استخدام PNG للحفاظ على الشفافية وعدم ضغط الصورة
                });
              });
            } catch (optimizerError) {
              console.error("Error using optimized generator, falling back to standard:", optimizerError);
              imagePath = await generateCardImage(template, parsedFormData, quality as 'preview' | 'download' | 'low' | 'medium' | 'high');
            }
            
            console.log(`Card image successfully generated at: ${imagePath} with quality: ${quality}`);
          } catch (cardImageError) {
            console.error("Error in card image generation:", cardImageError);
            
            // إنشاء صورة بيضاء احتياطية بدلاً من الفشل
            console.log("Creating fallback white image due to generation error");
            const { createCanvas } = await import('canvas');
            const fs = await import('fs');
            const path = await import('path');
            const crypto = await import('crypto');
            
            // إنشاء كانفاس بخلفية بيضاء
            const canvas = createCanvas(1200, 1680);
            const ctx = canvas.getContext('2d');
            
            // خلفية بيضاء
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 1200, 1680);
            
            // إضافة نص صغير لتوضيح أن هذه صورة احتياطية
            ctx.fillStyle = '#cccccc';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('خطأ في تحميل صورة القالب', 600, 840);
            
            // حفظ الصورة
            const filename = `fallback_${crypto.randomBytes(8).toString("hex")}.png`;
            const outputPath = path.join(process.cwd(), "uploads", filename);
            
            // التأكد من وجود مجلد التحميل
            await fs.promises.mkdir(path.join(process.cwd(), 'uploads'), { recursive: true });
            
            const buffer = canvas.toBuffer("image/png");
            await fs.promises.writeFile(outputPath, buffer);
            
            imagePath = outputPath;
            console.log(`Created fallback image at: ${imagePath}`);
          }
          
          if (!imagePath) {
            throw new Error("Image generation did not return a valid file path");
          }
          
          // حفظ المعلومات بغض النظر عن نجاح إنشاء الصورة
          const card = await storage.createCard({
            templateId: template.id,
            userId: req.isAuthenticated() ? req.user?.id : null,
            formData: parsedFormData,
            imageUrl: imagePath.includes('/generated/') 
              ? `/uploads/generated/${path.basename(imagePath)}` 
              : `/uploads/${path.basename(imagePath)}`,
            categoryId: template.categoryId,
            quality,
            publicId: randomUUID(),
            status: 'active'
          });
          
          console.log(`Card created with ID: ${card.id}, publicId: ${card.publicId}`);
          res.json({
            cardId: card.id,
            publicId: card.publicId,
            imageUrl: card.imageUrl
          });
        } catch (imageError) {
          console.error("Error in card creation process:", imageError);
          return res.status(500).json({ 
            message: "حدث خطأ أثناء إنشاء البطاقة",
            details: typeof imageError === 'object' && imageError !== null ? imageError.message : String(imageError)
          });
        }
      } catch (dbError) {
        console.error("Database error while generating card:", dbError);
        return res.status(500).json({ 
          message: "حدث خطأ في قاعدة البيانات أثناء إنشاء البطاقة",
          details: dbError.message
        });
      }
    } catch (error) {
      console.error("Unexpected error generating card:", error);
      res.status(500).json({ 
        message: "حدث خطأ غير متوقع أثناء إنشاء البطاقة",
        details: error.message
      });
    }
  });

  // Get a card by public ID (public)
  app.get("/api/cards/public/:publicId", async (req, res) => {
    try {
      const { publicId } = req.params;
      const card = await storage.getCardByPublicId(publicId);
      
      if (!card) {
        return res.status(404).json({ message: "البطاقة غير موجودة" });
      }
      
      // Increment access count
      await storage.updateCard(card.id, {
        accessCount: (card.accessCount || 0) + 1,
        lastAccessed: new Date()
      });
      
      // Get the template
      const template = await storage.getTemplate(card.templateId);
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      res.json({ ...card, template });
    } catch (error) {
      console.error("Error fetching card:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل البطاقة" });
    }
  });
  
  // Get a card by ID
  app.get("/api/cards/:cardId", async (req, res) => {
    try {
      // ضبط رأس محتوى JSON
      res.setHeader('Content-Type', 'application/json');
      
      const { cardId } = req.params;
      console.log(`Fetching card with ID: ${cardId}`);
      
      if (isNaN(parseInt(cardId))) {
        return res.status(400).json({ message: "معرف البطاقة غير صالح" });
      }
      
      const card = await storage.getCard(parseInt(cardId));
      
      if (!card) {
        console.log(`Card with ID ${cardId} not found`);
        return res.status(404).json({ message: "البطاقة غير موجودة" });
      }
      
      // Get the template
      const template = await storage.getTemplate(card.templateId);
      const category = template ? await storage.getCategoryById(template.categoryId) : null;
      
      console.log(`Card found: ${card.id}, templateId: ${card.templateId}`);
      res.json({
        ...card,
        template: template ? {
          ...template,
          category
        } : null
      });
    } catch (error) {
      console.error("Error fetching card by ID:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل البطاقة" });
    }
  });

  // تنزيل البطاقة بجودة محددة
  app.post("/api/cards/:cardId/download", async (req, res) => {
    try {
      const { cardId } = req.params;
      const { quality = 'medium' } = req.body;
      
      console.log(`Generating download image for card ${cardId} with quality: ${quality}`);
      
      if (isNaN(parseInt(cardId))) {
        return res.status(400).json({ message: "معرف البطاقة غير صالح" });
      }
      
      // Get the card
      const card = await storage.getCard(parseInt(cardId));
      
      if (!card) {
        return res.status(404).json({ message: "البطاقة غير موجودة" });
      }
      
      // Get the template
      const template = await storage.getTemplate(card.templateId);
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      // الحصول على حقول القالب
      let templateFields = [];
      try {
        templateFields = await storage.getTemplateFields(template.id);
      } catch (error) {
        console.error(`Error fetching template fields for template ${template.id}:`, error);
      }
      
      // استخراج إعدادات القالب إذا كانت متوفرة
      let templateSettings = template.settings || {};
      
      // إعدادات افتراضية إذا لم تكن موجودة
      const outputWidth = templateSettings.width ? parseInt(templateSettings.width) : 1200;
      const outputHeight = templateSettings.height ? parseInt(templateSettings.height) : 1600;
      const paperSize = templateSettings.paperSize || 'A4';
      const orientation = templateSettings.orientation || 'portrait';
      
      console.log(`Applying template settings for download: width=${outputWidth}, height=${outputHeight}, paperSize=${paperSize}, orientation=${orientation}`);
      
      // توليد صورة بالجودة المطلوبة باستخدام بيانات البطاقة
      // توليد صورة بالجودة المطلوبة
      let generatedImagePath = '';
      
      try {
        // استخدام المولد المحسن أولاً
        generatedImagePath = await import('./optimized-image-generator').then(({ generateOptimizedCardImage }) => {
          return generateOptimizedCardImage({
            templatePath: template.imageUrl,
            fields: templateFields,
            formData: card.formData,
            quality: quality as 'download' | 'high',
            outputWidth,
            outputHeight,
            outputFormat: 'png' // استخدام PNG للحفاظ على الشفافية وعدم ضغط الصورة
          });
        });
      } catch (optimizerError) {
        console.error("Error using optimized generator for download, falling back to standard:", optimizerError);
        // استخدام المولد القديم كخيار احتياطي
        generatedImagePath = await generateCardImage(
          { ...template, templateFields }, 
          card.formData, 
          quality
        );
      }
      
      // تأكد من قيمة مسار الصورة المولدة
      if (!generatedImagePath) {
        throw new Error("Failed to generate image path");
      }
      
      // تحويل المسار النسبي إلى مسار كامل للـURL
      let imageUrl = generatedImagePath.replace(process.cwd(), '').split(path.sep).join('/');
      
      // التأكد من أن المسار يتضمن مجلد generated إذا كان المسار الأصلي يتضمنه
      if (generatedImagePath.includes('/generated/') && !imageUrl.includes('/generated/')) {
        imageUrl = imageUrl.replace('/uploads/', '/uploads/generated/');
      }
      
      console.log(`Generated download image at: ${imageUrl} with quality: ${quality}`);
      
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error generating card image for download:", error);
      res.status(500).json({ message: "حدث خطأ أثناء توليد الصورة" });
    }
  });

  // Update card status (draft, active, saved)
  app.patch("/api/cards/:cardId", async (req, res) => {
    try {
      const { cardId } = req.params;
      const { status, isPreview, quality } = req.body;
      
      console.log(`Updating card ${cardId} with status: ${status}, isPreview: ${isPreview}, quality: ${quality}`);
      
      if (isNaN(parseInt(cardId))) {
        return res.status(400).json({ message: "معرف البطاقة غير صالح" });
      }
      
      // Get the card to verify it exists
      const card = await storage.getCard(parseInt(cardId));
      
      if (!card) {
        console.log(`Card with ID ${cardId} not found`);
        return res.status(404).json({ message: "البطاقة غير موجودة" });
      }
      
      // Prepare update data
      const updateData: any = {};
      
      // Add fields that need to be updated
      if (status) {
        updateData.status = status;
      }
      
      if (isPreview !== undefined) {
        // If card is no longer a preview and user is logged in, assign ownership
        if (isPreview === false && req.isAuthenticated()) {
          updateData.userId = req.user?.id;
        }
      }
      
      if (quality) {
        updateData.quality = quality;
      }
      
      // Update the card
      const updatedCard = await storage.updateCard(parseInt(cardId), updateData);
      
      if (!updatedCard) {
        return res.status(500).json({ message: "تعذر تحديث البطاقة" });
      }
      
      console.log(`Card ${cardId} updated successfully:`, updateData);
      
      res.json(updatedCard);
    } catch (error) {
      console.error("Error updating card:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث البطاقة" });
    }
  });

  // Create a new certificate (public)
  // API endpoint for generating certificates (used by certificate form)
  app.post("/api/certificates/generate", async (req, res) => {
    try {
      const { templateId, formData } = req.body;
      
      console.log(`Generating certificate for template ID: ${templateId}`);
      
      // Get the template
      const template = await storage.getTemplate(Number(templateId));
      
      if (!template) {
        console.error(`Template with ID ${templateId} not found`);
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      console.log(`Found template: ${template.title}`);
      console.log(`Generating certificate with formData:`, formData);
      
      // Generate the certificate image using optimized generator
      let imagePath;
      try {
        // استخدام المولد المحسن الذي يدعم حقول الصور
        imagePath = await generateOptimizedCertificateImage(template, formData);
        console.log(`Certificate image generated with optimized generator at: ${imagePath}`);
      } catch (optimizedGeneratorError) {
        console.error(`Error using optimized certificate generator:`, optimizedGeneratorError);
        
        // كخطة بديلة، استخدام المولد القديم
        console.log(`Falling back to legacy certificate generator`);
        imagePath = await generateCertificateImage(template, formData);
        console.log(`Certificate image generated with legacy generator at: ${imagePath}`);
      }
      
      console.log(`Final certificate image path: ${imagePath}`);
      
      // Extract values from formData
      const certificateType = formData.certificateType || template.certificateType || 'appreciation';
      const issuedTo = formData.issuedTo;
      const issuedToGender = formData.issuedToGender || 'male';
      
      // Save the certificate to storage
      const certificate = await storage.createCertificate({
        templateId: template.id,
        userId: req.isAuthenticated() ? req.user?.id : undefined,
        formData,
        imageUrl: imagePath.includes('/generated/') 
          ? `/uploads/generated/${path.basename(imagePath)}` 
          : `/uploads/${path.basename(imagePath)}`,
        certificateType,
        title: formData.title || template.title,
        titleAr: formData.titleAr || template.titleAr,
        issuedTo,
        issuedToGender,
        status: 'active',
        verificationCode: generateVerificationCode(),
        publicId: randomUUID(),
      });
      
      console.log(`Certificate created with ID: ${certificate.id}`);
      res.json({ 
        certificateId: certificate.id,
        publicId: certificate.publicId,
        imageUrl: certificate.imageUrl 
      });
    } catch (error) {
      console.error("Error generating certificate:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء الشهادة" });
    }
  });

  app.post("/api/certificates", async (req, res) => {
    try {
      const { templateId, formData, certificateType, issuedTo, issuedToGender } = req.body;
      
      // Get the template
      const template = await storage.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      // Generate the certificate image using optimized generator
      let imagePath;
      try {
        // استخدام المولد المحسن الذي يدعم حقول الصور
        imagePath = await generateOptimizedCertificateImage(template, formData);
        console.log(`Certificate image generated with optimized generator at: ${imagePath}`);
      } catch (optimizedGeneratorError) {
        console.error(`Error using optimized certificate generator:`, optimizedGeneratorError);
        
        // كخطة بديلة، استخدام المولد القديم
        console.log(`Falling back to legacy certificate generator`);
        imagePath = await generateCertificateImage(template, formData);
        console.log(`Certificate image generated with legacy generator at: ${imagePath}`);
      }
      
      // Save the certificate to storage
      const certificate = await storage.createCertificate({
        templateId: template.id,
        userId: req.isAuthenticated() ? req.user?.id : undefined,
        formData,
        imageUrl: imagePath.includes('/generated/') 
          ? `/uploads/generated/${path.basename(imagePath)}` 
          : `/uploads/${path.basename(imagePath)}`,
        certificateType: certificateType || 'appreciation',
        title: formData.title || template.title,
        titleAr: formData.titleAr || template.titleAr,
        issuedTo,
        issuedToGender: issuedToGender || 'male',
        status: 'active',
        verificationCode: generateVerificationCode(),
        publicId: randomUUID()
      });
      
      res.json({ certificateId: certificate.id, publicId: certificate.publicId });
    } catch (error) {
      console.error("Error generating certificate:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء الشهادة" });
    }
  });

  // Get a certificate by public ID (public)
  app.get("/api/certificates/public/:publicId", async (req, res) => {
    try {
      const { publicId } = req.params;
      const certificate = await storage.getCertificateByPublicId(publicId);
      
      if (!certificate) {
        return res.status(404).json({ message: "الشهادة غير موجودة" });
      }
      
      // Get the template
      const template = await storage.getTemplate(certificate.templateId);
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      res.json({ ...certificate, template });
    } catch (error) {
      console.error("Error fetching certificate:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل الشهادة" });
    }
  });

  // Verify a certificate (public)
  app.get("/api/certificates/verify/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const certificate = await storage.getCertificateByVerificationCode(code);
      
      if (!certificate) {
        return res.status(404).json({ 
          valid: false,
          message: "رمز التحقق غير صالح"
        });
      }
      
      // Check if expired
      if (certificate.expiryDate && new Date(certificate.expiryDate) < new Date()) {
        return res.json({ 
          valid: false,
          message: "انتهت صلاحية الشهادة",
          certificate
        });
      }
      
      // Check if revoked
      if (certificate.status === 'revoked') {
        return res.json({ 
          valid: false,
          message: "تم إلغاء الشهادة",
          certificate
        });
      }
      
      res.json({ 
        valid: true,
        certificate
      });
    } catch (error) {
      console.error("Error verifying certificate:", error);
      res.status(500).json({ message: "حدث خطأ أثناء التحقق من الشهادة" });
    }
  });

  // ========================
  // AUTHENTICATED API ROUTES
  // ========================
  
  // Get user cards
  app.get("/api/user/cards", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      
      const result = await storage.getUserCards(req.user.id, { limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Error fetching user cards:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل البطاقات" });
    }
  });

  // Get user certificates
  app.get("/api/user/certificates", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const type = req.query.type as string;
      
      const result = await storage.getUserCertificates(req.user.id, { limit, offset, type });
      res.json(result);
    } catch (error) {
      console.error("Error fetching user certificates:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل الشهادات" });
    }
  });

  // Get user certificate batches
  app.get("/api/user/certificate-batches", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      
      const result = await storage.getUserCertificateBatches(req.user.id, { limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Error fetching user certificate batches:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل مجموعات الشهادات" });
    }
  });

  // Create a certificate batch
  app.post("/api/certificate-batches", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const { templateId, title } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "يرجى تحميل ملف Excel أو CSV" });
      }
      
      // Get the template
      const template = await storage.getTemplate(parseInt(templateId));
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      // Create the batch
      const batch = await storage.createCertificateBatch({
        userId: req.user.id,
        templateId: template.id,
        title: title || `مجموعة شهادات ${(new Date()).toLocaleDateString('ar-SA')}`,
        status: 'pending',
        totalItems: 0,
        processedItems: 0,
        sourceType: path.extname(req.file.originalname).toLowerCase() === '.csv' ? 'csv' : 'excel',
        sourceData: req.file.path
      });
      
      // Process the batch asynchronously
      processExcelBatch(batch.id, req.file.path, template);
      
      res.json({ batchId: batch.id });
    } catch (error) {
      console.error("Error creating certificate batch:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء مجموعة الشهادات" });
    }
  });

  // Get batch items
  app.get("/api/certificate-batches/:id/items", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const status = req.query.status as string;
      
      const batch = await storage.getCertificateBatch(parseInt(id));
      
      if (!batch) {
        return res.status(404).json({ message: "مجموعة الشهادات غير موجودة" });
      }
      
      // Check if user owns the batch
      if (batch.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "غير مصرح لك بالوصول إلى هذه المجموعة" });
      }
      
      const result = await storage.getBatchItems(batch.id, { limit, offset, status });
      res.json(result);
    } catch (error) {
      console.error("Error fetching batch items:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل عناصر المجموعة" });
    }
  });

  // Update user profile
  app.put("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const { name, email } = req.body;
      
      // Check if email is already taken
      if (email && email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
        }
      }
      
      const updatedUser = await storage.updateUser(req.user.id, { name, email });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث الملف الشخصي" });
    }
  });

  // Change password
  app.post("/api/user/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Get user with password
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      // Verify current password
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ message: "كلمة المرور الحالية غير صحيحة" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password
      await storage.updateUser(user.id, { password: hashedPassword });
      
      res.json({ message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تغيير كلمة المرور" });
    }
  });

  // ====================
  // ADMIN API ENDPOINTS
  // ====================

  // Get all users (admin only)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const search = req.query.search as string;
      
      const result = await storage.getAllUsers({ limit, offset, search });
      
      // Remove passwords from response
      const usersWithoutPasswords = result.users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json({ users: usersWithoutPasswords, total: result.total });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل المستخدمين" });
    }
  });

  // Category CRUD operations (admin only)
  app.post("/api/admin/categories", isAdmin, async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة", 
          errors: error.errors 
        });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء التصنيف" });
    }
  });

  app.put("/api/admin/categories/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.updateCategory(parseInt(id), req.body);
      
      if (!category) {
        return res.status(404).json({ message: "التصنيف غير موجود" });
      }
      
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث التصنيف" });
    }
  });

  app.delete("/api/admin/categories/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCategory(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "التصنيف غير موجود" });
      }
      
      res.json({ message: "تم حذف التصنيف بنجاح" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف التصنيف" });
    }
  });

  // Template CRUD operations (admin only)
  app.post("/api/admin/templates", isAdmin, upload.single('image'), async (req, res) => {
    try {
      console.log("🔄 استلام طلب إنشاء قالب جديد");
      
      if (!req.body.templateData) {
        console.error("❌ بيانات القالب مفقودة في الطلب");
        return res.status(400).json({ message: "بيانات القالب مفقودة" });
      }
      
      let templateData;
      try {
        templateData = JSON.parse(req.body.templateData);
        console.log("✅ تم تحليل بيانات القالب بنجاح:", {
          title: templateData.title,
          categoryId: templateData.categoryId,
          // لا نعرض كامل البيانات في السجل لتجنب الإطالة
        });
      } catch (error) {
        console.error("❌ خطأ في تحليل بيانات القالب:", error);
        console.error("البيانات الخام المستلمة:", req.body.templateData);
        return res.status(400).json({ message: "خطأ في تنسيق بيانات القالب" });
      }
      
      // إجراء عمليات التحقق من البيانات الأساسية
      if (!templateData.title) {
        console.error("❌ عنوان القالب مفقود");
        return res.status(400).json({ message: "عنوان القالب مطلوب" });
      }
      
      if (!templateData.categoryId) {
        console.error("❌ معرف التصنيف مفقود");
        return res.status(400).json({ message: "تصنيف القالب مطلوب" });
      }
      
      // تحويل categoryId إلى رقم إذا كان نصاً
      if (typeof templateData.categoryId === 'string') {
        templateData.categoryId = parseInt(templateData.categoryId, 10);
        console.log(`🔄 تم تحويل معرف التصنيف من نص إلى رقم: ${templateData.categoryId}`);
      }
      
      // معالجة ملف الصورة المرفق
      if (req.file) {
        console.log(`✅ تم استلام ملف صورة: ${req.file.originalname} (${req.file.size} بايت)`);
        
        // نقل الملف المرفوع إلى مجلد التحميلات
        const filename = path.basename(req.file.path);
        const targetPath = path.join(uploadsDir, filename);
        
        try {
          fs.copyFileSync(req.file.path, targetPath);
          fs.unlinkSync(req.file.path); // إزالة الملف المؤقت
          console.log(`✅ تم نقل الصورة إلى: ${targetPath}`);
          
          templateData.imageUrl = `/uploads/${filename}`;
        } catch (fileError) {
          console.error(`❌ خطأ في معالجة ملف الصورة:`, fileError);
          return res.status(500).json({ message: "حدث خطأ أثناء معالجة ملف الصورة" });
        }
      } else if (!templateData.imageUrl) {
        console.error("❌ لم يتم توفير صورة للقالب");
        return res.status(400).json({ message: "يجب توفير صورة للقالب" });
      }
      
      // إرسال البيانات إلى الـ schema للتحقق منها
      try {
        console.log("🔄 التحقق من صحة بيانات القالب...");
        
        // معالجة الحقول التي يتم إنشاؤها تلقائياً
        // بدلاً من حذف الحقول، دعنا نتأكد من أنها تحمل قيماً افتراضية مناسبة
        if (!templateData.slug || templateData.slug.trim() === '') {
          // تعيين slug مؤقت - سيتم تجاهله وإنشاء واحد جديد في storage.createTemplate
          templateData.slug = 'temp-' + Date.now(); 
          console.log("🔄 تم تعيين slug مؤقت:", templateData.slug);
        }
        
        if (!templateData.displayOrder || templateData.displayOrder <= 0) {
          // تعيين قيمة افتراضية للـ displayOrder - سيتم تحديثها في storage.createTemplate
          templateData.displayOrder = 1;
          console.log("🔄 تم تعيين قيمة مؤقتة لـ displayOrder:", templateData.displayOrder);
        }
        
        // ضمان وجود الحقول المطلوبة بتنسيق صحيح
        templateData.fields = templateData.fields || [];
        templateData.defaultValues = templateData.defaultValues || {};
        templateData.settings = templateData.settings || {};
        templateData.active = templateData.active !== false; // افتراضياً نشط
        
        const validatedData = insertTemplateSchema.parse(templateData);
        console.log("✅ تم التحقق من صحة البيانات بنجاح");
        
        // إنشاء القالب
        console.log("🔄 جاري إنشاء القالب في قاعدة البيانات...");
        const template = await storage.createTemplate(validatedData);
        console.log(`✅ تم إنشاء القالب بنجاح. معرف القالب: ${template.id}`);
        
        // إنشاء حقول القالب إذا تم توفيرها
        if (templateData.templateFields && Array.isArray(templateData.templateFields)) {
          console.log(`🔄 جاري إنشاء ${templateData.templateFields.length} حقل للقالب...`);
          for (const field of templateData.templateFields) {
            await storage.createTemplateField({
              ...field,
              templateId: template.id
            });
          }
          console.log("✅ تم إنشاء جميع حقول القالب بنجاح");
        }
        
        console.log(`✅ تمت عملية إنشاء القالب "${template.title}" بنجاح`);
        res.status(201).json(template);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error("❌ خطأ في التحقق من صحة البيانات:", validationError.errors);
          return res.status(400).json({ 
            message: "بيانات غير صالحة", 
            errors: validationError.errors 
          });
        }
        
        console.error("❌ خطأ أثناء إنشاء القالب:", validationError);
        res.status(500).json({ message: "حدث خطأ أثناء إنشاء القالب" });
      }
    } catch (error) {
      console.error("❌ خطأ عام أثناء معالجة طلب إنشاء القالب:", error);
      res.status(500).json({ message: "حدث خطأ أثناء معالجة الطلب" });
    }
  });

  app.put("/api/admin/templates/:id", isAdmin, upload.single('image'), async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!req.body.templateData) {
        console.error("Missing templateData in request");
        return res.status(400).json({ message: "بيانات القالب مفقودة" });
      }
      
      let templateData;
      try {
        templateData = JSON.parse(req.body.templateData);
      } catch (error) {
        console.error("Error parsing templateData:", error, "Raw templateData:", req.body.templateData);
        return res.status(400).json({ message: "خطأ في تنسيق بيانات القالب" });
      }
      
      if (req.file) {
        // Move the uploaded file to the uploads directory
        const filename = path.basename(req.file.path);
        const targetPath = path.join(uploadsDir, filename);
        
        fs.copyFileSync(req.file.path, targetPath);
        fs.unlinkSync(req.file.path); // Remove the temp file
        
        templateData.imageUrl = `/uploads/${filename}`;
      }
      
      // Validate the template data before updating
      try {
        insertTemplateSchema.parse(templateData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Validation error:", error.errors);
          return res.status(400).json({ 
            message: "بيانات غير صالحة", 
            errors: error.errors 
          });
        }
        throw error;
      }
      
      const template = await storage.updateTemplate(parseInt(id), templateData);
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      // Update template fields if provided
      if (templateData.templateFields && Array.isArray(templateData.templateFields)) {
        // Delete existing fields and create new ones
        for (const field of templateData.templateFields) {
          if (field.id) {
            // Update existing field
            await storage.updateTemplateField(field.id, field);
          } else {
            // Create new field
            await storage.createTemplateField({
              ...field,
              templateId: template.id
            });
          }
        }
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث القالب" });
    }
  });

  app.delete("/api/admin/templates/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTemplate(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      res.json({ message: "تم حذف القالب بنجاح" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف القالب" });
    }
  });
  
  // API endpoints for managing static fields in templates
  app.get("/api/admin/templates/:templateId/static-fields", isAdmin, async (req, res) => {
    try {
      const { templateId } = req.params;
      const fields = await storage.getTemplateFields(parseInt(templateId));
      const staticFields = fields.filter(field => field.isStatic);
      res.json(staticFields);
    } catch (error) {
      console.error("Error fetching static fields:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب الحقول الثابتة" });
    }
  });

  app.post("/api/admin/templates/:templateId/static-fields", isAdmin, async (req, res) => {
    try {
      const { templateId } = req.params;
      const fieldData = {
        ...req.body,
        templateId: parseInt(templateId),
        isStatic: true
      };

      const field = await storage.createTemplateField(fieldData);
      res.json(field);
    } catch (error) {
      console.error("Error creating static field:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء الحقل الثابت" });
    }
  });

  app.put("/api/admin/templates/:templateId/static-fields/:fieldId", isAdmin, async (req, res) => {
    try {
      const { fieldId } = req.params;
      const updatedField = await storage.updateTemplateField(parseInt(fieldId), {
        ...req.body,
        isStatic: true
      });
      
      if (!updatedField) {
        return res.status(404).json({ message: "الحقل غير موجود" });
      }
      
      res.json(updatedField);
    } catch (error) {
      console.error("Error updating static field:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث الحقل الثابت" });
    }
  });

  app.delete("/api/admin/templates/:templateId/static-fields/:fieldId", isAdmin, async (req, res) => {
    try {
      const { fieldId } = req.params;
      const success = await storage.deleteTemplateField(parseInt(fieldId));
      
      if (!success) {
        return res.status(404).json({ message: "الحقل غير موجود" });
      }
      
      res.json({ message: "تم حذف الحقل الثابت بنجاح" });
    } catch (error) {
      console.error("Error deleting static field:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف الحقل الثابت" });
    }
  });

  // إضافة مسار عام للوصول إلى حقول القالب بدون مصادقة (لعرض البطاقة)
  // مسار API عام لحقول القالب للاستخدام في معاينة البطاقة
  app.get("/api/templates/:templateId/public-fields", async (req, res) => {
    try {
      const { templateId } = req.params;
      const template = await storage.getTemplate(parseInt(templateId));
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      const fields = await storage.getTemplateFields(parseInt(templateId));
      console.log(`Retrieved ${fields.length} fields for template ID ${templateId} (public API)`);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching template fields:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل حقول القالب" });
    }
  });
  
  // API لجلب حقول القالب (عام)
  app.get("/api/templates/:templateId/fields", async (req, res) => {
    try {
      const { templateId } = req.params;
      const template = await storage.getTemplate(parseInt(templateId));
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      const fields = await storage.getTemplateFields(parseInt(templateId));
      console.log(`Retrieved ${fields.length} fields for template ID ${templateId} (public API)`);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching template fields:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل حقول القالب" });
    }
  });

  // API لنسخ حقول القالب
  app.post("/api/templates/:id/copy-fields", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const sourceTemplateId = parseInt(id);
      const { targetTemplateId } = req.body;
      
      if (!targetTemplateId) {
        return res.status(400).json({ message: "معرف القالب الهدف مطلوب" });
      }
      
      // التحقق من وجود القالب المصدر
      const sourceTemplate = await storage.getTemplate(sourceTemplateId);
      if (!sourceTemplate) {
        return res.status(404).json({ message: "قالب المصدر غير موجود" });
      }
      
      // التحقق من وجود القالب الهدف
      const targetTemplate = await storage.getTemplate(targetTemplateId);
      if (!targetTemplate) {
        return res.status(404).json({ message: "قالب الهدف غير موجود" });
      }
      
      // جلب حقول القالب المصدر
      const sourceFields = await storage.getTemplateFields(sourceTemplateId);
      if (!sourceFields.length) {
        return res.status(404).json({ message: "لا توجد حقول للنسخ من قالب المصدر" });
      }
      
      // نسخ كل حقل إلى القالب الهدف
      const copiedFields = [];
      
      for (const field of sourceFields) {
        const { id: fieldId, templateId, ...fieldData } = field;
        
        // إنشاء حقل جديد باستخدام البيانات من الحقل المصدر
        // تحويل البيانات غير المعروفة إلى نسق JSON لتناسب الـ schema
        const safeFieldData = {
          name: fieldData.name,
          label: fieldData.label,
          labelAr: fieldData.labelAr,
          type: fieldData.type || 'text',
          required: Boolean(fieldData.required),
          defaultValue: fieldData.defaultValue,
          placeholder: fieldData.placeholder,
          placeholderAr: fieldData.placeholderAr,
          options: parseJsonData(fieldData.options, []),
          position: parseJsonData(fieldData.position, { x: 50, y: 50 }),
          style: parseJsonData(fieldData.style, {
            fontFamily: 'Cairo',
            fontSize: 24,
            fontWeight: 'normal',
            color: '#000000',
            align: 'center',
            verticalPosition: 'middle'
          }),
          displayOrder: fieldData.displayOrder || 0,
          templateId: targetTemplateId
        };
        
        const newField = await storage.createTemplateField(safeFieldData);
        
        copiedFields.push(newField);
      }
      
      res.status(200).json({
        message: "تم نسخ الحقول بنجاح",
        count: copiedFields.length,
        fields: copiedFields
      });
    } catch (error) {
      console.error("Error copying template fields:", error);
      res.status(500).json({ message: "حدث خطأ أثناء نسخ حقول القالب" });
    }
  });

  // Template Fields CRUD operations (admin only)
  // Get template fields by template ID or all fields
  app.get("/api/admin/template-fields", isAdmin, async (req, res) => {
    try {
      const { templateId } = req.query;
      
      // If templateId is provided, get fields for that template
      if (templateId) {
        const fields = await storage.getTemplateFields(parseInt(templateId as string));
        console.log(`Retrieved ${fields.length} fields for template ID ${templateId}`);
        return res.json(fields);
      }
      
      // Otherwise get all fields (not recommended for large datasets)
      const allFields = await storage.getAllTemplateFields();
      console.log(`Retrieved ${allFields.length} fields in total`);
      res.json(allFields);
    } catch (error) {
      console.error("Error fetching template fields:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل حقول القالب" });
    }
  });
  
  app.post("/api/admin/template-fields", isAdmin, async (req, res) => {
    try {
      const validatedData = insertTemplateFieldSchema.parse(req.body);
      const field = await storage.createTemplateField(validatedData);
      res.status(201).json(field);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة", 
          errors: error.errors 
        });
      }
      console.error("Error creating template field:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء حقل القالب" });
    }
  });
  
  // Get all fields for a template
  app.get("/api/templates/:id/fields", async (req, res) => {
    try {
      const { id } = req.params;
      const templateId = parseInt(id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "رقم القالب غير صالح" });
      }
      
      // Check if template exists
      const template = await storage.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      const fields = await storage.getTemplateFields(templateId);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching template fields:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل حقول القالب" });
    }
  });
  
  // Get individual field for editing
  app.get("/api/admin/template-fields/:templateId/:fieldId", isAdmin, async (req, res) => {
    try {
      const { templateId, fieldId } = req.params;
      const fields = await storage.getTemplateFields(parseInt(templateId));
      const field = fields.find(f => f.id === parseInt(fieldId));
      
      if (!field) {
        return res.status(404).json({ message: "الحقل غير موجود" });
      }
      
      res.json(field);
    } catch (error) {
      console.error("Error fetching field:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل الحقل" });
    }
  });

  // Update individual field
  app.put("/api/admin/template-fields/:fieldId", isAdmin, async (req, res) => {
    try {
      const { fieldId } = req.params;
      const fieldData = req.body;
      
      // Validate the field data
      const validatedData = {
        name: fieldData.name,
        label: fieldData.label,
        labelAr: fieldData.labelAr || null,
        type: fieldData.type || 'text',
        imageType: fieldData.imageType || null,
        required: Boolean(fieldData.required),
        defaultValue: fieldData.defaultValue || null,
        placeholder: fieldData.placeholder || null,
        placeholderAr: fieldData.placeholderAr || null,
        options: fieldData.options || [],
        position: fieldData.position || { x: 50, y: 50, snapToGrid: false },
        style: fieldData.style || {},
        displayOrder: fieldData.displayOrder || 0,
        isStatic: Boolean(fieldData.isStatic),
        staticContent: fieldData.staticContent || null
      };
      
      const updatedField = await storage.updateTemplateField(parseInt(fieldId), validatedData);
      
      if (!updatedField) {
        return res.status(404).json({ message: "الحقل غير موجود" });
      }
      
      res.json(updatedField);
    } catch (error) {
      console.error("Error updating field:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث الحقل" });
    }
  });

  // Get template details (admin only) - Used in template fields page
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Looking for template with ID: ${id}`);
      
      const templateId = parseInt(id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "رقم القالب غير صالح" });
      }
      
      const template = await storage.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      console.log(`Template found: ${template.title}, ID: ${template.id}`);
      
      // Get category details
      const category = await storage.getCategoryById(template.categoryId);
      
      res.json({
        ...template,
        category
      });
    } catch (error) {
      console.error("Error fetching template details:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل تفاصيل القالب" });
    }
  });

  // Add a new template field to a template
  app.post("/api/templates/:id/fields", async (req, res) => {
    try {
      const { id } = req.params;
      const templateId = parseInt(id);
      
      // Check if template exists
      const template = await storage.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      // Add template ID to the field data
      const fieldData = {
        ...req.body,
        templateId
      };
      
      // Validate and create field
      const validatedData = insertTemplateFieldSchema.parse(fieldData);
      const field = await storage.createTemplateField(validatedData);
      
      res.status(201).json(field);
    } catch (error) {
      console.error("Error creating template field:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء حقل القالب" });
    }
  });

  app.put("/api/admin/template-fields/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // تجهيز البيانات المدخلة والتأكد من أنها تتوافق مع المخطط
      const fieldData = {
        name: req.body.name,
        label: req.body.label,
        labelAr: req.body.labelAr || null,
        type: req.body.type || 'text',
        required: Boolean(req.body.required),
        defaultValue: req.body.defaultValue || null,
        placeholder: req.body.placeholder || null,
        placeholderAr: req.body.placeholderAr || null,
        options: parseJsonData(req.body.options, []),
        position: parseJsonData(req.body.position, { x: 50, y: 50 }),
        style: parseJsonData(req.body.style, {
          fontFamily: 'Cairo',
          fontSize: 24,
          fontWeight: 'normal',
          color: '#000000',
          align: 'center',
          verticalPosition: 'middle'
        }),
        displayOrder: req.body.displayOrder || 0,
        templateId: req.body.templateId
      };
      
      // تحديث حقل القالب
      const field = await storage.updateTemplateField(parseInt(id), fieldData);
      
      if (!field) {
        return res.status(404).json({ message: "حقل القالب غير موجود" });
      }
      
      res.json(field);
    } catch (error) {
      console.error("Error updating template field:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث حقل القالب" });
    }
  });

  app.delete("/api/admin/template-fields/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTemplateField(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "حقل القالب غير موجود" });
      }
      
      res.json({ message: "تم حذف حقل القالب بنجاح" });
    } catch (error) {
      console.error("Error deleting template field:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف حقل القالب" });
    }
  });
  
  // Get all fields for a template (admin only) - محسن للسرعة
  app.get("/api/admin/template-fields/:templateId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { templateId } = req.params;
      const templateIdNum = parseInt(templateId);
      
      if (isNaN(templateIdNum)) {
        return res.status(400).json({ message: "رقم القالب غير صالح" });
      }
      
      // جلب الحقول مباشرة دون التحقق من وجود القالب لتحسين الأداء
      const fields = await storage.getTemplateFields(templateIdNum);
      
      // إضافة headers للتخزين المؤقت
      res.set({
        'Cache-Control': 'public, max-age=60',
        'ETag': `"fields-${templateIdNum}-${Date.now()}"`
      });
      
      res.json(fields);
    } catch (error) {
      console.error("Error fetching template fields:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل حقول القالب" });
    }
  });
  
  // PUT /api/admin/template-fields/:templateId/order - تحديث ترتيب حقول القالب
  app.put("/api/admin/template-fields/:templateId/order", isAdmin, async (req, res) => {
    try {
      const { templateId } = req.params;
      const { fields } = req.body;
      
      if (isNaN(parseInt(templateId))) {
        return res.status(400).json({ message: "رقم القالب غير صالح" });
      }
      
      if (!Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ message: "البيانات المرسلة غير صالحة" });
      }
      
      // التحقق من وجود القالب
      const template = await storage.getTemplate(parseInt(templateId));
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      // تحديث ترتيب الحقول
      for (const field of fields) {
        if (!field.id || isNaN(parseInt(field.id.toString()))) {
          continue;
        }
        
        await storage.updateTemplateField(parseInt(field.id.toString()), {
          displayOrder: field.displayOrder
        });
      }
      
      res.json({ message: "تم تحديث ترتيب الحقول بنجاح" });
    } catch (error) {
      console.error("Error updating template field order:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث ترتيب الحقول" });
    }
  });
  
  // Get template fields (public - no auth required)
  app.get("/api/templates/:templateId/fields", async (req, res) => {
    try {
      const { templateId } = req.params;
      
      if (isNaN(parseInt(templateId))) {
        return res.status(400).json({ message: "رقم القالب غير صالح" });
      }
      
      // Check if template exists
      const template = await storage.getTemplate(parseInt(templateId));
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      const fields = await storage.getTemplateFields(parseInt(templateId));
      console.log(`Retrieved ${fields.length} fields for template ID ${templateId} (public fields API)`);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching template fields (public):", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل حقول القالب" });
    }
  });
  
  // واجهة مباشرة لحقول القالب تتوافق مع ما يستخدمه العميل
  // هذا يصلح أخطاء 404 التي نراها في السجلات
  app.get("/api/template-fields/:templateId([0-9]+)", async (req, res) => {
    try {
      const { templateId } = req.params;
      
      if (isNaN(parseInt(templateId))) {
        return res.status(400).json({ message: "رقم القالب غير صالح" });
      }
      
      console.log(`[DIRECT API] Fetching fields for template ID ${templateId}`);
      
      // Check if template exists
      const template = await storage.getTemplate(parseInt(templateId));
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      const fields = await storage.getTemplateFields(parseInt(templateId));
      console.log(`[DIRECT API] Retrieved ${fields.length} fields for template ID ${templateId}`);
      res.json(fields);
    } catch (error) {
      console.error("[DIRECT API] Error fetching template fields:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل حقول القالب" });
    }
  });



  // Get media files
  app.get("/api/media", isAuthenticated, async (req, res) => {
    try {
      const files = await storage.getMediaFiles();
      res.json({ files });
    } catch (error) {
      console.error("Error fetching media files:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب الملفات" });
    }
  });

  // Delete media file
  app.delete("/api/media/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteMediaFile(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "الملف غير موجود" });
      }
      
      res.json({ message: "تم حذف الملف بنجاح" });
    } catch (error) {
      console.error("Error deleting media file:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف الملف" });
    }
  });

  // Font CRUD operations (admin only)
  app.post("/api/admin/fonts", isAdmin, async (req, res) => {
    try {
      const validatedData = insertFontSchema.parse(req.body);
      const font = await storage.createFont(validatedData);
      res.status(201).json(font);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة", 
          errors: error.errors 
        });
      }
      console.error("Error creating font:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء الخط" });
    }
  });

  app.put("/api/admin/fonts/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const font = await storage.updateFont(parseInt(id), req.body);
      
      if (!font) {
        return res.status(404).json({ message: "الخط غير موجود" });
      }
      
      res.json(font);
    } catch (error) {
      console.error("Error updating font:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث الخط" });
    }
  });

  app.delete("/api/admin/fonts/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteFont(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "الخط غير موجود" });
      }
      
      res.json({ message: "تم حذف الخط بنجاح" });
    } catch (error) {
      console.error("Error deleting font:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف الخط" });
    }
  });

  // Settings CRUD operations (admin only)
  app.get("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      const category = req.query.category as string;
      
      if (category) {
        const settings = await storage.getSettingsByCategory(category);
        res.json(settings);
      } else {
        // Get all settings by getting all categories and then getting settings for each category
        const generalSettings = await storage.getSettingsByCategory('general');
        const emailSettings = await storage.getSettingsByCategory('email');
        const templateSettings = await storage.getSettingsByCategory('template');
        
        res.json([...generalSettings, ...emailSettings, ...templateSettings]);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل الإعدادات" });
    }
  });

  // Advanced certificate generation endpoint
  app.post("/api/certificates/advanced-generate", isAuthenticated, async (req, res) => {
    try {
      const { templateId, customizations, layers, formData } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ message: "معرف القالب مطلوب" });
      }
      
      // Import the advanced generator
      const { createAdvancedGenerator } = await import('./advanced-certificate-generator.js');
      
      // Create the generator with customizations
      const generator = await createAdvancedGenerator(templateId, customizations || {});
      
      // Add layers to the generator
      if (layers && Array.isArray(layers)) {
        layers.forEach((layer: any) => {
          generator.addLayer(layer);
        });
      }
      
      // Generate the certificate
      const imagePath = await generator.generateCertificate(formData || {});
      
      // Get relative path for serving
      const relativePath = imagePath.replace(process.cwd(), '').replace(/\\/g, '/');
      const imageUrl = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
      
      res.json({
        success: true,
        imageUrl,
        message: "تم إنشاء الشهادة المخصصة بنجاح"
      });
      
    } catch (error: any) {
      console.error('Error generating advanced certificate:', error);
      res.status(500).json({
        success: false,
        message: "خطأ في إنشاء الشهادة المخصصة",
        error: error.message
      });
    }
  });

  // Certificate batches management endpoints
  app.get("/api/admin/certificate-batches", isAdmin, async (req, res) => {
    try {
      const batches = await storage.getCertificateBatches();
      res.json(batches);
    } catch (error: any) {
      console.error("Error fetching certificate batches:", error);
      res.status(500).json({ message: "خطأ في جلب مجموعات الشهادات" });
    }
  });

  app.post("/api/admin/certificate-batches", isAdmin, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "ملف البيانات مطلوب" });
      }

      const { templateId, name } = req.body;
      if (!templateId || !name) {
        return res.status(400).json({ message: "معرف القالب واسم المجموعة مطلوبان" });
      }

      // Process the uploaded file and create batch
      const { processExcelBatch } = await import('./batch-processor.js');
      
      const template = await storage.getTemplate(parseInt(templateId));
      if (!template) {
        return res.status(404).json({ message: "القالب المحدد غير موجود" });
      }

      const batch = await storage.createCertificateBatch({
        userId: (req.user as any).id,
        name,
        templateId: parseInt(templateId),
        status: 'draft',
        totalItems: 0,
        processedItems: 0,
        errorItems: 0,
        data: {}
      });

      // Process the file asynchronously
      processExcelBatch(batch.id, req.file.path, template);

      res.status(201).json(batch);
    } catch (error: any) {
      console.error("Error creating certificate batch:", error);
      res.status(500).json({ message: "خطأ في إنشاء مجموعة الشهادات" });
    }
  });

  app.post("/api/admin/certificate-batches/:id/process", isAdmin, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const batch = await storage.getCertificateBatch(batchId);
      
      if (!batch) {
        return res.status(404).json({ message: "المجموعة غير موجودة" });
      }

      await storage.updateCertificateBatch(batchId, { status: 'processing' });
      
      // Start processing asynchronously
      const { processExcelBatch } = await import('./batch-processor.js');
      const template = await storage.getTemplate(batch.templateId!);
      
      if (template) {
        processExcelBatch(batchId, '', template);
      }

      res.json({ message: "تم بدء معالجة المجموعة" });
    } catch (error: any) {
      console.error("Error processing certificate batch:", error);
      res.status(500).json({ message: "خطأ في معالجة المجموعة" });
    }
  });

  app.post("/api/admin/certificate-batches/:id/pause", isAdmin, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      await storage.updateCertificateBatch(batchId, { status: 'paused' });
      res.json({ message: "تم إيقاف معالجة المجموعة" });
    } catch (error: any) {
      console.error("Error pausing certificate batch:", error);
      res.status(500).json({ message: "خطأ في إيقاف المجموعة" });
    }
  });

  app.get("/api/admin/certificate-batches/:id/items", isAdmin, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const items = await storage.getCertificateBatchItems(batchId);
      res.json(items);
    } catch (error: any) {
      console.error("Error fetching batch items:", error);
      res.status(500).json({ message: "خطأ في جلب عناصر المجموعة" });
    }
  });

  app.get("/api/admin/certificate-batches/:id/download", isAdmin, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      // Implementation for downloading batch results as ZIP
      res.json({ message: "تحميل النتائج قيد التطوير" });
    } catch (error: any) {
      console.error("Error downloading batch results:", error);
      res.status(500).json({ message: "خطأ في تحميل النتائج" });
    }
  });

  // Template management endpoints
  app.post("/api/admin/templates/:id/duplicate", isAdmin, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const originalTemplate = await storage.getTemplate(templateId);
      
      if (!originalTemplate) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }

      const duplicatedTemplate = await storage.createTemplate({
        ...originalTemplate,
        title: `${originalTemplate.title} - نسخة`,
        slug: `${originalTemplate.slug}-copy-${Date.now()}`,
      });

      res.status(201).json(duplicatedTemplate);
    } catch (error: any) {
      console.error("Error duplicating template:", error);
      res.status(500).json({ message: "خطأ في نسخ القالب" });
    }
  });

  app.post("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      const validatedData = insertSettingSchema.parse({
        ...req.body,
        updatedBy: req.user.id
      });
      
      const setting = await storage.createOrUpdateSetting(validatedData);
      res.status(201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "بيانات غير صالحة", 
          errors: error.errors 
        });
      }
      console.error("Error creating/updating setting:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء/تحديث الإعداد" });
    }
  });

  app.delete("/api/admin/settings/:key", isAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const success = await storage.deleteSetting(key);
      
      if (!success) {
        return res.status(404).json({ message: "الإعداد غير موجود" });
      }
      
      res.json({ message: "تم حذف الإعداد بنجاح" });
    } catch (error) {
      console.error("Error deleting setting:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف الإعداد" });
    }
  });

  // Manage users (admin only)
  app.put("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role, active, name, email } = req.body;
      
      // Check if user exists
      const user = await storage.getUser(parseInt(id));
      
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(parseInt(id), { 
        role, active, name, email 
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث المستخدم" });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Don't allow deleting the last admin
      const adminUsers = (await storage.getAllUsers()).users.filter(u => u.role === 'admin');
      
      if (adminUsers.length === 1 && adminUsers[0].id === parseInt(id)) {
        return res.status(400).json({ message: "لا يمكن حذف آخر مستخدم بصلاحيات مدير" });
      }
      
      const success = await storage.deleteUser(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      res.json({ message: "تم حذف المستخدم بنجاح" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف المستخدم" });
    }
  });

  // System stats (admin only)
  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const totalUsers = (await storage.getAllUsers()).total;
      const categories = await storage.getAllCategories();
      const { templates, total: totalTemplates } = await storage.getAllTemplates();
      
      // Count cards and certificates
      let totalCards = 0;
      let totalCertificates = 0;
      
      try {
        const userCardsResult = await storage.getAllCards({ limit: 1, offset: 0 });
        totalCards = userCardsResult.total;
      } catch (error) {
        console.error("Error counting cards:", error);
      }
      
      try {
        const userCertificatesResult = await storage.getAllCertificates({ limit: 1, offset: 0 });
        totalCertificates = userCertificatesResult.total;
      } catch (error) {
        console.error("Error counting certificates:", error);
      }
      
      res.json({
        totalUsers,
        totalCategories: categories.length,
        totalTemplates,
        totalCards,
        totalCertificates,
        
        // Some recent activity
        recentUsers: (await storage.getAllUsers({ limit: 5 })).users.map(u => {
          const { password, ...userWithoutPassword } = u;
          return userWithoutPassword;
        }),
        recentTemplates: templates.slice(0, 5)
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل الإحصائيات" });
    }
  });

  // مسارات قوالب الشهادات - Certificate template routes
  app.get("/api/certificate-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let template;

      // إذا كان المعرف هو "new"، استرجع قالب الشهادات الافتراضي
      if (id === "new") {
        const certificateTemplates = await storage.getTemplatesByCategory(1, { active: true });
        template = certificateTemplates.length > 0 ? certificateTemplates[0] : null;
      } else {
        template = await storage.getTemplate(parseInt(id));
      }
      
      if (!template) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching certificate template:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل قالب الشهادة" });
    }
  });
  
  // Get template fields for certificates (public, no auth required)
  app.get("/api/certificate-templates/:id/fields", async (req, res) => {
    try {
      const { id } = req.params;
      let templateId;

      // إذا كان المعرف هو "new"، استرجع حقول قالب الشهادات الافتراضي
      if (id === "new") {
        const certificateTemplates = await storage.getTemplatesByCategory(1, { active: true });
        templateId = certificateTemplates.length > 0 ? certificateTemplates[0].id : null;
      } else {
        templateId = parseInt(id);
      }
      
      if (!templateId) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }
      
      const fields = await storage.getTemplateFields(templateId);
      console.log(`Retrieved ${fields.length} fields for certificate template ID ${templateId} (public API)`);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching certificate template fields:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل حقول قالب الشهادة" });
    }
  });

  // User preferences API (public/authenticated)
  app.get('/api/user/preferences', async (req, res) => {
    try {
      // Default preferences
      const preferences = {
        layout: 'boxed',
        theme: 'light'
      };

      // If user is authenticated, try to get their saved preferences
      if (req.user) {
        try {
          const userPreferences = await storage.getUserPreferences(req.user.id);
          if (userPreferences) {
            // Override defaults with user's saved preferences
            Object.assign(preferences, userPreferences);
          }
        } catch (error) {
          console.error('Error fetching user preferences:', error);
        }
      }
      
      res.json(preferences);
    } catch (error) {
      console.error('Error in preferences API:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء تحميل تفضيلات المستخدم' });
    }
  });

  // Save user preferences (public/authenticated)
  app.post('/api/user/preferences', async (req, res) => {
    try {
      const { layout, theme } = req.body;
      
      // Validate inputs
      if (layout && !['boxed', 'fluid'].includes(layout)) {
        return res.status(400).json({ message: 'قيمة التخطيط غير صالحة' });
      }
      
      if (theme && !['light', 'dark', 'system'].includes(theme)) {
        return res.status(400).json({ message: 'قيمة السمة غير صالحة' });
      }
      
      // Preferences to save
      const preferences = { 
        layout: layout || 'boxed',
        theme: theme || 'light'
      };
      
      // If user is authenticated, save to database
      if (req.user) {
        await storage.saveUserPreferences(req.user.id, preferences);
      }
      
      // Always save to session for both guests and authenticated users
      if (req.session) {
        req.session.userPreferences = preferences;
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving user preferences:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء حفظ تفضيلات المستخدم' });
    }
  });

  // ========================
  // USER LOGOS API ENDPOINTS
  // ========================
  
  // Get user logos
  app.get('/api/user/logos', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const logos = await storage.getUserLogos(userId);
      res.json(logos || []);
    } catch (error) {
      console.error("Error fetching user logos:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب الشعارات" });
    }
  });
  
  // Upload user logo
  app.post('/api/user/logos', isAuthenticated, upload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم تقديم ملف للشعار" });
      }
      
      const userId = req.user.id;
      const name = req.body.name || 'شعار';
      
      // Generate URL path for the file
      const fileUrl = `/uploads/${req.file.filename}`;
      
      const logo = await storage.createUserLogo({
        userId,
        name,
        imageUrl: fileUrl,
      });
      
      res.json(logo);
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "حدث خطأ أثناء رفع الشعار" });
    }
  });
  
  // Delete user logo
  app.delete('/api/user/logos/:id', isAuthenticated, async (req, res) => {
    try {
      const logoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (isNaN(logoId)) {
        return res.status(400).json({ message: "رقم الشعار غير صالح" });
      }
      
      // Verify logo belongs to user
      const logo = await storage.getUserLogo(logoId);
      if (!logo || logo.userId !== userId) {
        return res.status(404).json({ message: "الشعار غير موجود" });
      }
      
      await storage.deleteUserLogo(logoId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting logo:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف الشعار" });
    }
  });
  
  // ============================
  // USER SIGNATURES API ENDPOINTS
  // ============================
  
  // Get user signatures
  app.get('/api/user/signatures', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const signatures = await storage.getUserSignatures(userId);
      res.json(signatures || []);
    } catch (error) {
      console.error("Error fetching user signatures:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب التوقيعات" });
    }
  });
  
  // Upload user signature
  app.post('/api/user/signatures', isAuthenticated, upload.single('signature'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم تقديم ملف للتوقيع" });
      }
      
      const userId = req.user.id;
      const name = req.body.name || 'توقيع';
      const type = req.body.type === 'stamp' ? 'stamp' : 'signature';
      
      // Generate URL path for the file
      const fileUrl = `/uploads/${req.file.filename}`;
      
      const signature = await storage.createUserSignature({
        userId,
        name,
        type,
        imageUrl: fileUrl,
      });
      
      res.json(signature);
    } catch (error) {
      console.error("Error uploading signature:", error);
      res.status(500).json({ message: "حدث خطأ أثناء رفع التوقيع" });
    }
  });
  
  // Delete user signature
  app.delete('/api/user/signatures/:id', isAuthenticated, async (req, res) => {
    try {
      const signatureId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (isNaN(signatureId)) {
        return res.status(400).json({ message: "رقم التوقيع غير صالح" });
      }
      
      // Verify signature belongs to user
      const signature = await storage.getUserSignature(signatureId);
      if (!signature || signature.userId !== userId) {
        return res.status(404).json({ message: "التوقيع غير موجود" });
      }
      
      await storage.deleteUserSignature(signatureId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting signature:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف التوقيع" });
    }
  });

  // مسار موحد لإعدادات العرض - للقراءة العامة
  app.get('/api/display-settings', async (req, res) => {
    try {
      // استخدم القيم الافتراضية في حالة عدم وجود إعدادات
      let settings = {
        displayMode: 'multi',
        templateViewMode: 'multi-page', // 'multi-page' للطريقة التقليدية، 'single-page' للطريقة الجديدة
        enableSocialFormats: true,
        defaultSocialFormat: 'instagram'
      };
      
      try {
        // محاولة استرجاع الإعدادات من قاعدة البيانات
        const storedSettings = await storage.getSettingsByCategory('display');
        
        if (storedSettings && storedSettings.length > 0) {
          // تجميع الإعدادات في كائن واحد
          storedSettings.forEach((setting) => {
            if (setting.key && setting.value) {
              try {
                const value = JSON.parse(String(setting.value));
                settings[setting.key] = value;
              } catch (e) {
                settings[setting.key] = setting.value;
              }
            }
          });
        }
      } catch (error) {
        console.error('Error fetching display settings:', error);
        // استمر باستخدام القيم الافتراضية
      }
      
      res.json({ settings });
    } catch (error) {
      console.error('Error in display settings API:', error);
      res.status(500).json({ message: 'Error fetching display settings' });
    }
  });
  
  // مسار موحد لحفظ إعدادات العرض - للمشرفين فقط
  app.post('/api/display-settings', isAdmin, async (req, res) => {
    try {
      const settings = req.body;
      
      if (!settings) {
        return res.status(400).json({ message: 'البيانات المرسلة غير صحيحة' });
      }

      console.log('Saving display settings:', settings);
      
      // حفظ كل إعداد على حدة في قاعدة البيانات
      for (const [key, value] of Object.entries(settings)) {
        const settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        // استخدام دالة موحدة لإنشاء أو تحديث الإعداد
        await storage.createOrUpdateSetting({
          category: 'display',
          key,
          value: settingValue,
          description: `Display setting - ${key}`
        });
      }
      
      res.json({ success: true, message: 'تم حفظ إعدادات العرض بنجاح' });
    } catch (error) {
      console.error('Error saving display settings:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء حفظ الإعدادات' });
    }
  });
  
  // Font Management Routes
  app.get("/api/admin/fonts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const fonts = await storage.getAllFonts();
      res.json(fonts);
    } catch (error) {
      console.error("Error fetching fonts:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل الخطوط" });
    }
  });

  app.post("/api/admin/fonts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const fontData = req.body;
      const font = await storage.createFont(fontData);
      res.json(font);
    } catch (error) {
      console.error("Error creating font:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إضافة الخط" });
    }
  });

  app.put("/api/admin/fonts/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const fontData = req.body;
      const font = await storage.updateFont(parseInt(id), fontData);
      res.json(font);
    } catch (error) {
      console.error("Error updating font:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحديث الخط" });
    }
  });

  app.delete("/api/admin/fonts/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFont(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting font:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف الخط" });
    }
  });

  // Font Styles Routes
  app.get("/api/admin/font-styles/:fontId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { fontId } = req.params;
      const styles = await storage.getFontStyles(parseInt(fontId));
      res.json(styles);
    } catch (error) {
      console.error("Error fetching font styles:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل أنماط الخط" });
    }
  });

  app.post("/api/admin/font-styles", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const styleData = req.body;
      const style = await storage.createFontStyle(styleData);
      res.json(style);
    } catch (error) {
      console.error("Error creating font style:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إضافة نمط الخط" });
    }
  });

  // Tags Management Routes  
  app.get("/api/admin/tags", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tags = await storage.getAllTags();
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل الوسوم" });
    }
  });

  app.post("/api/admin/tags", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tagData = req.body;
      const tag = await storage.createTag(tagData);
      res.json(tag);
    } catch (error) {
      console.error("Error creating tag:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إضافة الوسم" });
    }
  });

  // Content Library Management Routes
  app.get("/api/admin/content-library", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { type, tagId } = req.query;
      const options = {
        type: type as string,
        tagId: tagId ? parseInt(tagId as string) : undefined
      };
      
      const items = await storage.getContentLibraryItems(options);
      res.json(items);
    } catch (error) {
      console.error("Error fetching content library:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل مكتبة المحتوى" });
    }
  });

  app.post("/api/admin/content-library", isAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم رفع أي ملف" });
      }

      const fileName = `${Date.now()}-${req.file.originalname}`;
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      
      // إنشاء مجلد uploads إذا لم يكن موجوداً
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // نسخ الملف إلى مجلد uploads
      await fs.writeFile(filePath, req.file.buffer);
      
      const contentData = {
        name: req.body.name,
        nameAr: req.body.nameAr,
        type: req.body.type,
        category: req.body.category,
        url: `/uploads/${fileName}`,
        thumbnailUrl: `/uploads/${fileName}`,
        userId: req.user?.id,
        active: true
      };
      
      const item = await storage.createContentLibraryItem(contentData);
      res.json(item);
    } catch (error) {
      console.error("Error creating tag:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إضافة الوسم" });
    }
  });

  // Content Library Routes
  app.get("/api/admin/content-library", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { type, category, search, limit, offset } = req.query;
      const content = await storage.getContentLibrary({
        type: type as string,
        category: category as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      res.json(content);
    } catch (error) {
      console.error("Error fetching content library:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل مكتبة المحتوى" });
    }
  });

  app.post("/api/admin/content-library", isAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
    try {
      const { name, nameAr, type, category, description, keywords, tags, isPublic } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "لا يوجد ملف محدد" });
      }

      const file = req.file;
      const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
      const uploadPath = path.join(uploadsDir, filename);
      
      await fs.promises.copyFile(file.path, uploadPath);
      await fs.promises.unlink(file.path);

      const contentData = {
        name,
        nameAr,
        type,
        category,
        url: `/uploads/${filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        description,
        keywords: keywords ? JSON.parse(keywords) : [],
        userId: (req.user as any).id,
        isPublic: isPublic === 'true',
        active: true
      };

      const content = await storage.createContentLibrary(contentData);
      
      // Add tags if provided
      if (tags) {
        const tagIds = JSON.parse(tags);
        await storage.addContentTags(content.id, tagIds);
      }

      res.json(content);
    } catch (error) {
      console.error("Error creating content library item:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إضافة المحتوى" });
    }
  });

  // Public API for social formats - available to all users
  app.get('/api/social-formats', async (req, res) => {
    try {
      // Import the social image generator module
      const { DEFAULT_SOCIAL_FORMATS } = await import('./lib/social-image-generator');
      
      // Use the DEFAULT_SOCIAL_FORMATS from the module as a fallback
      let formats = DEFAULT_SOCIAL_FORMATS;
      
      try {
        // Try to get formats from database
        const settingsArray = await storage.getSettingsByCategory('social-formats');
        
        // If formats exist in the database, use them
        if (settingsArray && settingsArray.length > 0) {
          formats = {};
          
          for (const setting of settingsArray) {
            try {
              if (setting.key && setting.value) {
                formats[setting.key] = JSON.parse(String(setting.value));
              }
            } catch (parseError) {
              console.error(`Error parsing format setting for ${setting.key}:`, parseError);
            }
          }
        }
      } catch (dbError) {
        console.error('Error fetching social formats from database:', dbError);
      }
      
      res.json({ formats });
    } catch (error) {
      console.error('Error fetching social formats:', error);
      res.status(500).json({ message: 'Error fetching social formats' });
    }
  });
  
  // Admin display settings update endpoint
  // اضفنا مسار ثاني للتوافق مع واجهة المستخدم
  // مسار موحد لحفظ إعدادات العرض للمشرفين
  app.post('/api/admin/display-settings', isAuthenticated, isAdmin, async (req, res) => {
    console.log('Received POST to /api/admin/display-settings with body:', JSON.stringify(req.body));
    try {
      const { displayMode, templateViewMode, enableSocialFormats, defaultSocialFormat } = req.body;
      
      // تحقق من صحة القيم
      if (displayMode && !['single', 'multi'].includes(displayMode)) {
        return res.status(400).json({ message: 'قيمة وضع العرض غير صالحة' });
      }
      
      if (templateViewMode && !['single-page', 'multi-page'].includes(templateViewMode)) {
        return res.status(400).json({ message: 'قيمة وضع عرض القالب غير صالحة' });
      }
      
      // تحديث كل إعداد
      if (displayMode) {
        await storage.createOrUpdateSetting({
          key: 'displayMode',
          value: displayMode,
          category: 'display',
          description: 'Display mode for the app (multi or single)'
        });
      }
      
      if (templateViewMode) {
        await storage.createOrUpdateSetting({
          key: 'templateViewMode',
          value: templateViewMode,
          category: 'display',
          description: 'Template view mode (single-page or multi-page)'
        });
      }
      
      if (enableSocialFormats !== undefined) {
        await storage.createOrUpdateSetting({
          key: 'enableSocialFormats',
          value: enableSocialFormats,
          category: 'display',
          description: 'Enable social media format options'
        });
      }
      
      if (defaultSocialFormat) {
        await storage.createOrUpdateSetting({
          key: 'defaultSocialFormat',
          value: defaultSocialFormat,
          category: 'display',
          description: 'Default social media format'
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating display settings:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء تحديث إعدادات العرض' });
    }
  });

  // Serve uploaded card images and files
  app.use("/uploads", express.static(uploadsDir, {
    setHeaders: (res, path) => {
      // Set correct MIME types for JavaScript files
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (path.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (path.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
    }
  }));
  
  // Use cards router for card-related endpoints
  app.use('/api/cards', cardsRouter);

  // Generate thumbnails endpoint for optimized image loading
  app.post('/api/generate-thumbnails', isAuthenticated, async (req, res) => {
    try {
      const { imagePath, sizes = ['small', 'medium', 'large', 'card', 'gallery'] } = req.body;
      
      if (!imagePath) {
        return res.status(400).json({ message: 'مسار الصورة مطلوب' });
      }
      
      const thumbnails = await processUploadedImage(imagePath, sizes);
      res.json({ 
        success: true, 
        thumbnails,
        message: `تم إنشاء ${Object.keys(thumbnails).length} صورة مصغرة`
      });
    } catch (error) {
      console.error('خطأ في إنشاء الصور المصغرة:', error);
      res.status(500).json({ message: 'فشل في إنشاء الصور المصغرة' });
    }
  });

  // Get thumbnail URL for an image
  app.get('/api/thumbnail/:size/:imageName', (req, res) => {
    try {
      const { size, imageName } = req.params;
      const thumbnailUrl = getThumbnailUrl(imageName, size as any);
      res.json({ url: thumbnailUrl });
    } catch (error) {
      console.error('خطأ في الحصول على رابط الصورة المصغرة:', error);
      res.status(500).json({ message: 'فشل في الحصول على رابط الصورة المصغرة' });
    }
  });

  // Copy fields from one template to another (admin)
  app.post("/api/templates/copy-fields", isAuthenticated, async (req, res) => {
    try {
      const { sourceTemplateId, targetTemplateId, fieldIds } = req.body;
      
      if (!sourceTemplateId || !targetTemplateId) {
        return res.status(400).json({ message: "معرف القالب المصدر والهدف مطلوبان" });
      }
      
      // Get the source template fields
      const sourceFields = await storage.getTemplateFields(parseInt(sourceTemplateId));
      
      if (!sourceFields || sourceFields.length === 0) {
        return res.status(404).json({ message: "لا توجد حقول في القالب المصدر" });
      }
      
      // Get the target template fields to prevent duplicates
      const targetFields = await storage.getTemplateFields(parseInt(targetTemplateId));
      const targetFieldNames = targetFields.map(field => field.name);
      
      // Determine which fields to copy
      let fieldsToCopy = [];
      if (fieldIds && fieldIds.length > 0) {
        // Copy only selected fields
        fieldsToCopy = sourceFields.filter(field => fieldIds.includes(field.id));
      } else {
        // Copy all fields
        fieldsToCopy = sourceFields;
      }
      
      // Filter out fields that already exist in the target template (by name)
      const uniqueFieldsToCopy = fieldsToCopy.filter(field => !targetFieldNames.includes(field.name));
      
      // Get the current fields for the target template to determine the next display order
      const nextDisplayOrder = targetFields.length;
      
      // Create each field in the target template
      const createdFields = [];
      const duplicateFields = [];
      
      for (let i = 0; i < fieldsToCopy.length; i++) {
        const field = fieldsToCopy[i];
        
        // Skip fields that already exist in target
        if (targetFieldNames.includes(field.name)) {
          duplicateFields.push(field.name);
          continue;
        }
        
        const { id, ...fieldData } = field; // Remove id to create a new field
        
        // تحويل البيانات لتلافي خطأ الأنواع
        const createFieldData = {
          name: fieldData.name,
          label: fieldData.label,
          labelAr: fieldData.labelAr || null,
          type: fieldData.type || 'text',
          required: Boolean(fieldData.required),
          defaultValue: fieldData.defaultValue || null,
          placeholder: fieldData.placeholder || null,
          placeholderAr: fieldData.placeholderAr || null,
          options: typeof fieldData.options === 'object' ? JSON.parse(JSON.stringify(fieldData.options)) : [],
          position: typeof fieldData.position === 'object' ? JSON.parse(JSON.stringify(fieldData.position)) : {},
          style: typeof fieldData.style === 'object' ? JSON.parse(JSON.stringify(fieldData.style)) : {},
          displayOrder: nextDisplayOrder + createdFields.length,
          templateId: parseInt(targetTemplateId),
        };
        
        const newField = await storage.createTemplateField(createFieldData);
        
        createdFields.push(newField);
      }
      
      // Prepare response based on results
      let message = "";
      if (createdFields.length > 0) {
        message = `تم نسخ ${createdFields.length} حقل بنجاح`;
        if (duplicateFields.length > 0) {
          message += `. تم تجاوز ${duplicateFields.length} حقل موجود مسبقاً`;
        }
      } else if (duplicateFields.length > 0) {
        message = `لم يتم نسخ أي حقول. جميع الحقول المحددة موجودة مسبقاً في القالب الهدف`;
      }
      
      res.status(201).json({ 
        message,
        copied: createdFields.length,
        skipped: duplicateFields.length,
        duplicateFields,
        fields: createdFields
      });
    } catch (error) {
      console.error("Error copying template fields:", error);
      res.status(500).json({ message: "حدث خطأ أثناء نسخ حقول القالب" });
    }
  });
  
  // Get all templates for dropdown lists (admin)
  app.get("/api/admin/templates-list", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { templates } = await storage.getAllTemplates();
      
      // Return only id and title for dropdown lists
      const templatesList = templates.map(template => ({
        id: template.id,
        title: template.title
      }));
      
      res.json(templatesList);
    } catch (error) {
      console.error("Error fetching templates list:", error);
      res.status(500).json({ message: "حدث خطأ أثناء تحميل قائمة القوالب" });
    }
  });
  
  // جلب معلومات تخطيط القالب
  app.get('/api/admin/templates/:templateId/layout', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const template = await storage.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: 'القالب غير موجود' });
      }
      
      // إرجاع بيانات التخطيط إذا كانت موجودة، وإلا إرجاع مصفوفة فارغة
      const layoutData = template.settings?.layoutData || [];
      res.json(layoutData);
    } catch (error) {
      console.error('Error fetching template layout:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات التخطيط' });
    }
  });
  
  // تحديث معلومات تخطيط القالب
  app.put('/api/admin/templates/:templateId/layout', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const { layout } = req.body;
      
      if (!Array.isArray(layout)) {
        return res.status(400).json({ message: 'بيانات التخطيط غير صالحة' });
      }
      
      const template = await storage.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: 'القالب غير موجود' });
      }
      
      // دمج بيانات التخطيط مع الإعدادات الحالية
      const settings = {
        ...(template.settings || {}),
        layoutData: layout
      };
      
      // تحديث إعدادات القالب
      await storage.updateTemplate(templateId, { settings });
      
      res.json({ message: 'تم تحديث التخطيط بنجاح', layoutData: layout });
    } catch (error) {
      console.error('Error updating template layout:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء تحديث بيانات التخطيط' });
    }
  });

  // Generate social media image from card
  app.post("/api/cards/:cardId/social", async (req, res) => {
    try {
      const { cardId } = req.params;
      const { format, options = {} } = req.body;
      
      if (!format) {
        return res.status(400).json({ message: "نوع الصورة مطلوب" });
      }
      
      // Get the card
      const card = await storage.getCardByPublicId(cardId) || await storage.getCard(Number(cardId));
      
      if (!card) {
        return res.status(404).json({ message: "البطاقة غير موجودة" });
      }
      
      // Import social image generator
      const { generateSocialImage } = await import('./lib/social-image-generator');
      
      // Generate social media image
      const imagePath = await generateSocialImage(
        card.imageUrl,
        format,
        {
          quality: options.quality || 'medium',
          watermark: options.watermark,
          watermarkText: options.watermarkText,
          cropMode: options.cropMode || 'fit'
        }
      );
      
      res.json({
        success: true,
        imageUrl: imagePath
      });
    } catch (error) {
      console.error("Error generating social media image:", error);
      res.status(500).json({ message: "حدث خطأ أثناء إنشاء صورة لوسائل التواصل الاجتماعي" });
    }
  });
  
  // Get available social media formats
  app.get("/api/social-formats", async (req, res) => {
    try {
      // القيم المدعومة لتنسيقات الشبكات الاجتماعية
      const formats = {
        instagram: { 
          width: 1080, 
          height: 1080, 
          ratio: '1:1', 
          description: 'Instagram (Square)'
        },
        'instagram-portrait': { 
          width: 1080, 
          height: 1350, 
          ratio: '4:5', 
          description: 'Instagram (Portrait)'
        },
        'instagram-landscape': { 
          width: 1080, 
          height: 566, 
          ratio: '1.91:1', 
          description: 'Instagram (Landscape)'
        },
        'instagram-story': { 
          width: 1080, 
          height: 1920, 
          ratio: '9:16', 
          description: 'Instagram Story'
        },
        facebook: { 
          width: 1200, 
          height: 630, 
          ratio: '1.91:1', 
          description: 'Facebook'
        },
        twitter: { 
          width: 1200, 
          height: 675, 
          ratio: '16:9', 
          description: 'Twitter'
        },
        linkedin: { 
          width: 1200, 
          height: 627, 
          ratio: '1.91:1', 
          description: 'LinkedIn'
        },
        whatsapp: { 
          width: 800, 
          height: 800, 
          ratio: '1:1', 
          description: 'WhatsApp'
        }
      };
      
      res.json({ formats });
    } catch (error) {
      console.error("Error fetching social formats:", error);
      res.status(500).json({ message: "حدث خطأ أثناء جلب تنسيقات الوسائط الاجتماعية" });
    }
  });

  // تسجيل مسارات API الإدارية
  app.use('/api/admin/settings', adminSettingsRouter);
  
  // تم نقل هذا المسار إلى مسار مركزي موحد: /api/display-settings و /api/admin/display-settings
  app.use('/api/auth-settings', authSettingsRouter);
  app.use('/api/admin', adminStatsRouter);
  app.use('/api/admin/maintenance', adminMaintenanceRouter); // إضافة مسار API لأدوات الصيانة
  
  // تسجيل مسارات API للطبقات والشعارات والتوقيعات
  app.use('/api/layers', layersRouter);
  app.use('/api/logos', logosRouter);
  app.use('/api/signatures', signaturesRouter);
  app.use('/api/health', healthCheckRouter);  // إضافة مسار API لصحة النظام
  app.use('/api/seo', seoRouter);  // إضافة مسار API لإدارة SEO
  
  // إضافة مسار بسيط لفحص صحة النظام
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      message: 'النظام يعمل بشكل جيد',
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });
  
  // ============================
  // MEDIA LIBRARY API ENDPOINTS
  // ============================
  
  // Configure multer for media uploads
  const mediaUpload = multer({
    dest: uploadsDir,
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('نوع الملف غير مدعوم. يرجى استخدام JPG, PNG, GIF, أو WebP فقط.'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB max file size
    }
  });

  // Get user media files
  app.get('/api/media', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, search } = req.query;
      
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const result = await storage.getUserMediaFiles(userId, {
        limit: parseInt(limit as string),
        offset,
        search: search as string
      });
      
      res.json({
        files: result.files || [],
        total: result.total || 0,
        page: parseInt(page as string),
        totalPages: Math.ceil((result.total || 0) / parseInt(limit as string))
      });
    } catch (error) {
      console.error('Error fetching media files:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء تحميل الملفات' });
    }
  });

  // Upload media file
  app.post('/api/media/upload', isAuthenticated, mediaUpload.single('file'), async (req, res) => {
    let tempFilePath = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'لم يتم اختيار ملف' });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'غير مصرح بالوصول' });
      }

      const file = req.file;
      tempFilePath = file.path;
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: 'نوع الملف غير مدعوم. يرجى اختيار صورة صالحة' });
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ message: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت' });
      }
      
      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${randomUUID()}${fileExtension}`;
      const finalPath = path.join(uploadsDir, uniqueFilename);
      
      // Move file to final location with error handling
      try {
        fs.renameSync(tempFilePath, finalPath);
        tempFilePath = null; // File moved successfully
      } catch (moveError) {
        console.error('Error moving file:', moveError);
        return res.status(500).json({ message: 'فشل في حفظ الملف على الخادم' });
      }
      
      // Generate thumbnail
      let thumbnailUrl = null;
      try {
        if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
          const thumbnails = await generateThumbnails(finalPath, ['medium']);
          thumbnailUrl = thumbnails.medium || null;
        }
      } catch (thumbnailError) {
        console.error('Error generating thumbnail:', thumbnailError);
        // Continue without thumbnail - not critical
      }

      // Save to database with retry mechanism
      let mediaFile;
      let dbRetries = 3;
      
      while (dbRetries > 0) {
        try {
          mediaFile = await storage.createMediaFile({
            userId,
            filename: uniqueFilename,
            originalName: file.originalname,
            url: `/uploads/${uniqueFilename}`,
            thumbnailUrl,
            size: file.size,
            mimeType: file.mimetype
          });
          break; // Success
        } catch (dbError) {
          console.error(`Database error (${4 - dbRetries}/3):`, dbError);
          dbRetries--;
          
          if (dbRetries === 0) {
            // Remove uploaded file if database save failed
            try {
              if (fs.existsSync(finalPath)) {
                fs.unlinkSync(finalPath);
              }
            } catch (cleanupError) {
              console.error('Error cleaning up file:', cleanupError);
            }
            
            return res.status(500).json({ message: 'فشل في حفظ بيانات الملف في قاعدة البيانات' });
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      res.status(201).json(mediaFile);
    } catch (error) {
      console.error('Error uploading media file:', error);
      
      // Clean up temp file if still exists
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
      }
      
      res.status(500).json({ message: 'حدث خطأ غير متوقع أثناء رفع الملف' });
    }
  });

  // Delete media file
  app.delete('/api/media/:id', isAuthenticated, async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      const userId = req.user.id;
      
      if (isNaN(mediaId)) {
        return res.status(400).json({ message: 'رقم الملف غير صالح' });
      }
      
      // Verify file belongs to user
      const mediaFile = await storage.getMediaFile(mediaId);
      if (!mediaFile || mediaFile.userId !== userId) {
        return res.status(404).json({ message: 'الملف غير موجود' });
      }
      
      // Delete file from filesystem
      const filePath = path.join(process.cwd(), 'uploads', mediaFile.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete thumbnail if exists
      if (mediaFile.thumbnailUrl) {
        const thumbnailPath = path.join(process.cwd(), mediaFile.thumbnailUrl.replace(/^\//, ''));
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
      
      // Delete from database
      await storage.deleteMediaFile(mediaId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting media file:', error);
      res.status(500).json({ message: 'حدث خطأ أثناء حذف الملف' });
    }
  });

  // مسارات جديدة للتعامل مع حقول القوالب مع دعم الطبقات (zIndex)
  // الحصول على حقول قالب باستخدام معرف القالب
  app.get("/api/admin/template-fields/:templateId", isAdmin, getTemplateFields);
  
  // تحديث حقول القالب (إضافة، تعديل، حذف)
  app.put("/api/admin/template-fields/:templateId", isAdmin, updateTemplateFields);
  
  // حذف حقل محدد من القالب
  app.delete("/api/admin/template-fields/:templateId/:fieldId", isAdmin, deleteTemplateField);

  // Create HTTP server
  // إعداد مسارات تحليلات الشهادات
  setupCertificateAnalyticsRoutes(app, "/api");
  
  // إعداد مسارات تسجيل أخطاء العميل
  setupClientErrorLoggerRoutes(app, "/api");

  // Advanced Features API Routes

  // User Statistics and Dashboard
  app.get('/api/user/stats', isAuthenticated, async (req, res) => {
    try {
      const timeframe = req.query.timeframe || 'month';
      const userId = (req.user as any).id;
      
      // Get actual user statistics from database
      const totalCertificates = await db.select({ count: sql<number>`count(*)` })
        .from(certificates)
        .where(eq(certificates.userId, userId));
      
      const templatesUsed = await db.select({ count: sql<number>`count(distinct ${certificates.templateId})` })
        .from(certificates)
        .where(eq(certificates.userId, userId));

      const stats = {
        totalCertificates: totalCertificates[0]?.count || 0,
        templatesUsed: templatesUsed[0]?.count || 0,
        favoriteCategory: 'دعوات الزفاف',
        weeklyActivity: [80, 65, 90, 45, 75, 88, 92],
        monthlyGoal: 50,
        achievementLevel: 'متوسط',
        streakDays: 7
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ message: 'خطأ في جلب الإحصائيات' });
    }
  });

  // Smart Template Recommendations
  app.get('/api/user/recommendations', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Get user's most used templates and categories
      const userTemplates = await db.select()
        .from(templates)
        .innerJoin(certificates, eq(templates.id, certificates.templateId))
        .where(eq(certificates.userId, userId))
        .limit(5);

      const recommendations = userTemplates.map((item, index) => ({
        id: item.templates.id,
        title: item.templates.title,
        category: 'تصنيف عام',
        imageUrl: item.templates.imageUrl,
        reason: 'بناءً على استخدامك السابق',
        confidence: 95 - (index * 5),
        trending: index < 2
      }));
      
      res.json(recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({ message: 'خطأ في جلب الاقتراحات' });
    }
  });

  // Achievement System
  app.get('/api/user/achievements', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Get user's certificate count for achievements
      const certificateCount = await db.select({ count: sql<number>`count(*)` })
        .from(certificates)
        .where(eq(certificates.userId, userId));

      const totalCerts = certificateCount[0]?.count || 0;
      
      const achievements = [
        {
          id: 'first-certificate',
          title: 'First Certificate',
          titleAr: 'أول شهادة',
          description: 'Create your first certificate',
          descriptionAr: 'أنشئ أول شهادة لك',
          icon: '🎉',
          category: 'milestone',
          difficulty: 'bronze',
          points: 10,
          progress: Math.min(totalCerts, 1),
          maxProgress: 1,
          unlocked: totalCerts >= 1,
          requirements: ['إنشاء شهادة واحدة'],
          rewards: { points: 10, badge: 'مبتدئ' }
        },
        {
          id: 'certificate-creator',
          title: 'Certificate Creator',
          titleAr: 'منشئ الشهادات',
          description: 'Create 10 certificates',
          descriptionAr: 'أنشئ 10 شهادات',
          icon: '🏆',
          category: 'creation',
          difficulty: 'silver',
          points: 50,
          progress: Math.min(totalCerts, 10),
          maxProgress: 10,
          unlocked: totalCerts >= 10,
          requirements: ['إنشاء 10 شهادات'],
          rewards: { points: 50, badge: 'منشئ' }
        },
        {
          id: 'certificate-master',
          title: 'Certificate Master',
          titleAr: 'خبير الشهادات',
          description: 'Create 50 certificates',
          descriptionAr: 'أنشئ 50 شهادة',
          icon: '👑',
          category: 'creation',
          difficulty: 'gold',
          points: 100,
          progress: Math.min(totalCerts, 50),
          maxProgress: 50,
          unlocked: totalCerts >= 50,
          requirements: ['إنشاء 50 شهادة'],
          rewards: { points: 100, badge: 'خبير', title: 'خبير الشهادات' }
        }
      ];
      
      res.json(achievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ message: 'خطأ في جلب الإنجازات' });
    }
  });

  // User Level Information
  app.get('/api/user/level', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Calculate level based on certificate count
      const certificateCount = await db.select({ count: sql<number>`count(*)` })
        .from(certificates)
        .where(eq(certificates.userId, userId));

      const totalCerts = certificateCount[0]?.count || 0;
      const level = Math.floor(totalCerts / 10) + 1;
      const currentXP = (totalCerts % 10) * 10;
      const nextLevelXP = 100;

      const userLevel = {
        level,
        currentXP,
        nextLevelXP,
        title: level >= 5 ? 'خبير متقدم' : level >= 3 ? 'منشئ متوسط' : 'مبتدئ',
        perks: level >= 3 ? ['قوالب إضافية', 'أولوية في الدعم', 'تخصيص متقدم'] : ['الوصول للقوالب الأساسية']
      };
      
      res.json(userLevel);
    } catch (error) {
      console.error('Error fetching user level:', error);
      res.status(500).json({ message: 'خطأ في جلب مستوى المستخدم' });
    }
  });

  // Leaderboard
  app.get('/api/leaderboard', async (req, res) => {
    try {
      // Get top users by certificate count
      const topUsers = await db.select({
        username: users.username,
        fullName: users.fullName,
        certificateCount: sql<number>`count(${certificates.id})`
      })
      .from(users)
      .leftJoin(certificates, eq(users.id, certificates.userId))
      .groupBy(users.id, users.username, users.fullName)
      .orderBy(sql`count(${certificates.id}) desc`)
      .limit(10);

      const leaderboard = topUsers.map((user, index) => ({
        rank: index + 1,
        username: user.username,
        fullName: user.fullName,
        points: user.certificateCount * 10,
        level: Math.floor(user.certificateCount / 10) + 1,
        achievements: Math.floor(user.certificateCount / 5)
      }));
      
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ message: 'خطأ في جلب لوحة المتصدرين' });
    }
  });

  // Session Recovery
  app.get('/api/user/session', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Return empty session data - client will handle localStorage
      const sessionData = {
        lastActiveTab: 'dashboard',
        workInProgress: null,
        preferences: {
          autoSave: true,
          notifications: true
        }
      };
      
      res.json(sessionData);
    } catch (error) {
      console.error('Error fetching session data:', error);
      res.status(500).json({ message: 'خطأ في جلب بيانات الجلسة' });
    }
  });

  // Save Session Data
  app.post('/api/user/session', isAuthenticated, async (req, res) => {
    try {
      const { sessionData } = req.body;
      const userId = (req.user as any).id;
      
      // Session data is handled by client localStorage
      res.json({ 
        success: true, 
        message: 'تم حفظ بيانات الجلسة'
      });
    } catch (error) {
      console.error('Error saving session data:', error);
      res.status(500).json({ message: 'خطأ في حفظ بيانات الجلسة' });
    }
  });

  // Advanced Certificate Generation with Customization
  app.post('/api/certificates/advanced-generate', isAuthenticated, async (req, res) => {
    try {
      const { templateId, formData, customizations } = req.body;
      const userId = (req.user as any).id;
      
      // Get template
      const template = await storage.getTemplateById(templateId);
      if (!template) {
        return res.status(404).json({ message: 'القالب غير موجود' });
      }

      // Generate certificate with customizations
      const imageUrl = await generateCertificateImage(template, formData);
      
      // Create certificate record
      const newCertificate = await storage.createCertificate({
        userId,
        templateId,
        title: formData.title || 'شهادة جديدة',
        data: formData,
        imageUrl,
        code: generateVerificationCode()
      });
      
      res.json(newCertificate);
    } catch (error) {
      console.error('Error generating advanced certificate:', error);
      res.status(500).json({ message: 'خطأ في إنشاء الشهادة المتقدمة' });
    }
  });

  // Real-time Preview
  app.post('/api/certificates/preview', isAuthenticated, async (req, res) => {
    try {
      const { templateId, formData, customizations } = req.body;
      
      const template = await storage.getTemplateById(templateId);
      if (!template) {
        return res.status(404).json({ message: 'القالب غير موجود' });
      }

      // Generate preview (you could create a lighter version for previews)
      const previewUrl = await generateCertificateImage(template, formData);
      
      const preview = {
        previewUrl,
        generatedAt: new Date().toISOString()
      };
      
      res.json(preview);
    } catch (error) {
      console.error('Error generating preview:', error);
      res.status(500).json({ message: 'خطأ في إنشاء المعاينة' });
    }
  });

  // Claim Achievement Reward
  app.post('/api/user/achievements/claim', isAuthenticated, async (req, res) => {
    try {
      const { achievementId } = req.body;
      const userId = (req.user as any).id;
      
      res.json({ 
        success: true, 
        message: 'تم استلام الجائزة بنجاح',
        pointsAwarded: 25
      });
    } catch (error) {
      console.error('Error claiming achievement:', error);
      res.status(500).json({ message: 'خطأ في استلام الجائزة' });
    }
  });

  // Check for New Achievements
  app.post('/api/user/achievements/check', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const newAchievements: any[] = [];
      res.json(newAchievements);
    } catch (error) {
      console.error('Error checking achievements:', error);
      res.status(500).json({ message: 'خطأ في فحص الإنجازات' });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
