/**
 * محول قاعدة البيانات - الإصدار 4.0
 * 
 * هدف هذا الملف: 
 * 1) استخدام PostgreSQL كقاعدة بيانات رئيسية للمشروع في جميع البيئات
 * 
 * الإستراتيجية:
 * - استخدام PostgreSQL في جميع البيئات (التطوير والإنتاج) للاتساق والتوافق
 */

import { loadEnv } from './env-loader';
import * as pgAdapter from '../db';        // استيراد محول PostgreSQL

// تحميل المتغيرات البيئية
loadEnv();

// تحديد بيئة التشغيل
const isReplit = process.env.REPL_ID !== undefined;
const isProduction = process.env.NODE_ENV === 'production';

// استخدام PostgreSQL دائمًا
const DB_TYPE = 'postgres';

// إظهار المعلومات التشخيصية
console.log(`\n==== معلومات قاعدة البيانات ====`);
console.log(`🌐 البيئة: ${isProduction ? 'إنتاج' : 'تطوير'}${isReplit ? ' (Replit)' : ''}`);
console.log(`🔄 نوع قاعدة البيانات: ${DB_TYPE}`);

// استخدام محول PostgreSQL
const adapter = pgAdapter;

// تصدير الواجهة الموحدة
export const pool = adapter.pool;
export const db = adapter.db;
export const checkDatabaseConnection = adapter.checkDatabaseConnection;
export const withDatabaseRetry = adapter.withDatabaseRetry;
export const getDatabaseInfo = () => ({ 
  type: DB_TYPE,
  usingMemoryMode: false
});

// تصدير المحول كاملاً كـمحول افتراضي
export default adapter;