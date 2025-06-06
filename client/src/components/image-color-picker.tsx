import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Palette, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageColorPickerProps {
  imageUrl: string;
  onColorSelect?: (color: string) => void;
}

interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  x: number;
  y: number;
}

export function ImageColorPicker({ imageUrl, onColorSelect }: ImageColorPickerProps) {
  const [selectedColors, setSelectedColors] = useState<ColorInfo[]>([]);
  const [hoveredColor, setHoveredColor] = useState<ColorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dominantColors, setDominantColors] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadImage();
  }, [imageUrl]);

  const loadImage = () => {
    setIsLoading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      
      if (canvas && ctx && img) {
        // تحديد أبعاد الكانفاس بناء على حجم الصورة
        const maxWidth = 600;
        const maxHeight = 400;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        extractDominantColors(ctx, width, height);
        setIsLoading(false);
      }
    };
    
    img.onerror = () => {
      setIsLoading(false);
      toast({ title: "خطأ في تحميل الصورة", variant: "destructive" });
    };
    
    img.src = imageUrl;
  };

  const extractDominantColors = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const colorMap = new Map<string, number>();
    
    // عينة من البكسلات لتحسين الأداء
    const sampleRate = 10;
    
    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];
      
      // تجاهل البكسلات الشفافة
      if (alpha < 128) continue;
      
      const hex = rgbToHex(r, g, b);
      colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
    }
    
    // ترتيب الألوان حسب التكرار
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([color]) => color);
    
    setDominantColors(sortedColors);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));
    
    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;
    
    const colorInfo: ColorInfo = {
      hex: rgbToHex(r, g, b),
      rgb: { r, g, b },
      hsl: rgbToHsl(r, g, b),
      x,
      y
    };
    
    setSelectedColors(prev => {
      const exists = prev.find(color => color.hex === colorInfo.hex);
      if (exists) return prev;
      return [...prev, colorInfo];
    });
    
    onColorSelect?.(colorInfo.hex);
    toast({ title: `تم استخراج اللون: ${colorInfo.hex}` });
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));
    
    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;
    
    setHoveredColor({
      hex: rgbToHex(r, g, b),
      rgb: { r, g, b },
      hsl: rgbToHsl(r, g, b),
      x,
      y
    });
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
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
  };

  const copyToClipboard = (color: string) => {
    navigator.clipboard.writeText(color);
    toast({ title: `تم نسخ اللون: ${color}` });
  };

  const downloadPalette = () => {
    const colors = [...selectedColors.map(c => c.hex), ...dominantColors];
    const uniqueColors = Array.from(new Set(colors));
    
    const paletteData = {
      colors: uniqueColors,
      extracted: selectedColors,
      dominant: dominantColors,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(paletteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'color-palette.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearSelection = () => {
    setSelectedColors([]);
    setHoveredColor(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              قنطرة الألوان
            </span>
            <div className="flex gap-2">
              <Button onClick={clearSelection} variant="outline" size="sm">
                مسح التحديد
              </Button>
              <Button onClick={downloadPalette} variant="outline" size="sm">
                <Download className="w-4 h-4 ml-1" />
                تحميل اللوحة
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>جاري تحميل الصورة...</p>
                </div>
              </div>
            )}
            
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoveredColor(null)}
              className="max-w-full h-auto border rounded cursor-crosshair shadow-lg"
              style={{ display: isLoading ? 'none' : 'block' }}
            />
            
            {hoveredColor && (
              <div className="absolute top-2 left-2 bg-white dark:bg-gray-900 p-2 rounded shadow-lg border">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: hoveredColor.hex }}
                  />
                  <div className="text-sm">
                    <div>{hoveredColor.hex}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      RGB({hoveredColor.rgb.r}, {hoveredColor.rgb.g}, {hoveredColor.rgb.b})
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            انقر على أي نقطة في الصورة لاستخراج لونها
          </p>
        </CardContent>
      </Card>

      {/* الألوان المستخرجة */}
      {selectedColors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الألوان المستخرجة ({selectedColors.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {selectedColors.map((color, index) => (
                <div key={index} className="border rounded p-3 space-y-2">
                  <div 
                    className="w-full h-16 rounded border cursor-pointer"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => copyToClipboard(color.hex)}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {color.hex}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(color.hex)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <div>RGB({color.rgb.r}, {color.rgb.g}, {color.rgb.b})</div>
                      <div>HSL({color.hsl.h}°, {color.hsl.s}%, {color.hsl.l}%)</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* الألوان المهيمنة */}
      {dominantColors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              الألوان المهيمنة في الصورة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {dominantColors.map((color, index) => (
                <div 
                  key={index}
                  className="aspect-square rounded border cursor-pointer hover:scale-110 transition-transform group relative"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    copyToClipboard(color);
                    onColorSelect?.(color);
                  }}
                  title={color}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded flex items-center justify-center">
                    <Copy className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              انقر على أي لون لنسخه
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}