/**
 * وحدة إعادة توجيه API
 * 
 * تستخدم في بيئة الإنتاج لإعادة توجيه طلبات API إلى النطاق المناسب
 * عندما تكون الواجهة الأمامية والخلفية في نفس الاستضافة
 * 
 * النسخة: 1.0.0
 * تاريخ التحديث: 2025-05-04
 */

import { Request, Response, NextFunction } from 'express';

// الحصول على عنوان API من متغيرات البيئة
const apiUrl = process.env.API_URL || 'https://collider.online';

/**
 * وسيط إعادة توجيه API
 * يستخدم لإعادة توجيه الطلبات من نطاق الواجهة الأمامية إلى نطاق الخادم الخلفي
 * 
 * @param req طلب Express
 * @param res استجابة Express
 * @param next الدالة التالية
 */
export function apiRedirectMiddleware(req: Request, res: Response, next: NextFunction) {
  // تنفيذ الوسيط فقط في بيئة الإنتاج
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // التحقق من وجود عنوان API ومن أن الطلب يبدأ بـ /api
  if (apiUrl && apiUrl !== '' && req.path.startsWith('/api')) {
    // في حالة كانت الخدمة نفسها هي التي تتلقى الطلب، عدم إعادة التوجيه
    const host = req.get('host');
    if (host && apiUrl.includes(host)) {
      console.log(`ℹ️ تجاهل إعادة توجيه API لنفس المضيف: ${host}`);
      return next();
    }
    
    const targetUrl = `${apiUrl}${req.path}`;
    console.log(`🔄 إعادة توجيه طلب API من ${req.path} إلى ${targetUrl}`);
    return res.redirect(targetUrl);
  }
  
  // استمرار في سلسلة الوسطاء إذا لم يتم إعادة التوجيه
  next();
}

/**
 * وسيط تصحيح مسارات API
 * يستخدم لتصحيح المسارات التي تعتمد على عنوان API المطلق في بيئة الإنتاج
 * 
 * @param req طلب Express
 * @param res استجابة Express
 * @param next الدالة التالية
 */
export function apiPathFixMiddleware(req: Request, res: Response, next: NextFunction) {
  // تنفيذ الوسيط فقط في بيئة الإنتاج
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // إذا كان الطلب يتضمن عنوان API المطلق، قم بتصحيحه
  if (apiUrl && apiUrl !== '' && req.url.includes(apiUrl)) {
    const originalUrl = req.url;
    req.url = req.url.replace(apiUrl, '');
    console.log(`🔧 تصحيح مسار API من ${originalUrl} إلى ${req.url}`);
  }
  
  // استمرار في سلسلة الوسطاء
  next();
}

export default {
  apiRedirectMiddleware,
  apiPathFixMiddleware
};