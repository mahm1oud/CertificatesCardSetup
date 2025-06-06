import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  thumbnailSrc?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className,
  thumbnailSrc,
  width,
  height,
  priority = false,
  sizes,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(thumbnailSrc || src);
  const imgRef = useRef<HTMLImageElement>(null);

  // استخدام Intersection Observer للتحميل التدريجي
  useEffect(() => {
    if (priority) {
      setCurrentSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCurrentSrc(src);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, priority]);

  const handleLoad = () => {
    setIsLoading(false);
    if (thumbnailSrc && currentSrc === thumbnailSrc) {
      // التبديل من الصورة المصغرة إلى الصورة الكاملة
      setCurrentSrc(src);
    }
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          "bg-gray-200 flex items-center justify-center text-gray-500",
          className
        )}
        style={{ width, height }}
      >
        <svg 
          className="w-8 h-8" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? "eager" : "lazy"}
      />
    </div>
  );
}

// Hook لإنشاء رابط الصورة المصغرة
export function useThumbnailUrl(originalUrl: string, size: 'small' | 'medium' | 'large' | 'card' | 'gallery' = 'medium') {
  if (!originalUrl) return '';
  
  // تحديد حجم الصورة المصغرة
  const sizeParams = {
    small: 'w=150&h=150',
    medium: 'w=300&h=300', 
    large: 'w=600&h=600',
    card: 'w=400&h=400',
    gallery: 'w=800&h=600'
  };
  
  // إذا كان الرابط يحتوي على مسار محلي، أضف مسار الصور المصغرة
  if (originalUrl.startsWith('/uploads/')) {
    const filename = originalUrl.split('/').pop();
    const nameWithoutExt = filename?.split('.')[0];
    const ext = filename?.split('.').pop();
    return `/uploads/thumbnails/${nameWithoutExt}_${size}.${ext}`;
  }
  
  // للروابط الخارجية، استخدم خدمة تحسين الصور
  if (originalUrl.startsWith('http')) {
    const params = sizeParams[size as keyof typeof sizeParams] || sizeParams.medium;
    return `${originalUrl}?${params}&q=75&format=auto`;
  }
  
  return originalUrl;
}