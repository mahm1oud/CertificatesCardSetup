import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Pipette, 
  Copy, 
  Check, 
  Palette, 
  Download,
  X,
  RefreshCw,
  Target,
  Square,
  Eye,
  MousePointer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  position: { x: number; y: number };
  source: 'screen' | 'element';
  timestamp: number;
}

interface ColorHistory {
  colors: ColorInfo[];
  timestamp: number;
}

interface ScreenColorPickerProps {
  onColorSelect?: (color: string) => void;
  selectedColor?: string;
}

const ScreenColorPicker: React.FC<ScreenColorPickerProps> = ({ onColorSelect, selectedColor }) => {
  const [selectedColors, setSelectedColors] = useState<ColorInfo[]>([]);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [colorHistory, setColorHistory] = useState<ColorHistory[]>([]);
  const [currentColor, setCurrentColor] = useState<ColorInfo | null>(null);
  const [eyedropperSupported, setEyedropperSupported] = useState(false);
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const magnifierRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // فحص دعم EyeDropper API
  useEffect(() => {
    if ('EyeDropper' in window) {
      setEyedropperSupported(true);
    }
  }, []);

  // تحويل RGB إلى HSL
  const rgbToHsl = useCallback((r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }, []);

  // استخراج لون من نقطة في العنصر
  const getColorFromElement = useCallback((element: HTMLElement, x: number, y: number): ColorInfo | null => {
    try {
      // إنشاء canvas مؤقت لرسم العنصر
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const rect = element.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // رسم العنصر على Canvas
      const computedStyle = window.getComputedStyle(element);
      ctx.fillStyle = computedStyle.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // إذا كان العنصر صورة
      if (element instanceof HTMLImageElement) {
        ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
      }

      // الحصول على بيانات البكسل
      const imageData = ctx.getImageData(x - rect.left, y - rect.top, 1, 1);
      const [r, g, b] = imageData.data;

      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      const hsl = rgbToHsl(r, g, b);

      return {
        hex,
        rgb: { r, g, b },
        hsl,
        position: { x, y },
        source: 'element',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error extracting color:', error);
      return null;
    }
  }, [rgbToHsl]);

  // استخدام EyeDropper API المدمج في المتصفح
  const useNativeEyeDropper = useCallback(async () => {
    if (!eyedropperSupported) {
      toast({
        title: 'غير مدعوم',
        description: 'متصفحك لا يدعم قنطرة الألوان المدمجة',
        variant: 'destructive'
      });
      return;
    }

    try {
      // @ts-ignore
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      
      if (result.sRGBHex) {
        const hex = result.sRGBHex;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const hsl = rgbToHsl(r, g, b);

        const colorInfo: ColorInfo = {
          hex,
          rgb: { r, g, b },
          hsl,
          position: { x: 0, y: 0 }, // EyeDropper لا يعطي الموضع
          source: 'screen',
          timestamp: Date.now()
        };

        setSelectedColors(prev => [colorInfo, ...prev.slice(0, 9)]);
        
        // إرسال اللون للمكون الأب
        if (onColorSelect) {
          onColorSelect(hex);
        }
        
        toast({
          title: 'تم استخراج اللون',
          description: `اللون ${hex} تم إضافته بنجاح`
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast({
          title: 'خطأ',
          description: 'فشل في استخراج اللون',
          variant: 'destructive'
        });
      }
    }
  }, [eyedropperSupported, rgbToHsl, toast]);

  // تفعيل وضع قنطرة الألوان اليدوي
  const startManualColorPicking = useCallback(() => {
    setIsPickingColor(true);
    document.body.style.cursor = 'crosshair';
    
    toast({
      title: 'وضع قنطرة الألوان',
      description: 'انقر على أي مكان في الصفحة لاستخراج اللون'
    });
  }, [toast]);

  // إيقاف وضع قنطرة الألوان
  const stopColorPicking = useCallback(() => {
    setIsPickingColor(false);
    document.body.style.cursor = 'default';
    setCurrentColor(null);
  }, []);

  // معالج النقر للحصول على اللون
  const handleColorPick = useCallback((event: MouseEvent) => {
    if (!isPickingColor) return;

    event.preventDefault();
    event.stopPropagation();

    const x = event.clientX;
    const y = event.clientY;
    const element = document.elementFromPoint(x, y) as HTMLElement;

    if (element) {
      // محاولة الحصول على اللون من الـ computed style
      const computedStyle = window.getComputedStyle(element);
      let colorValue = computedStyle.backgroundColor || computedStyle.color;

      // إذا كان شفاف، جرب العنصر الأب
      if (colorValue === 'rgba(0, 0, 0, 0)' || colorValue === 'transparent') {
        let parent = element.parentElement;
        while (parent && (colorValue === 'rgba(0, 0, 0, 0)' || colorValue === 'transparent')) {
          const parentStyle = window.getComputedStyle(parent);
          colorValue = parentStyle.backgroundColor || parentStyle.color;
          parent = parent.parentElement;
        }
      }

      // تحويل اللون إلى RGB
      let r = 0, g = 0, b = 0;
      
      if (colorValue.startsWith('rgb')) {
        const match = colorValue.match(/\d+/g);
        if (match && match.length >= 3) {
          [r, g, b] = match.map(Number);
        }
      } else if (colorValue.startsWith('#')) {
        r = parseInt(colorValue.slice(1, 3), 16);
        g = parseInt(colorValue.slice(3, 5), 16);
        b = parseInt(colorValue.slice(5, 7), 16);
      }

      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      const hsl = rgbToHsl(r, g, b);

      const colorInfo: ColorInfo = {
        hex,
        rgb: { r, g, b },
        hsl,
        position: { x, y },
        source: 'screen',
        timestamp: Date.now()
      };

      setSelectedColors(prev => [colorInfo, ...prev.slice(0, 9)]);
      
      // إرسال اللون للمكون الأب
      if (onColorSelect) {
        onColorSelect(hex);
      }
      
      stopColorPicking();
      
      toast({
        title: 'تم استخراج اللون',
        description: `اللون ${hex} من العنصر ${element.tagName.toLowerCase()}`
      });
    }
  }, [isPickingColor, rgbToHsl, stopColorPicking, toast]);

  // معالج الحركة لإظهار اللون الحالي
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isPickingColor) return;

    const x = event.clientX;
    const y = event.clientY;
    const element = document.elementFromPoint(x, y) as HTMLElement;

    if (element) {
      const computedStyle = window.getComputedStyle(element);
      let colorValue = computedStyle.backgroundColor || computedStyle.color;

      if (colorValue !== 'rgba(0, 0, 0, 0)' && colorValue !== 'transparent') {
        // تحديث اللون الحالي للمعاينة
        // يمكن إضافة منطق هنا لإظهار معاينة اللون
      }
    }
  }, [isPickingColor]);

  // إضافة مستمعي الأحداث
  useEffect(() => {
    if (isPickingColor) {
      document.addEventListener('click', handleColorPick, true);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          stopColorPicking();
        }
      });

      return () => {
        document.removeEventListener('click', handleColorPick, true);
        document.removeEventListener('mousemove', handleMouseMove);
        stopColorPicking();
      };
    }
  }, [isPickingColor, handleColorPick, handleMouseMove, stopColorPicking]);

  // نسخ اللون إلى الحافظة
  const copyColor = useCallback(async (color: string, format: 'hex' | 'rgb' | 'hsl' = 'hex') => {
    try {
      await navigator.clipboard.writeText(color);
      setCopiedColor(color);
      setTimeout(() => setCopiedColor(null), 2000);
      
      toast({
        title: 'تم النسخ',
        description: `تم نسخ ${color} إلى الحافظة`
      });
    } catch (error) {
      toast({
        title: 'خطأ في النسخ',
        description: 'فشل في نسخ اللون إلى الحافظة',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // حذف لون من القائمة
  const removeColor = useCallback((index: number) => {
    setSelectedColors(prev => prev.filter((_, i) => i !== index));
  }, []);

  // مسح جميع الألوان
  const clearAllColors = useCallback(() => {
    setSelectedColors([]);
    toast({
      title: 'تم المسح',
      description: 'تم مسح جميع الألوان المحفوظة'
    });
  }, [toast]);

  // تصدير الألوان
  const exportColors = useCallback(() => {
    const colorsData = {
      colors: selectedColors,
      exportDate: new Date().toISOString(),
      totalColors: selectedColors.length
    };

    const blob = new Blob([JSON.stringify(colorsData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colors-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'تم التصدير',
      description: 'تم تصدير الألوان بنجاح'
    });
  }, [selectedColors, toast]);

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pipette className="w-5 h-5" />
            قنطرة الألوان - استخراج من الشاشة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* أزرار التحكم */}
            <div className="flex gap-3 flex-wrap">
              {eyedropperSupported ? (
                <Button 
                  onClick={useNativeEyeDropper}
                  className="flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  قنطرة متقدمة
                </Button>
              ) : (
                <Badge variant="outline" className="text-xs">
                  قنطرة متقدمة غير مدعومة في هذا المتصفح
                </Badge>
              )}

              <Button
                onClick={isPickingColor ? stopColorPicking : startManualColorPicking}
                variant={isPickingColor ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {isPickingColor ? (
                  <>
                    <X className="w-4 h-4" />
                    إيقاف القنطرة
                  </>
                ) : (
                  <>
                    <MousePointer className="w-4 h-4" />
                    قنطرة يدوية
                  </>
                )}
              </Button>

              {selectedColors.length > 0 && (
                <>
                  <Button
                    onClick={exportColors}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    تصدير
                  </Button>

                  <Button
                    onClick={clearAllColors}
                    variant="outline"
                    className="flex items-center gap-2 text-destructive hover:text-destructive"
                  >
                    <RefreshCw className="w-4 h-4" />
                    مسح الكل
                  </Button>
                </>
              )}
            </div>

            {/* تعليمات الاستخدام */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                كيفية الاستخدام:
              </h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• <strong>قنطرة متقدمة:</strong> تستخدم تقنية المتصفح المدمجة لاستخراج الألوان من أي مكان في الشاشة</li>
                <li>• <strong>قنطرة يدوية:</strong> انقر على أي عنصر في الصفحة لاستخراج لونه</li>
                <li>• اضغط <kbd className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Esc</kbd> لإلغاء وضع القنطرة</li>
                <li>• انقر على اللون لنسخه إلى الحافظة</li>
              </ul>
            </div>

            {isPickingColor && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  🎯 وضع قنطرة الألوان نشط - انقر على أي مكان لاستخراج اللون
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* عرض الألوان المستخرجة */}
      {selectedColors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                الألوان المستخرجة ({selectedColors.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedColors.map((color, index) => (
                <div
                  key={`${color.hex}-${color.timestamp}`}
                  className="border rounded-lg p-3 space-y-3 hover:shadow-md transition-shadow"
                >
                  {/* معاينة اللون */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg border shadow-sm cursor-pointer transition-transform hover:scale-105"
                      style={{ backgroundColor: color.hex }}
                      onClick={() => copyColor(color.hex)}
                      title="انقر للنسخ"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {color.source === 'screen' ? 'شاشة' : 'عنصر'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {new Date(color.timestamp).toLocaleTimeString('ar')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        الموضع: {color.position.x}, {color.position.y}
                      </p>
                    </div>
                  </div>

                  {/* قيم الألوان */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">HEX</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          value={color.hex}
                          readOnly
                          className="h-6 text-xs font-mono w-20"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copyColor(color.hex)}
                        >
                          {copiedColor === color.hex ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">RGB</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          value={`${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`}
                          readOnly
                          className="h-6 text-xs font-mono w-24"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copyColor(`rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">HSL</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          value={`${color.hsl.h}°, ${color.hsl.s}%, ${color.hsl.l}%`}
                          readOnly
                          className="h-6 text-xs font-mono w-28"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copyColor(`hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* حذف اللون */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-6 text-xs text-destructive hover:text-destructive"
                    onClick={() => removeColor(index)}
                  >
                    <X className="w-3 h-3 ml-1" />
                    حذف
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* overlay للقنطرة اليدوية */}
      {isPickingColor && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 pointer-events-none"
          style={{
            background: 'rgba(0, 0, 0, 0.1)',
            cursor: 'crosshair'
          }}
        >
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-1 rounded text-sm">
            انقر لاستخراج اللون • ESC للإلغاء
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenColorPicker;