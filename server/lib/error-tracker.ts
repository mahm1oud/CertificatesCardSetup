/**
 * نظام تتبع الأخطاء المركزي
 * يوفر واجهة موحدة لتسجيل وتتبع الأخطاء في كل من العميل والخادم
 * 
 * الميزات:
 * - تسجيل الأخطاء في ملفات على الخادم (الإعداد الافتراضي)
 * - التصفية حسب مستوى الأهمية
 * - دعم تتبع سياق الطلب
 * - دعم تتبع معلومات المستخدم (إذا كان مسجّلاً)
 * - إمكانية تكامل مع خدمات تتبع الأخطاء الخارجية (Sentry، LogRocket، إلخ)
 * 
 * @file lib/error-tracker.ts
 */

import fs from 'fs';
import path from 'path';
import { Request } from 'express';

/**
 * تكوين نظام تتبع الأخطاء
 */
interface ErrorTrackerConfig {
  logLevel: LogLevel;            // مستوى تفاصيل السجل
  storage: StorageType;          // طريقة تخزين سجلات الأخطاء
  logDirectory: string;          // مسار مجلد السجلات (إذا كان نوع التخزين ملف)
  maxLogSize: number;            // الحجم الأقصى لملف السجل بالبايت
  includeUserInfo: boolean;      // هل يتم تضمين معلومات المستخدم في السجل
  truncateStackTrace: boolean;   // هل يتم اقتصاص تتبع المكدس
  maxStackFrames: number;        // عدد إطارات تتبع المكدس الأقصى
}

/**
 * أنواع مستويات السجل
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/**
 * أنواع تخزين سجلات الأخطاء
 */
export type StorageType = 'file' | 'console' | 'database' | 'external';

/**
 * واجهة لوحدة تخزين السجلات
 */
interface LogStorage {
  save(level: LogLevel, message: string, meta: any): Promise<void>;
}

/**
 * تخزين السجلات في ملفات
 */
class FileLogStorage implements LogStorage {
  private logDirectory: string;
  private maxLogSize: number;

