/**
 * ملف إعدادات الإنتاج - يستخدم عند نشر التطبيق على استضافة هوستنجر أو خوادم أخرى
 */

module.exports = {
  // إعدادات البيئة
  environment: 'production',
  
  // إعدادات قاعدة البيانات PostgreSQL
  database: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER || 'u240955251_colluser',
    password: process.env.PGPASSWORD || '700125733Mm',
    name: process.env.PGDATABASE || 'u240955251_colliderdb',
    connectionString: process.env.DATABASE_URL || 'postgres://u240955251_colluser:700125733Mm@localhost:5432/u240955251_colliderdb',
    ssl: true,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },
  
  // إعدادات الخادم
  server: {
    port: parseInt(process.env.PORT || '5000'),
    host: '0.0.0.0',
    trustProxy: true,
    compression: true,
    corsEnabled: true,
    corsOrigin: '*',
    rateLimitEnabled: true,
    rateLimitMax: 200, // عدد الطلبات المسموح بها لكل فترة
    rateLimitWindowMs: 60 * 1000, // فترة زمنية (دقيقة واحدة)
  },
  
  // إعدادات الأمان
  security: {
    jwtSecret: process.env.JWT_SECRET || '30c7e56c42aeca4c2f3e114beda2c6c12d9b9d82be9b27e30a37f123c5ab5ef2',
    jwtExpiresIn: '7d',
    csrfEnabled: true,
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https://static.yourdomain.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "wss://yourdomain.com"],
        },
      },
      xssFilter: true,
      noSniff: true,
      frameguard: true,
    },
  },
  
  // إعدادات التخزين والملفات
  storage: {
    uploadsDir: './uploads',
    staticDir: './client/dist/static',
    tempDir: './temp',
    fontsDir: './fonts',
    maxFileSize: 5 * 1024 * 1024, // 5 ميجابايت
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'application/pdf'],
  },
  
  // إعدادات التسجيل
  logging: {
    level: 'info', // error, warn, info, debug
    logToFile: true,
    logDir: './logs',
    errorLogFile: 'error.log',
    accessLogFile: 'access.log',
    rotateInterval: '1d',
    storeErrorsInDb: true,
    performanceLogging: false,
  },
  
  // إعدادات التطبيق
  app: {
    defaultAdminUsername: 'admin',
    defaultAdminPassword: '700700',
    certificateVerificationEnabled: true,
    defaultImageQuality: 'high',
    useCDN: false,
    cdnUrl: '', // إذا كنت تستخدم CDN
    emailEnabled: false,
    maximumBatchSize: 1000,
  },
  
  // URLs
  urls: {
    baseUrl: 'https://yourdomain.com',
    apiUrl: 'https://yourdomain.com/api',
    staticUrl: 'https://yourdomain.com/static',
  },
};