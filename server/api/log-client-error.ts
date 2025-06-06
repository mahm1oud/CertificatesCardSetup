/**
 * نقطة نهاية لتسجيل أخطاء العميل (المتصفح)
 * تستخدم من قبل مكون ErrorBoundary ومعالجات الأخطاء الأخرى في واجهة المستخدم
 */

import { Request, Response } from 'express';
import { logger } from '../lib/error-tracker';

interface ClientErrorPayload {
  message: string;
  name: string;
  stack?: string;
  componentStack?: string;
  userAgent?: string;
  url?: string;
  timestamp: string;
  details?: any;
}

/**
 * معالج تسجيل أخطاء العميل
 * @param req الطلب
 * @param res الاستجابة
 */
export async function logClientError(req: Request, res: Response) {
  try {
    const errorData: ClientErrorPayload = req.body;
    
    if (!errorData || !errorData.message) {
      return res.status(400).json({ error: 'بيانات غير صالحة' });
    }
    
    // إنشاء رسالة خطأ منسقة
    const errorMessage = `خطأ العميل: ${errorData.name || 'Unknown'}: ${errorData.message}`;
    
    // تسجيل الخطأ باستخدام نظام تتبع الأخطاء
    await logger.clientError(errorMessage, {
      stack: errorData.stack,
      componentStack: errorData.componentStack,
      url: errorData.url || req.headers.referer,
      userAgent: errorData.userAgent || req.headers['user-agent'],
      timestamp: errorData.timestamp,
      details: errorData.details
    }, req);
    
    // الرد بنجاح
    res.status(200).json({ success: true, errorId: Date.now().toString() });
  } catch (error) {
    console.error('فشل في تسجيل خطأ العميل:', error);
    res.status(500).json({ error: 'فشل في تسجيل الخطأ' });
  }
}

// تصدير الدالة
export default logClientError;