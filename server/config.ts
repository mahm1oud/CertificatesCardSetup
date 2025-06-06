/**
 * ملف إعدادات مركزي للتطبيق
 * يحتوي على الإعدادات العامة للخادم، API، وقاعدة البيانات
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// تحميل ملف .env
dotenv.config();

// تحديد بيئة التشغيل
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = !isProduction;
export const isReplit = process.env.REPL_ID !== undefined;

// ملف الإعدادات الخارجي (هوستنجر)
export let hostingerConfig: any = null;
try {
  const hostingerConfigPath = path.join(process.cwd(), 'hostinger.config.js');
  if (fs.existsSync(hostingerConfigPath)) {
    hostingerConfig = require(hostingerConfigPath);
    console.log('✅ تم تحميل إعدادات هوستنجر بنجاح');
  }
} catch (error) {
  console.error('❌ خطأ في تحميل إعدادات هوستنجر:', error);
}

// إعدادات قاعدة البيانات
export const databaseConfig = {
  // نوع قاعدة البيانات (mysql أو postgres)
  // في Replit نستخدم postgres دائمًا، في الإنتاج نستخدم mysql عادة
  type: isReplit ? 'postgres' : (process.env.DB_TYPE || hostingerConfig?.database?.type || 'postgres'),
  
  // معلومات الاتصال بقاعدة البيانات
  host: process.env.DB_HOST || hostingerConfig?.database?.host || 'localhost',
  port: parseInt(process.env.DB_PORT || hostingerConfig?.database?.port || '5432'),
  user: process.env.DB_USER || hostingerConfig?.database?.user || 'colliderdbuser',
  password: process.env.DB_PASSWORD || hostingerConfig?.database?.password || '700125733Mm',
  database: process.env.DB_NAME || hostingerConfig?.database?.name || 'u240955251_colliderdb',
  url: process.env.DATABASE_URL || hostingerConfig?.database?.url || 'postgresql://colliderdbuser:700125733Mm@localhost:5432/u240955251_colliderdb',
  
  // خيارات متقدمة
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || hostingerConfig?.database?.connectionLimit || '10'),
  enableSsl: isProduction
};

// إعدادات الخادم
export const serverConfig = {
  // المنفذ الذي سيعمل عليه الخادم
  port: parseInt(process.env.PORT || hostingerConfig?.server?.port || '5000'),
  
  // المضيف الذي سيستمع عليه الخادم
  host: process.env.HOST || hostingerConfig?.server?.host || '0.0.0.0',
  
  // المسارات
  paths: {
    static: process.env.STATIC_DIR || hostingerConfig?.paths?.static || path.join(process.cwd(), 'client/static'),
    uploads: process.env.UPLOADS_DIR || hostingerConfig?.paths?.uploads || path.join(process.cwd(), 'uploads'),
    temp: process.env.TEMP_DIR || hostingerConfig?.paths?.temp || path.join(process.cwd(), 'temp'),
    fonts: process.env.FONTS_DIR || hostingerConfig?.paths?.fonts || path.join(process.cwd(), 'fonts'),
    logs: process.env.LOGS_DIR || hostingerConfig?.paths?.logs || path.join(process.cwd(), 'logs')
  },
  
  // إعدادات أمان الجلسات
  session: {
    secret: process.env.SESSION_SECRET || hostingerConfig?.security?.sessionSecret || 'default_session_secret',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || hostingerConfig?.security?.sessionMaxAge || '86400000') // يوم واحد بالملي ثانية
  }
};

// إعدادات API
export const apiConfig = {
  // بادئة مسارات API
  prefix: '/api',
  
  // المضيف المسموح به للطلبات (CORS)
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || hostingerConfig?.api?.allowedOrigins || ['*']
};

// عرض معلومات التشخيص
if (isDevelopment) {
  console.log(`🔄 تشغيل التطبيق في بيئة: ${isProduction ? 'إنتاج' : 'تطوير'}${isReplit ? ' (Replit)' : ''}`);
  console.log(`🔄 نوع قاعدة البيانات: ${databaseConfig.type}`);
  console.log(`🔄 المنفذ: ${serverConfig.port}`);
}

export default {
  isProduction,
  isDevelopment,
  isReplit,
  hostingerConfig,
  databaseConfig,
  serverConfig,
  apiConfig
};