/**
 * وحدة مسارات تحليلات الشهادات
 * تحتوي على مسارات API للتعامل مع بيانات المشاهدات والمشاركات للشهادات
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { 
  certificates, 
  certificateViews, 
  certificateShares
} from '../../shared/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { isAuthenticated, isAdmin } from '../auth';

/**
 * إضافة مسارات تحليلات الشهادات
 * @param app تطبيق Express
 * @param apiPrefix بادئة مسارات API
 */
export function setupCertificateAnalyticsRoutes(app: any, apiPrefix: string) {
  
  // تسجيل مشاهدة شهادة
  app.post(`${apiPrefix}/certificates/:id/view`, async (req: Request, res: Response) => {
    try {
      const certificateId = parseInt(req.params.id);
      
      // التحقق من وجود الشهادة
      const certificateExists = await db.query.certificates.findFirst({
        where: eq(certificates.id, certificateId)
      });
      
      if (!certificateExists) {
        return res.status(404).json({ error: "الشهادة غير موجودة" });
      }
      
      // إضافة سجل مشاهدة
      await db.insert(certificateViews).values({
        certificateId,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || null
      });
      
      // تحديث عداد المشاهدات في الشهادة (اختياري)
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("خطأ في تسجيل مشاهدة الشهادة:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء تسجيل المشاهدة" });
    }
  });
  
  // تسجيل مشاركة شهادة
  app.post(`${apiPrefix}/certificates/:id/share`, async (req: Request, res: Response) => {
    try {
      const certificateId = parseInt(req.params.id);
      const { platform } = req.body;
      
      // التحقق من وجود الشهادة
      const certificateExists = await db.query.certificates.findFirst({
        where: eq(certificates.id, certificateId)
      });
      
      if (!certificateExists) {
        return res.status(404).json({ error: "الشهادة غير موجودة" });
      }
      
      // إضافة سجل مشاركة
      await db.insert(certificateShares).values({
        certificateId,
        platform: platform || null,
        ip: req.ip
      });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("خطأ في تسجيل مشاركة الشهادة:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء تسجيل المشاركة" });
    }
  });
  
  // الحصول على إحصائيات مشاهدات الشهادة (مسار محمي للمستخدمين المسجلين)
  app.get(`${apiPrefix}/certificates/:id/analytics`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const certificateId = parseInt(req.params.id);
      
      // التحقق من وجود الشهادة
      const certificate = await db.query.certificates.findFirst({
        where: eq(certificates.id, certificateId)
      });
      
      if (!certificate) {
        return res.status(404).json({ error: "الشهادة غير موجودة" });
      }
      
      // التأكد من أن المستخدم هو صاحب الشهادة أو مسؤول
      if (certificate.userId !== req.user?.id && !(req.user as any)?.isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بالوصول إلى هذه البيانات" });
      }
      
      // الحصول على عدد المشاهدات
      const viewsCount = await db.select({ count: count() })
        .from(certificateViews)
        .where(eq(certificateViews.certificateId, certificateId));
      
      // الحصول على عدد المشاركات
      const sharesCount = await db.select({ count: count() })
        .from(certificateShares)
        .where(eq(certificateShares.certificateId, certificateId));
      
      // الحصول على المشاهدات الأخيرة
      const recentViews = await db.select()
        .from(certificateViews)
        .where(eq(certificateViews.certificateId, certificateId))
        .orderBy(desc(certificateViews.viewedAt))
        .limit(10);
      
      // الحصول على المشاركات الأخيرة
      const recentShares = await db.select()
        .from(certificateShares)
        .where(eq(certificateShares.certificateId, certificateId))
        .orderBy(desc(certificateShares.sharedAt))
        .limit(10);
      
      // إرجاع النتائج
      return res.status(200).json({
        views: {
          total: viewsCount[0]?.count || 0,
          recent: recentViews
        },
        shares: {
          total: sharesCount[0]?.count || 0,
          recent: recentShares
        }
      });
    } catch (error) {
      console.error("خطأ في الحصول على إحصائيات الشهادة:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء الحصول على الإحصائيات" });
    }
  });
  
  // الحصول على إحصائيات عامة للمسؤولين
  app.get(`${apiPrefix}/analytics/dashboard`, isAdmin, async (req: Request, res: Response) => {
    try {
      // الحصول على إجمالي عدد المشاهدات
      const totalViews = await db.select({ count: count() })
        .from(certificateViews);
      
      // الحصول على إجمالي عدد المشاركات
      const totalShares = await db.select({ count: count() })
        .from(certificateShares);
      
      // الحصول على الشهادات الأكثر مشاهدة
      const mostViewedCertificates = await db.select({
        certificateId: certificateViews.certificateId,
        views: count(),
      })
      .from(certificateViews)
      .groupBy(certificateViews.certificateId)
      .orderBy(desc(count()))
      .limit(5);
      
      // الحصول على الشهادات الأكثر مشاركة
      const mostSharedCertificates = await db.select({
        certificateId: certificateShares.certificateId,
        shares: count(),
      })
      .from(certificateShares)
      .groupBy(certificateShares.certificateId)
      .orderBy(desc(count()))
      .limit(5);
      
      // إضافة معلومات الشهادات الأكثر مشاهدة
      const mostViewedWithDetails = await Promise.all(
        mostViewedCertificates.map(async (item) => {
          const cert = await db.query.certificates.findFirst({
            where: eq(certificates.id, item.certificateId)
          });
          return {
            ...item,
            title: cert?.title || "شهادة غير معروفة",
            issuedTo: cert?.issuedTo || "غير محدد"
          };
        })
      );
      
      // إضافة معلومات الشهادات الأكثر مشاركة
      const mostSharedWithDetails = await Promise.all(
        mostSharedCertificates.map(async (item) => {
          const cert = await db.query.certificates.findFirst({
            where: eq(certificates.id, item.certificateId)
          });
          return {
            ...item,
            title: cert?.title || "شهادة غير معروفة",
            issuedTo: cert?.issuedTo || "غير محدد"
          };
        })
      );
      
      // إرجاع النتائج
      return res.status(200).json({
        totalViews: totalViews[0]?.count || 0,
        totalShares: totalShares[0]?.count || 0,
        mostViewed: mostViewedWithDetails,
        mostShared: mostSharedWithDetails
      });
    } catch (error) {
      console.error("خطأ في الحصول على إحصائيات لوحة التحكم:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء الحصول على الإحصائيات" });
    }
  });
}