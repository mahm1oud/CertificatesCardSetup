import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * تحميل المتغيرات البيئية من ملف .env أو hostinger.config.js
 * هذا مفيد لتجنب الاعتماد على أدوات خارجية لتحميل المتغيرات البيئية
 */
export function loadEnv() {
  // تحميل ملف .env إذا كان موجودًا
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      
      for (const key in envConfig) {
        if (!process.env[key]) {
          process.env[key] = envConfig[key];
        }
      }
      
      // console.log("✅ تم تحميل المتغيرات البيئية من ملف .env");
    }
  } catch (error) {
    console.error("❌ خطأ في تحميل ملف .env:", error);
  }
  
  // تحميل ملف إعدادات هوستنجر إذا كان موجودًا
  // نقرأ الملف ونحلله يدويًا بدلاً من استخدام require (لتجنب مشاكل ESM)
  try {
    const hostingerConfigPath = path.join(process.cwd(), 'hostinger.config.js');
    if (fs.existsSync(hostingerConfigPath)) {
      // نقرأ الملف كنص ونحلله يدويًا
      const configContent = fs.readFileSync(hostingerConfigPath, 'utf8');
      
      // استخراج بيانات قاعدة البيانات باستخدام تعابير منتظمة بسيطة
      const hostMatch = configContent.match(/host:[\s]*['"]([^'"]+)['"]/);
      const userMatch = configContent.match(/user:[\s]*['"]([^'"]+)['"]/);
      const passwordMatch = configContent.match(/password:[\s]*['"]([^'"]+)['"]/);
      const nameMatch = configContent.match(/name:[\s]*['"]([^'"]+)['"]/);
      const portMatch = configContent.match(/port:[\s]*['"]([^'"]+)['"]/);
      
      const host = hostMatch ? hostMatch[1] : 'localhost';
      const user = userMatch ? userMatch[1] : '';
      const password = passwordMatch ? passwordMatch[1] : '';
      const name = nameMatch ? nameMatch[1] : '';
      const port = portMatch ? portMatch[1] : '3306';
      
      // إنشاء DATABASE_URL إذا لم يكن موجودًا وتم العثور على البيانات اللازمة
      if (!process.env.DATABASE_URL && user && password && name) {
        // إنشاء DATABASE_URL بتنسيق mysql://user:password@host:port/database
        process.env.DATABASE_URL = `mysql://${user}:${password}@${host}:${port}/${name}`;
        // console.log("✅ تم إنشاء DATABASE_URL من ملف hostinger.config.js");
      }
    }
  } catch (error) {
    console.error("❌ خطأ في تحميل ملف hostinger.config.js:", error);
  }
  
  // التأكد من وجود DATABASE_URL
  if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '3306';
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME;
    
    // إنشاء DATABASE_URL بتنسيق mysql://user:password@host:port/database
    process.env.DATABASE_URL = `mysql://${user}:${password}@${host}:${port}/${database}`;
    
    // console.log("✅ تم إنشاء DATABASE_URL من متغيرات البيئة المنفصلة");
  }
  
  // ضبط NODE_ENV إذا لم يكن موجودًا
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }
}

// تصدير الدالة كدالة افتراضية
export default loadEnv;