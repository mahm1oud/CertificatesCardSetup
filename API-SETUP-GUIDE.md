# دليل إعداد API لمنصة الشهادات والبطاقات

## نظرة عامة

هذا الدليل يشرح كيفية إعداد اتصال API بين الواجهة الأمامية والخلفية للتطبيق. تم تصميم النظام ليعمل بشكل مرن في كل من بيئة التطوير المحلية وبيئة الإنتاج على استضافة خارجية مثل Hostinger.

## الإعداد السريع

### 1. تكوين عنوان API

لإعداد عنوان API بسرعة، استخدم سكريبت الإعداد السريع:

```bash
chmod +x install/scripts/hostinger-quick-setup.sh
./install/scripts/hostinger-quick-setup.sh --domain collider.online
```

هذا السكريبت سيقوم بتكوين جميع الملفات اللازمة لاستخدام `https://collider.online` كعنوان API.

### 2. الإعداد اليدوي

إذا كنت ترغب في الإعداد اليدوي، قم بتعديل الملفات التالية:

1. **ملف .env**:
   ```
   API_URL=https://collider.online
   ```

2. **ملف client/src/lib/api-config.ts**:
   ```typescript
   const PRODUCTION_API_URL = 'https://collider.online';
   ```

## كيف يعمل نظام الاتصال بـ API

### في بيئة التطوير

في بيئة التطوير، يتم استخدام المسارات النسبية للاتصال بالخادم المحلي:

1. عندما يقوم العميل بطلب `/api/templates`، يتم توجيهه مباشرة إلى الخادم المحلي
2. لا يتم استخدام عنوان API المطلق في هذه الحالة

### في بيئة الإنتاج

في بيئة الإنتاج، يتم استخدام عنوان API المطلق لتوجيه الطلبات:

1. الطلبات التي تبدأ بـ `/api/` يتم توجيهها إلى `https://collider.online/api/`
2. يعمل وسيط `apiRedirectMiddleware` على التعامل مع إعادة التوجيه بشكل صحيح
3. يعمل وسيط `apiPathFixMiddleware` على تصحيح المسارات المطلقة إذا لزم الأمر

## مكونات النظام

### 1. تكوين API المركزي

ملف `client/src/lib/api-config.ts` يحدد العنوان الأساسي للـ API ويوفر دوال لتحويل المسارات.

```typescript
// بيئة التطوير: مسار نسبي
// بيئة الإنتاج: عنوان مطلق
export const API_BASE_URL = isProduction 
  ? PRODUCTION_API_URL 
  : '';
```

### 2. عميل الاستعلام

ملف `client/src/lib/queryClient.ts` يستخدم تكوين API لتوجيه الطلبات بشكل صحيح:

```typescript
// معالجة عنوان URL ليكون مناسبًا للبيئة
url = processApiUrl(url);
```

### 3. وسائط الخادم

ملف `server/lib/api-redirect.ts` يحتوي على وسائط لإعادة توجيه وتصحيح طلبات API:

```typescript
// وسيط إعادة توجيه API
export function apiRedirectMiddleware(req: Request, res: Response, next: NextFunction) {
  // تنفيذ الوسيط فقط في بيئة الإنتاج
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // إعادة توجيه الطلبات حسب الحاجة
  // ...
}
```

## السيناريوهات المدعومة

1. **التطوير المحلي**: واجهة أمامية وخلفية على نفس الخادم المحلي
2. **الإنتاج على نفس الخادم**: واجهة أمامية وخلفية على نفس خادم الإنتاج
3. **الإنتاج على خوادم منفصلة**: واجهة أمامية على خادم وخلفية على خادم آخر

## استكشاف الأخطاء وإصلاحها

### مشكلة: طلبات API تفشل

1. تحقق من أن عنوان API صحيح وقابل للوصول
2. تأكد من أن متغيرات البيئة تم تعيينها بشكل صحيح
3. راجع سجلات الخطأ في مجلد `logs`

### مشكلة: أخطاء CORS

إذا واجهت أخطاء CORS:

1. تأكد من تمكين CORS في ملف `.env`:
   ```
   ENABLE_CORS=true
   CORS_ORIGIN=https://collider.online
   ```

2. إذا كنت تستخدم Apache، تأكد من وجود إعدادات CORS في ملف `.htaccess`:
   ```apache
   Header set Access-Control-Allow-Origin "*"
   Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
   ```

## المزيد من الموارد

للحصول على معلومات أكثر تفصيلاً:

- [دليل اتصال API](docs/API-CONNECTION.md) - دليل مفصل حول آلية عمل الاتصال بـ API
- [دليل النشر على Hostinger](HOSTINGER-DEPLOYMENT-GUIDE.md) - دليل شامل لنشر التطبيق على Hostinger
- [دليل استكشاف الأخطاء وإصلاحها](TROUBLESHOOTING-GUIDE.md) - حلول للمشكلات الشائعة

---

**تاريخ التحديث:** مايو 2025