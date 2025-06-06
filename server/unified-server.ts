/**
 * الخادم الموحد - يجمع بين واجهة المستخدم والواجهة الخلفية
 * 
 * استخدم هذا الملف للاستضافة على خادم واحد حيث يتم تقديم كل من:
 * 1. واجهة المستخدم (React)
 * 2. واجهة برمجة التطبيقات (API)
 * من نفس الخادم
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import path from 'path';
import { setupAuth, isAuthenticated, isAdmin } from './auth';
import { setupRoutes } from './routes';
import cors from 'cors';
import { db, checkDatabaseConnection } from './lib/db-adapter';
import { ensureDefaultAdminExists } from './init-db';
import fs from 'fs';
import dotenv from 'dotenv';

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

// التحقق من اتصال قاعدة البيانات
try {
  const isConnected = await checkDatabaseConnection();
  if (isConnected) {
    console.log('✅ تم التحقق من صحة اتصال قاعدة البيانات');
  } else {
    console.error('❌ فشل التحقق من اتصال قاعدة البيانات');
  }
} catch (error) {
  console.error('❌ خطأ أثناء التحقق من اتصال قاعدة البيانات:', error);
}

// ضمان وجود مستخدم admin افتراضي
console.log('🔄 التحقق من وجود مستخدم admin افتراضي...');
try {
  await ensureDefaultAdminExists();
  console.log('✅ تم التحقق من وجود مستخدم admin');
} catch (error) {
  console.error('❌ خطأ أثناء التحقق من مستخدم admin:', error);
}

// إعداد المسارات API
setupRoutes(app);

// حساب مسار ملفات واجهة المستخدم (React) المبنية
let publicDir = path.resolve(__dirname, '../dist/public');

// التحقق من وجود مجلد الواجهة المبنية
if (!fs.existsSync(publicDir)) {
  console.warn(`⚠️ مجلد الواجهة المبنية غير موجود في ${publicDir}`);
  console.warn('⚠️ سيتم استخدام مجلد client/static كبديل مؤقت للاختبار');
  
  // استخدام المجلد البديل للاختبار
  publicDir = path.resolve(__dirname, '../client/static');
}

// تقديم الملفات الثابتة من مجلد dist/public (بناء React)
app.use(express.static(publicDir));
console.log(`📂 تقديم الملفات الثابتة من: ${publicDir}`);

// تعامل مع جميع الطلبات المتبقية بإرجاع صفحة index.html (للتوافق مع تطبيق React للصفحة الواحدة)
app.get('*', (req, res) => {
  // استثناء مسارات API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  
  // إرسال ملف index.html
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('التطبيق غير متوفر حالياً. يرجى التحقق من عملية البناء.');
  }
});

// معالجة الأخطاء العامة
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ خطأ في الخادم:', err);
  res.status(500).json({
    message: 'حدث خطأ في الخادم',
    error: isDevelopment ? err.message : undefined
  });
});

// تحديد المنفذ للاستماع
const port = process.env.PORT || 5000;

// بدء الاستماع
app.listen(port, () => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [express] 🚀 الخادم الموحد يعمل على المنفذ ${port}`);
});

// معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (error: Error) => {
  console.error('❌ خطأ غير متوقع:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ وعد مرفوض غير معالج:', reason);
});