/**
 * إعدادات الاتصال بقاعدة بيانات PostgreSQL على استضافة هوستنجر
 * يستخدم هذا الملف لتكوين الاتصال مع قاعدة بيانات PostgreSQL في بيئة الإنتاج
 * 
 * النسخة: 3.0 - تاريخ التحديث: 2025-05-14
 * تحسينات الإصدار 3.0:
 * - تحويل الإعدادات للعمل مع PostgreSQL بدلاً من MySQL
 * - تبسيط إعدادات الاتصال بقاعدة البيانات
 * - تحسين معالجة الأخطاء والاتصالات
 * - دعم البيئات المختلفة
 */

module.exports = {
  /**
   * إعدادات الاتصال بقاعدة بيانات PostgreSQL
   * يجب تحديث هذه القيم بمعلومات الاتصال الخاصة بك على استضافة هوستنجر
   */
  database: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER || 'u240955251_colluser',
    password: process.env.PGPASSWORD || '700125733Mm',
    name: process.env.PGDATABASE || 'u240955251_colliderdb',
    // إعدادات إضافية للاتصال
    connectionString: process.env.DATABASE_URL || 'postgres://u240955251_colluser:700125733Mm@localhost:5432/u240955251_colliderdb',
    max: parseInt(process.env.PG_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000'), // 30 ثانية
    connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || '5000'), // 5 ثوان
    // إعدادات SSL (يمكن ضبطها حسب إعدادات هوستنجر)
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // إعدادات إعادة المحاولة
    retryAttempts: parseInt(process.env.PG_RETRY_ATTEMPTS || '5'),
    retryDelay: parseInt(process.env.PG_RETRY_DELAY || '2000'), // 2 ثانية
    // معالجة الأخطاء
    debug: process.env.PG_DEBUG === 'true' || false,
  },
  
  /**
   * إعدادات الخادم
   */
  server: {
    port: parseInt(process.env.PORT || '5000'),
    host: process.env.HOST || '0.0.0.0',
    protocol: process.env.PROTOCOL || 'http',
    domain: process.env.DOMAIN || 'localhost',
    // المسار الأساسي للتطبيق (في حالة الاستضافة تحت مجلد فرعي)
    basePath: process.env.BASE_PATH || '/',
    // خيارات CORS
    cors: {
      enabled: process.env.ENABLE_CORS === 'true' || true,
      origin: process.env.CORS_ORIGIN || '*',
      methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
    },
    // حدود الطلبات
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true' || false,
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 دقيقة
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 طلب لكل IP
    }
  },
  
  /**
   * المسارات ومجلدات التخزين
   */
  paths: {
    uploads: process.env.UPLOADS_DIR || 'uploads',
    temp: process.env.TEMP_DIR || 'temp',
    fonts: process.env.FONTS_DIR || 'fonts',
    public: process.env.PUBLIC_DIR || 'public',
    static: process.env.STATIC_DIR || 'client/static',
    logs: process.env.LOGS_DIR || 'logs',
    // حدود الملفات
    fileSizeLimits: {
      logo: parseInt(process.env.MAX_LOGO_SIZE || '2048000'), // 2MB
      signature: parseInt(process.env.MAX_SIGNATURE_SIZE || '1024000'), // 1MB
      profileImage: parseInt(process.env.MAX_PROFILE_IMAGE_SIZE || '5120000'), // 5MB
      batchFile: parseInt(process.env.MAX_BATCH_FILE_SIZE || '10240000'), // 10MB
    }
  },
  
  /**
   * إعدادات تطبيق Express.js
   */
  express: {
    trustProxy: process.env.TRUST_PROXY === 'true' || true,
    sessionSecret: process.env.SESSION_SECRET || 'certificates-secret-key',
    sessionName: process.env.SESSION_NAME || 'certificates.sid',
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '604800000'), // 7 أيام
    sessionSecure: process.env.SESSION_SECURE === 'true' || false, // يُفعل في الإنتاج مع HTTPS
    sessionSameSite: process.env.SESSION_SAME_SITE || 'lax',
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE || '604800000'), // 7 أيام
    // ضغط البيانات
    compression: process.env.ENABLE_COMPRESSION === 'true' || true,
  },
  
  /**
   * إعدادات التطبيق
   */
  app: {
    // إعدادات المستخدم الافتراضي
    defaultAdminUsername: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
    defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || '700700',
    defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
    defaultAdminName: process.env.DEFAULT_ADMIN_NAME || 'مدير النظام',
    // إعدادات التحقق من الصحة
    validation: {
      minPasswordLength: parseInt(process.env.MIN_PASSWORD_LENGTH || '6'),
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
      lockoutTime: parseInt(process.env.ACCOUNT_LOCKOUT_TIME || '1800000'), // 30 دقيقة
    },
    // إعدادات الصور
    images: {
      defaultQuality: process.env.DEFAULT_IMAGE_QUALITY || 'medium',
      webpEnabled: process.env.WEBP_ENABLED === 'true' || true,
      thumbnailWidth: parseInt(process.env.THUMBNAIL_WIDTH || '300'),
      previewQuality: parseInt(process.env.PREVIEW_QUALITY || '80'),
      downloadQuality: parseInt(process.env.DOWNLOAD_QUALITY || '100'),
    }
  },
  
  /**
   * إعدادات تتبع الأخطاء والتشخيص
   */
  diagnostics: {
    // تمكين تسجيل الأخطاء المفصل
    debug: process.env.DEBUG_MODE === 'true' || false,
    // مستوى التسجيل (error, warn, info, debug)
    logLevel: process.env.LOG_LEVEL || 'info',
    // تسجيل استعلامات قاعدة البيانات
    logQueries: process.env.LOG_QUERIES === 'true' || false,
    // تخزين الأخطاء في قاعدة البيانات
    storeErrors: process.env.STORE_ERRORS === 'true' || false,
    // إرسال الأخطاء بالبريد الإلكتروني
    emailErrors: process.env.EMAIL_ERRORS === 'true' || false,
    errorEmailRecipient: process.env.ERROR_EMAIL_RECIPIENT || '',
    // تسجيل أداء الطلبات
    performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true' || false,
    // توليد رموز تتبع للطلبات
    requestTracking: process.env.REQUEST_TRACKING === 'true' || true,
    // عرض الأخطاء للمستخدم النهائي
    showErrorDetails: process.env.SHOW_ERROR_DETAILS === 'true' || false,
    // وضع التطوير
    devMode: process.env.NODE_ENV === 'development',
  },
  
  /**
   * إعدادات الأمان
   */
  security: {
    // إعدادات JWT
    jwt: {
      secret: process.env.JWT_SECRET || 'certificates-jwt-secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    // إعدادات CSRF
    csrf: {
      enabled: process.env.CSRF_ENABLED === 'true' || true,
      csrfCookieName: process.env.CSRF_COOKIE_NAME || 'csrf-token',
      csrfSecret: process.env.CSRF_SECRET || 'certificates-csrf-secret',
    },
    // إعدادات رؤوس الأمان HTTP
    securityHeaders: {
      enabled: process.env.SECURITY_HEADERS_ENABLED === 'true' || true,
      xssProtection: process.env.XSS_PROTECTION === 'false' ? false : true,
      contentTypeOptions: process.env.CONTENT_TYPE_OPTIONS === 'false' ? false : true,
      frameguard: process.env.FRAMEGUARD === 'false' ? false : true,
    }
  }
};