  constructor(logDirectory: string, maxLogSize: number) {
    this.logDirectory = logDirectory;
    this.maxLogSize = maxLogSize;

    // إنشاء مجلد السجلات إذا لم يكن موجوداً
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  async save(level: LogLevel, message: string, meta: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logFileName = `${level}-${new Date().toISOString().split('T')[0]}.log`;
      const logFilePath = path.join(this.logDirectory, logFileName);

      // تحويل البيانات الوصفية إلى سلسلة JSON
      const metaString = JSON.stringify(meta, null, 2);

      // تنسيق رسالة السجل
      const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\nMETA: ${metaString}\n\n`;

      // التحقق من حجم الملف الحالي
      let stats;
      try {
        stats = fs.statSync(logFilePath);
      } catch (error) {
        // الملف غير موجود، إنشاء ملف جديد
      }

      if (stats && stats.size > this.maxLogSize) {
        // إذا تجاوز الملف الحجم الأقصى، أنشئ ملفاً جديداً بتاريخ ووقت الآن
        const archiveLogFileName = `${level}-${new Date().toISOString().replace(/:/g, '-')}.log`;
        const archiveLogFilePath = path.join(this.logDirectory, archiveLogFileName);
        fs.renameSync(logFilePath, archiveLogFilePath);
      }

      // إضافة السجل إلى الملف
      fs.appendFileSync(logFilePath, logEntry);
    } catch (error) {
      console.error('فشل في حفظ السجل إلى الملف:', error);
      // لا نريد أن يؤدي فشل تسجيل الخطأ إلى خطأ آخر
    }
  }
}

/**
 * تخزين السجلات في وحدة التحكم
 */
class ConsoleLogStorage implements LogStorage {
  async save(level: LogLevel, message: string, meta: any): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // اختيار دالة وحدة التحكم المناسبة بناءً على مستوى السجل
    let logFn: (message: string, ...args: any[]) => void;
    
    switch (level) {
      case 'debug':
        logFn = console.debug;
        break;
      case 'info':
        logFn = console.info;
        break;
      case 'warn':
        logFn = console.warn;
        break;
      case 'error':
      case 'critical':
        logFn = console.error;
        break;
      default:
        logFn = console.log;
    }

    // تسجيل الرسالة والبيانات الوصفية
    logFn(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta);
  }
}

/**
 * تخزين السجلات في قاعدة البيانات
 */
class DatabaseLogStorage implements LogStorage {
  async save(level: LogLevel, message: string, meta: any): Promise<void> {
    try {
      // استيراد الـ db وجدول errorLogs
      const { db } = await import('../db');
      const { errorLogs } = await import('../../shared/schema');
      
      // استخراج البيانات من meta
      let userId = meta?.request?.user?.id;
      let errorStack = '';
      let componentStack = '';
      let url = meta?.request?.url || '';
      let userAgent = meta?.request?.userAgent || '';
      let ip = meta?.request?.ip || '';
      
      if (meta?.stack) {
        errorStack = meta.stack;
      }
      
      if (meta?.componentStack) {
        componentStack = meta.componentStack;
      }
      
      // حفظ السجل في قاعدة البيانات
      await db.insert(errorLogs).values({
        errorType: level,
        errorMessage: message,
        errorStack,
        componentStack,
        url,
        userAgent,
        userId,
        ip,
        timestamp: new Date(),
        additionalData: meta,
        status: 'new'
      });
      
      console.log(`[Database Logger] (${level.toUpperCase()}): ${message} - تم الحفظ في قاعدة البيانات`);
    } catch (error) {
      console.error('فشل في حفظ السجل إلى قاعدة البيانات:', error);
      // في حالة فشل التخزين في قاعدة البيانات، سجل على وحدة التحكم كاحتياطي
      console.error(`[Fallback Logger] (${level.toUpperCase()}): ${message}`, meta);
    }
  }
}

/**
 * تخزين السجلات في خدمة خارجية
 * هذه فئة وهمية، يمكن استبدالها بتكامل مع خدمة حقيقية
 */
class ExternalLogStorage implements LogStorage {
  async save(level: LogLevel, message: string, meta: any): Promise<void> {
    // في بيئة حقيقية، هنا سيتم إرسال السجل إلى خدمة خارجية
    // مثل Sentry، LogRocket، Datadog، إلخ.
    console.log(`[External Logger] (${level.toUpperCase()}): ${message}`, meta);
  }
}

/**
 * يمثل عامل تتبع الأخطاء
 */
class ErrorTracker {
  private config: ErrorTrackerConfig;
  private storage: LogStorage;

  constructor(config?: Partial<ErrorTrackerConfig>) {
    // تحديد نوع التخزين الافتراضي بناءً على بيئة التشغيل
    const defaultStorage: StorageType = process.env.NODE_ENV === 'production' 
      ? 'database' // في بيئة الإنتاج، استخدم قاعدة البيانات
      : 'console'; // في بيئة التطوير، استخدم وحدة التحكم

    // التكوين الافتراضي
    this.config = {
      logLevel: 'info',                  // مستوى التسجيل الافتراضي
      storage: defaultStorage,           // نوع التخزين الافتراضي
      logDirectory: path.resolve(process.cwd(), 'logs'), // مجلد السجلات الافتراضي
      maxLogSize: 10 * 1024 * 1024,       // الحجم الأقصى للملف: 10 ميجابايت
      includeUserInfo: true,              // تضمين معلومات المستخدم افتراضياً
      truncateStackTrace: true,           // اقتصاص تتبع المكدس افتراضياً
      maxStackFrames: 20                  // عدد إطارات تتبع المكدس الأقصى
    };

    // دمج التكوين المقدم مع التكوين الافتراضي
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // تحديث التكوين من متغيرات البيئة
    this.updateConfigFromEnvironment();

    // إنشاء وحدة تخزين السجلات المناسبة
    this.storage = this.createLogStorage();
  }

  /**
   * تحديث التكوين من متغيرات البيئة
   */
  private updateConfigFromEnvironment(): void {
    if (process.env.LOG_LEVEL) {
      this.config.logLevel = process.env.LOG_LEVEL as LogLevel;
    }
    
    if (process.env.ERROR_STORAGE_TYPE) {
      this.config.storage = process.env.ERROR_STORAGE_TYPE as StorageType;
    }
    
    if (process.env.LOG_DIRECTORY) {
      this.config.logDirectory = process.env.LOG_DIRECTORY;
    }
    
    if (process.env.MAX_LOG_SIZE) {
      this.config.maxLogSize = parseInt(process.env.MAX_LOG_SIZE, 10);
    }
    
    if (process.env.INCLUDE_USER_INFO) {
      this.config.includeUserInfo = process.env.INCLUDE_USER_INFO === 'true';
    }
    
    if (process.env.TRUNCATE_STACK_TRACE) {
      this.config.truncateStackTrace = process.env.TRUNCATE_STACK_TRACE === 'true';
    }
    
    if (process.env.MAX_STACK_FRAMES) {
      this.config.maxStackFrames = parseInt(process.env.MAX_STACK_FRAMES, 10);
    }
  }

  /**
   * إنشاء وحدة تخزين السجلات المناسبة بناءً على التكوين
   */
  private createLogStorage(): LogStorage {
    switch (this.config.storage) {
      case 'file':
        return new FileLogStorage(this.config.logDirectory, this.config.maxLogSize);
      case 'console':
        return new ConsoleLogStorage();
      case 'database':
        return new DatabaseLogStorage();
      case 'external':
        return new ExternalLogStorage();
      default:
        // في بيئة الإنتاج، استخدم قاعدة البيانات افتراضياً، وفي بيئة التطوير استخدم وحدة التحكم
        if (process.env.NODE_ENV === 'production') {
          return new DatabaseLogStorage();
        } else {
          return new ConsoleLogStorage();
        }
    }
  }

  /**
   * معالجة كائن الخطأ وتحويله إلى بيانات وصفية
   */
  private processError(error: Error): any {
    // تحضير البيانات الوصفية للخطأ
    const meta: any = {
      name: error.name,
      message: error.message,
      timestamp: new Date().toISOString()
    };

    // معالجة تتبع المكدس
    if (error.stack) {
      if (this.config.truncateStackTrace) {
        // اقتصاص تتبع المكدس إلى عدد محدد من الأسطر
        const stackLines = error.stack.split('\n');
        meta.stack = stackLines.slice(0, this.config.maxStackFrames + 1).join('\n');
      } else {
        meta.stack = error.stack;
      }
    }

    return meta;
  }

  /**
   * استخراج معلومات المستخدم من الطلب
   */
  private extractUserInfo(req: Request): any {
    if (!this.config.includeUserInfo) {
      return {};
    }

    const userInfo: any = {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // إضافة معلومات المستخدم المصادق عليه إذا كانت متوفرة
    if (req.user) {
      userInfo.user = {
        id: req.user.id,
        username: req.user.username
      };
    }

    return userInfo;
  }

  /**
   * تسجيل رسالة تصحيح
   */
  async debug(message: string, meta?: any, req?: Request): Promise<void> {
    if (this.shouldLog('debug')) {
      await this.log('debug', message, meta, req);
    }
  }

  /**
   * تسجيل رسالة معلومات
   */
  async info(message: string, meta?: any, req?: Request): Promise<void> {
    if (this.shouldLog('info')) {
      await this.log('info', message, meta, req);
    }
  }

  /**
   * تسجيل رسالة تحذير
   */
  async warn(message: string, meta?: any, req?: Request): Promise<void> {
    if (this.shouldLog('warn')) {
      await this.log('warn', message, meta, req);
    }
  }

  /**
   * تسجيل رسالة خطأ
   */
  async error(error: Error | string, meta?: any, req?: Request): Promise<void> {
    if (this.shouldLog('error')) {
      if (error instanceof Error) {
        const errorMeta = this.processError(error);
        await this.log('error', error.message, { ...errorMeta, ...meta }, req);
      } else {
        await this.log('error', error, meta, req);
      }
    }
  }

  /**
   * تسجيل رسالة خطأ حرج
   */
  async critical(error: Error | string, meta?: any, req?: Request): Promise<void> {
    if (this.shouldLog('critical')) {
      if (error instanceof Error) {
        const errorMeta = this.processError(error);
        await this.log('critical', error.message, { ...errorMeta, ...meta }, req);
      } else {
        await this.log('critical', error, meta, req);
      }
    }
  }

  /**
   * تسجيل خطأ في العميل (من واجهة المستخدم)
   */
  async clientError(message: string, meta?: any, req?: Request): Promise<void> {
    if (this.shouldLog('error')) {
      await this.log('error', `[CLIENT] ${message}`, meta, req);
    }
  }

  /**
   * التحقق مما إذا كان يجب تسجيل رسالة بمستوى معين
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= configLevelIndex;
  }

  /**
   * تسجيل رسالة عامة
   */
  private async log(level: LogLevel, message: string, meta: any = {}, req?: Request): Promise<void> {
    try {
      // إضافة معلومات المستخدم إذا كان الطلب متوفراً
      if (req) {
        meta.request = {
          url: req.url,
          method: req.method,
          headers: req.headers,
          ...this.extractUserInfo(req)
        };
      }

      // تسجيل الرسالة
      await this.storage.save(level, message, meta);
    } catch (error) {
      console.error('فشل في تسجيل الرسالة:', error);
      // لا نريد أن يؤدي فشل تسجيل الخطأ إلى خطأ آخر
    }
  }
}

// إنشاء مثيل عالمي من ErrorTracker
export const logger = new ErrorTracker();