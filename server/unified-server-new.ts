/**
 * الخادم الموحد - يجمع بين الواجهة الأمامية والواجهة الخلفية
 * 
 * هذا الملف يدمج الواجهة الأمامية والخلفية في خادم واحد
 * لتسهيل النشر على استضافة واحدة (هوستنجر)
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import path from 'path';
import { setupAuth, isAuthenticated, isAdmin } from './auth';
import cors from 'cors';
import { registerRoutes } from './routes';
import { db, checkDatabaseConnection } from './lib/db-adapter';
import { ensureDefaultAdminExists } from './init-db';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer } from 'http';

// تحميل المتغيرات البيئية من ملف .env إذا كان موجوداً
dotenv.config();

// تحديد ما إذا كنا في بيئة الإنتاج أم التطوير
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;
console.log(`🔄 تشغيل التطبيق في بيئة: ${process.env.NODE_ENV || 'development'}`);

// إنشاء تطبيق Express
const app: Express = express();

// إعداد ميدلوير الأساسي
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// إعداد CORS للسماح بالطلبات من أي مصدر في بيئة التطوير
if (isDevelopment) {
  app.use(cors());
} else {
  // في الإنتاج، نقيد CORS للمصادر المحددة فقط
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || true,
    credentials: true
  }));
}

// إعداد الجلسات
const sessionSecret = process.env.SESSION_SECRET || 'default_session_secret_please_change_in_production';
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: isProduction, // في الإنتاج فقط استخدم HTTPS
    maxAge: 24 * 60 * 60 * 1000 // صلاحية الجلسة ليوم واحد
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
    const isConnected = await checkDatabaseConnection();
    
    if (isConnected) {
      console.log('✅ تم التحقق من صحة اتصال قاعدة البيانات');
    } else {
      console.error('❌ فشل التحقق من اتصال قاعدة البيانات');
      // لا نستخدم وضع الذاكرة المؤقتة بعد الآن - نتوقف عند فشل الاتصال
      throw new Error('فشل الاتصال بقاعدة البيانات');
    }

    // ضمان وجود مستخدم admin افتراضي
    console.log('🔄 التحقق من وجود مستخدم admin افتراضي...');
    await ensureDefaultAdminExists();
    console.log('✅ تم التحقق من وجود مستخدم admin');

    // إعداد واجهة برمجة التطبيقات (API)
    const server = await registerRoutes(app);

    // تحديد مسار ملفات الواجهة الأمامية (React) المبنية
    let publicDir = '';
    
    // 1. محاولة استخدام مجلد dist
    const distDir = path.resolve(process.cwd(), 'dist/public');
    
    // 2. محاولة استخدام مجلد client/build
    const clientBuildDir = path.resolve(process.cwd(), 'client/build');
    
    // 3. محاولة استخدام client/dist
    const clientDistDir = path.resolve(process.cwd(), 'client/dist');
    
    // 4. للتطوير، استخدام client/static
    const staticDir = path.resolve(process.cwd(), 'client/static');
    
    if (fs.existsSync(distDir)) {
      publicDir = distDir;
    } else if (fs.existsSync(clientBuildDir)) {
      publicDir = clientBuildDir;
    } else if (fs.existsSync(clientDistDir)) {
      publicDir = clientDistDir;
    } else if (fs.existsSync(staticDir)) {
      publicDir = staticDir;
    } else {
      console.warn('⚠️ لم يتم العثور على مجلد بناء الواجهة الأمامية، سيتم استخدام وضع التطوير فقط');
    }

    if (publicDir) {
      console.log(`📂 تقديم ملفات الواجهة الأمامية من: ${publicDir}`);
      
      // خدمة الملفات الثابتة مع تعيين أنواع MIME الصحيحة
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
      
      // ضمان عمل تطبيق React للصفحة الواحدة (SPA)
      app.get('*', (req, res, next) => {
        // تجاهل طلبات API
        if (req.path.startsWith('/api/')) {
          return next();
        }
        
        // إعادة توجيه كل الطلبات الأخرى إلى index.html
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
    // محاولة استخدام المنفذ 5000 أولاً، ثم 3000، ثم 80 إذا فشلت المحاولات السابقة
    const possiblePorts = [
      parseInt(process.env.PORT || '5000'), 
      5000, 
      3000, 
      80
    ];
    
    let activePort: number | null = null;
    let serverInstance = server; // استخدام الخادم المُعد من registerRoutes
    
    // محاولة الاستماع على جميع المنافذ المحتملة
    for (const port of possiblePorts) {
      try {
        if (!serverInstance) {
          serverInstance = createServer(app);
        }
        
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
            console.log(`${timestamp} [express] 🚀 الخادم الموحد يعمل على المنفذ ${port}`);
            resolve();
          });

          serverInstance.listen(port, '0.0.0.0');
        });
        
        // إذا نجح الاستماع، نخرج من الحلقة
        break;
      } catch (error) {
        console.log(`⚠️ فشل الاستماع على المنفذ ${port}:`, error);
        // استمر في المحاولة على المنفذ التالي
        serverInstance = null; // إعادة تعيين الخادم
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
    process.exit(1); // الخروج من العملية في حالة الفشل
  }
}

// بدء تشغيل الخادم
startUnifiedServer();

export { app };