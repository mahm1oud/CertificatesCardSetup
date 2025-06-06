import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * نظام إنشاء الصور المصغرة التلقائي
 * يعمل على تحسين أداء الموقع من خلال إنشاء صور مصغرة بأحجام مختلفة
 */

export interface ThumbnailConfig {
  width: number;
  height: number;
  quality: number;
  format: 'jpeg' | 'webp' | 'png';
  suffix: string;
}

// إعدادات الصور المصغرة المختلفة
export const THUMBNAIL_CONFIGS: Record<string, ThumbnailConfig> = {
  small: {
    width: 150,
    height: 150,
    quality: 75,
    format: 'webp',
    suffix: '_small'
  },
  medium: {
    width: 300,
    height: 300,
    quality: 80,
    format: 'webp',
    suffix: '_medium'
  },
  large: {
    width: 600,
    height: 600,
    quality: 85,
    format: 'webp',
    suffix: '_large'
  },
  card: {
    width: 400,
    height: 250,
    quality: 80,
    format: 'webp',
    suffix: '_card'
  },
  gallery: {
    width: 250,
    height: 200,
    quality: 75,
    format: 'webp',
    suffix: '_gallery'
  }
};

/**
 * إنشاء مجلد الصور المصغرة إذا لم يكن موجوداً
 */
function ensureThumbnailDir(): void {
  const thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }
}

/**
 * إنشاء صورة مصغرة واحدة
 */
async function generateSingleThumbnail(
  inputPath: string,
  outputPath: string,
  config: ThumbnailConfig
): Promise<void> {
  try {
    await sharp(inputPath)
      .resize(config.width, config.height, {
        fit: 'cover',
        position: 'center'
      })
      .toFormat(config.format, { quality: config.quality })
      .toFile(outputPath);
  } catch (error) {
    console.error(`خطأ في إنشاء الصورة المصغرة: ${outputPath}`, error);
    throw error;
  }
}

/**
 * إنشاء جميع أحجام الصور المصغرة لصورة واحدة
 */
export async function generateThumbnails(
  imagePath: string,
  sizes: string[] = ['small', 'medium', 'large']
): Promise<Record<string, string>> {
  ensureThumbnailDir();
  
  const results: Record<string, string> = {};
  const fullPath = path.join(process.cwd(), imagePath.replace(/^\//, ''));
  
  // التحقق من وجود الملف الأصلي
  if (!fs.existsSync(fullPath)) {
    throw new Error(`الملف غير موجود: ${fullPath}`);
  }
  
  const fileName = path.basename(imagePath, path.extname(imagePath));
  const originalExt = path.extname(imagePath);
  
  for (const size of sizes) {
    const config = THUMBNAIL_CONFIGS[size];
    if (!config) continue;
    
    const thumbnailName = `${fileName}${config.suffix}.${config.format}`;
    const thumbnailPath = path.join(process.cwd(), 'uploads', 'thumbnails', thumbnailName);
    const thumbnailUrl = `/uploads/thumbnails/${thumbnailName}`;
    
    try {
      await generateSingleThumbnail(fullPath, thumbnailPath, config);
      results[size] = thumbnailUrl;
    } catch (error) {
      console.error(`فشل في إنشاء الصورة المصغرة ${size} للملف ${imagePath}:`, error);
    }
  }
  
  return results;
}

/**
 * إنشاء صور مصغرة للقوالب والبطاقات الموجودة
 */
export async function generateBulkThumbnails(
  imageUrls: string[],
  sizes: string[] = ['small', 'medium', 'large']
): Promise<Record<string, Record<string, string>>> {
  const results: Record<string, Record<string, string>> = {};
  
  for (const imageUrl of imageUrls) {
    try {
      const thumbnails = await generateThumbnails(imageUrl, sizes);
      results[imageUrl] = thumbnails;
    } catch (error) {
      console.error(`فشل في معالجة الصورة ${imageUrl}:`, error);
      results[imageUrl] = {};
    }
  }
  
  return results;
}

/**
 * حذف الصور المصغرة المرتبطة بصورة معينة
 */
export async function deleteThumbnails(imagePath: string): Promise<void> {
  const fileName = path.basename(imagePath, path.extname(imagePath));
  const thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
  
  if (!fs.existsSync(thumbnailDir)) return;
  
  const files = fs.readdirSync(thumbnailDir);
  
  for (const file of files) {
    if (file.startsWith(fileName + '_')) {
      const filePath = path.join(thumbnailDir, file);
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error(`فشل في حذف الصورة المصغرة: ${filePath}`, error);
      }
    }
  }
}

/**
 * الحصول على رابط الصورة المصغرة
 */
export function getThumbnailUrl(
  originalUrl: string,
  size: string = 'medium'
): string {
  if (!originalUrl) return '';
  
  // للصور المحلية
  if (originalUrl.startsWith('/uploads/')) {
    const fileName = path.basename(originalUrl, path.extname(originalUrl));
    const config = THUMBNAIL_CONFIGS[size];
    if (config) {
      return `/uploads/thumbnails/${fileName}${config.suffix}.${config.format}`;
    }
  }
  
  return originalUrl;
}

/**
 * تنظيف الصور المصغرة القديمة (أكثر من 30 يوم)
 */
export async function cleanupOldThumbnails(): Promise<void> {
  const thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
  
  if (!fs.existsSync(thumbnailDir)) return;
  
  const files = fs.readdirSync(thumbnailDir);
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  for (const file of files) {
    const filePath = path.join(thumbnailDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.mtime.getTime() < thirtyDaysAgo) {
      try {
        fs.unlinkSync(filePath);
        console.log(`تم حذف الصورة المصغرة القديمة: ${file}`);
      } catch (error) {
        console.error(`فشل في حذف الصورة المصغرة القديمة: ${file}`, error);
      }
    }
  }
}

/**
 * معالجة صورة مرفوعة حديثاً وإنشاء صور مصغرة لها
 */
export async function processUploadedImage(
  imagePath: string,
  generateSizes: string[] = ['small', 'medium', 'large', 'card', 'gallery']
): Promise<Record<string, string>> {
  try {
    const thumbnails = await generateThumbnails(imagePath, generateSizes);
    console.log(`تم إنشاء ${Object.keys(thumbnails).length} صورة مصغرة للملف: ${imagePath}`);
    return thumbnails;
  } catch (error) {
    console.error(`فشل في معالجة الصورة المرفوعة: ${imagePath}`, error);
    return {};
  }
}