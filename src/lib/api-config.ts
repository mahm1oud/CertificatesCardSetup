/**
 * ملف تكوين API
 * 
 * يحتوي على الإعدادات اللازمة للاتصال بالخادم الخلفي
 * يستخدم في جميع أنحاء التطبيق للحصول على عنوان API المناسب
 * 
 * النسخة: 2.0.0
 * تاريخ التحديث: مايو 2025
 * 
 * التحديثات في الإصدار 2.0:
 * - دعم خادم موحد (الواجهة والخلفية في نفس المكان)
 * - التوافق مع استضافة هوستنجر
 */

// معرفة بيئة التشغيل
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// عنوان API الافتراضي في الإنتاج (عند تثبيته على نفس المضيف)
const PRODUCTION_API_RELATIVE = '/api';

// عنوان API المطلق في حالة اختلاف المضيف
const PRODUCTION_API_ABSOLUTE = import.meta.env.VITE_API_URL || '';

// تعيين عنوان API المناسب بناءً على بيئة التشغيل
// في كل الأحوال نستخدم المسار النسبي للتوافق مع الخادم الموحد
export const API_BASE_URL = PRODUCTION_API_RELATIVE;

/**
 * إنشاء مسار API كامل
 * 
 * @param endpoint نهاية المسار بدون / في البداية
 * @returns مسار API الكامل
 */
export function getApiUrl(endpoint: string): string {
  // التأكد من أن المسار يبدأ بـ /
  let normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // التأكد من أن المسار يبدأ بـ /api
  if (!normalizedEndpoint.startsWith('/api')) {
    normalizedEndpoint = `/api${normalizedEndpoint}`;
  }
  
  // حذف الـ /api المكرر إذا وجد
  normalizedEndpoint = normalizedEndpoint.replace('/api/api/', '/api/');
  
  return normalizedEndpoint;
}

/**
 * تحديد ما إذا كان التطبيق يعمل في بيئة التطوير أم لا
 */
export const isDevEnvironment = isDevelopment;

/**
 * معلومات التصحيح
 */
console.log('🔄 تشغيل التطبيق في بيئة:', isDevelopment ? 'development' : 'production');
console.log('🌐 عنوان API:', API_BASE_URL);

export default {
  API_BASE_URL,
  getApiUrl,
  isDevEnvironment,
  isProduction
};