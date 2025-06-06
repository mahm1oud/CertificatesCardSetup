/**
 * الخادم الموحد - النسخة النهائية
 * يجمع بين واجهة المستخدم والواجهة الخلفية في خادم واحد
 * 
 * المميزات:
 * - تثبيت سهل على استضافة هوستنجر
 * - دعم MySQL (الإنتاج) و PostgreSQL (التطوير في Replit)
 * - تكامل كامل بين واجهة المستخدم و API
 * - إدارة الخطأ المحسنة والسجلات التفصيلية
 * 
 * الإصدار: 1.0
 * التاريخ: مايو 2025
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { createServer, Server } from 'http';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';

// استيراد وحدات المشروع
import { setupAuth, isAuthenticated, isAdmin } from './auth';
import { db, checkDatabaseConnection, withDatabaseRetry } from './lib/db-adapter';
import { ensureDefaultAdminExists } from './init-db';
import { storage } from './storage';
import { registerRoutes } from './routes';

// تحميل المتغيرات البيئية
dotenv.config();

// تحديد بيئة التشغيل
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;
const isReplit = process.env.REPL_ID !== undefined;

console.log(`🔄 تشغيل التطبيق في بيئة: ${process.env.NODE_ENV || 'development'}${isReplit ? ' (Replit)' : ''}`);

// قراءة إعدادات هوستنجر إذا كانت موجودة
let hostingerConfig: any = null;
try {
  const hostingerConfigPath = path.join(process.cwd(), 'hostinger.config.js');
  if (fs.existsSync(hostingerConfigPath)) {
    hostingerConfig = require(hostingerConfigPath);
    console.log('✅ تم تحميل إعدادات هوستنجر بنجاح');
  }
} catch (error) {
  console.error('❌ خطأ في تحميل إعدادات هوستنجر:', error);
}

// إنشاء تطبيق Express
const app: Express = express();

// إعداد ميدلوير الأساسي
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// إعداد CORS
if (isDevelopment) {
  app.use(cors());
} else {
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || hostingerConfig?.api?.allowedOrigins || '*',
    credentials: true
  }));
}

// إعداد مجلدات النظام
const uploadsDir = process.env.UPLOADS_DIR || hostingerConfig?.paths?.uploads || path.join(process.cwd(), 'uploads');
const tempDir = process.env.TEMP_DIR || hostingerConfig?.paths?.temp || path.join(process.cwd(), 'temp');
const logsDir = process.env.LOGS_DIR || hostingerConfig?.paths?.logs || path.join(process.cwd(), 'logs');

// التأكد من وجود المجلدات الضرورية
for (const dir of [uploadsDir, tempDir, logsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ تم إنشاء مجلد: ${dir}`);
  }
}

// إعداد تحميل الملفات
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, tempDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// إعداد الجلسات
const sessionSecret = process.env.SESSION_SECRET || hostingerConfig?.security?.sessionSecret || 'default_session_secret_change_in_production';
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000 // يوم واحد
  }
}));

// إعداد المصادقة
setupAuth(app);

/**
 * وظيفة تشغيل الخادم الموحد
 */
async function startUnifiedServer() {
  try {
    // محاولة الاتصال بقاعدة البيانات
    console.log('🔄 جاري الاتصال بقاعدة البيانات...');
    
    try {
      const isConnected = await checkDatabaseConnection();
      if (isConnected) {
        console.log('✅ تم التحقق من صحة اتصال قاعدة البيانات');
      } else {
        throw new Error('فشل التحقق من اتصال قاعدة البيانات');
      }
    } catch (dbError) {
      console.error('❌ خطأ في الاتصال بقاعدة البيانات:', dbError);
      throw dbError; // إعادة رمي الخطأ للتوقف
    }

    // ضمان وجود مستخدم admin افتراضي
    console.log('🔄 التحقق من وجود مستخدم admin افتراضي...');
    try {
      await ensureDefaultAdminExists();
      console.log('✅ تم التحقق من وجود مستخدم admin');
    } catch (adminError) {
      console.error('❌ خطأ في التحقق من مستخدم admin:', adminError);
      throw adminError;
    }

    // إعداد المسارات
    console.log('🔄 تسجيل مسارات API...');
    const server = await registerRoutes(app);

    // إعداد الملفات الثابتة
    let publicDir = '';
    
    // محاولة العثور على مجلد الملفات الثابتة
    const possibleDirs = [
      path.resolve(process.cwd(), 'dist/public'),
      path.resolve(process.cwd(), 'client/build'),
      path.resolve(process.cwd(), 'client/dist'),
      path.resolve(process.cwd(), 'client/static')
    ];
    
    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        publicDir = dir;
        break;
      }
    }
    
    if (!publicDir) {
      console.warn('⚠️ لم يتم العثور على مجلد الملفات الثابتة، سيتم استخدام وضع API فقط');
    } else {
      console.log(`📂 تقديم الملفات الثابتة من: ${publicDir}`);
      
      // خدمة الملفات الثابتة
      app.use(express.static(publicDir, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          }
        }
      }));
      
      // تقديم uploads للوصول إلى الملفات المرفوعة
      app.use('/uploads', express.static(uploadsDir));
      
      // إعادة توجيه كل المسارات غير API إلى index.html
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next();
        }
        res.sendFile(path.join(publicDir, 'index.html'));
      });
    }
    
    // معالجة الأخطاء العامة
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      console.error('❌ خطأ في الخادم:', err);
      res.status(500).json({
        message: 'حدث خطأ في الخادم',
        error: isDevelopment ? err.message : undefined
      });
    });

    // تحديد المنفذ للاستماع
    const possiblePorts = [
      parseInt(process.env.PORT || '5000'), 
      5000, 
      3000, 
      80
    ];
    
    // محاولة الاستماع على المنافذ المتاحة
    let activePort: number | null = null;
    let serverInstance = server || createServer(app);
    
    for (const port of possiblePorts) {
      try {
        await new Promise<void>((resolve, reject) => {
          serverInstance.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              console.log(`⚠️ المنفذ ${port} مستخدم بالفعل، جارٍ تجربة منفذ آخر...`);
              reject(new Error(`المنفذ ${port} مستخدم بالفعل`));
            } else {
              console.error(`❌ خطأ في بدء الخادم على المنفذ ${port}:`, err);
              reject(err);
            }
          });

          serverInstance.on('listening', () => {
            activePort = port;
            const timestamp = new Date().toLocaleTimeString();
            console.log(`${timestamp} [unified] 🚀 الخادم الموحد يعمل على المنفذ ${port}`);
            resolve();
          });

          serverInstance.listen(port, '0.0.0.0');
        });
        
        break; // إذا نجح الاستماع، نخرج من الحلقة
      } catch (error) {
        console.log(`⚠️ فشل الاستماع على المنفذ ${port}:`, error);
        serverInstance = createServer(app); // إعادة تعيين الخادم للمحاولة التالية
      }
    }

    if (!activePort) {
      throw new Error('فشل الخادم في الاستماع على أي منفذ متاح');
    }

    // معالجة الأخطاء غير المتوقعة
    process.on('uncaughtException', (error: Error) => {
      console.error('❌ خطأ غير متوقع:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ وعد مرفوض غير معالج:', reason);
    });
    
    return { server: serverInstance, port: activePort };
  } catch (error) {
    console.error('❌ فشل في بدء الخادم الموحد:', error);
    process.exit(1);
  }
}

// بدء تشغيل الخادم
startUnifiedServer();

export { app };