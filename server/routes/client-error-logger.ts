/**
 * مسارات تسجيل أخطاء العميل
 * تعالج أخطاء واجهة المستخدم وترسلها إلى نظام تتبع الأخطاء الموحد
 * 
 * @file routes/client-error-logger.ts
 */

import { Express, Request, Response } from 'express';
import { logger } from '../lib/error-tracker';

export function setupClientErrorLoggerRoutes(app: Express, prefix: string = '') {
  /**
   * نقطة نهاية لتسجيل أخطاء العميل
   * 
   * تتلقى معلومات الأخطاء من واجهة المستخدم وتسجلها في نظام تتبع الأخطاء
   */
  app.post(`${prefix}/log-client-error`, async (req: Request, res: Response) => {
    try {
      // استخراج بيانات الخطأ من الطلب
      const {
        message,
        name,
        stack,
        componentStack,
        userAgent,
        url,
        timestamp,
        details
      } = req.body;

      // إنشاء رسالة خطأ منسقة
      const errorMessage = `[CLIENT ERROR] ${name || 'Error'}: ${message}`;

      // تسجيل الخطأ باستخدام نظام تتبع الأخطاء
      await logger.clientError(errorMessage, {
        stack,
        componentStack,
        url,
        userAgent,
        timestamp,
        details
      }, req);

      // إرسال استجابة النجاح
      res.status(200).json({
        success: true,
        message: 'تم تسجيل الخطأ بنجاح',
        errorId: new Date().getTime().toString()
      });
    } catch (error) {
      console.error('فشل في معالجة طلب تسجيل خطأ العميل:', error);

      // حتى في حالة الفشل، نرسل استجابة نجاح للعميل
      // لأننا لا نريد أن يؤثر فشل التسجيل على تجربة المستخدم
      res.status(200).json({
        success: false,
        message: 'حدث خطأ أثناء معالجة طلب تسجيل الخطأ',
        errorId: null
      });
    }
  });

  // نقطة نهاية للتحقق من حالة نظام تتبع الأخطاء (للاستخدام في البيئات الداخلية)
  if (process.env.NODE_ENV === 'development') {
    app.get(`${prefix}/error-tracking-status`, (_req: Request, res: Response) => {
      try {
        // إرسال حالة نظام تتبع الأخطاء
        res.status(200).json({
          isEnabled: true,
          logLevel: process.env.LOG_LEVEL || 'info',
          storageType: process.env.ERROR_STORAGE_TYPE || 'file',
          healthStatus: 'operational'
        });
      } catch (error) {
        console.error('فشل في الحصول على حالة نظام تتبع الأخطاء:', error);
        res.status(500).json({
          error: 'حدث خطأ أثناء الحصول على حالة نظام تتبع الأخطاء'
        });
      }
    });

    // نقطة نهاية لاختبار تسجيل الأخطاء (للاستخدام في البيئات الداخلية)
    app.get(`${prefix}/test-error-tracking`, (_req: Request, res: Response) => {
      try {
        // إطلاق خطأ اختباري
        throw new Error('هذا خطأ اختباري لنظام تتبع الأخطاء');
      } catch (error) {
        // تسجيل الخطأ
        logger.error(error instanceof Error ? error : new Error(String(error)));

        // إرسال استجابة النجاح
        res.status(200).json({
          success: true,
          message: 'تم تسجيل الخطأ الاختباري بنجاح'
        });
      }
    });
  }
}