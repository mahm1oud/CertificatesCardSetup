import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Shuffle, 
  Copy, 
  Download, 
  Save, 
  RefreshCw,
  Wand2,
  Eye,
  Settings,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  name: string;
}

interface ColorPalette {
  id: string;
  name: string;
  colors: ColorInfo[];
  style: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'tetradic' | 'split-complementary';
  baseColor: string;
  createdAt: Date;
}

interface ColorPaletteGeneratorProps {
  onPaletteSelect?: (palette: ColorPalette) => void;
  onThemeCreate?: (theme: any) => void;
}

const PALETTE_STYLES = [
  { value: 'monochromatic', label: 'أحادي اللون', description: 'درجات مختلفة من نفس اللون' },
  { value: 'analogous', label: 'متجاور', description: 'ألوان متجاورة في عجلة الألوان' },
  { value: 'complementary', label: 'مكمل', description: 'ألوان متقابلة في عجلة الألوان' },
  { value: 'triadic', label: 'ثلاثي', description: 'ثلاثة ألوان متباعدة بالتساوي' },
  { value: 'tetradic', label: 'رباعي', description: 'أربعة ألوان في مستطيل' },
  { value: 'split-complementary', label: 'مكمل منقسم', description: 'لون أساسي مع لونين مجاورين لمكمله' }
];

const COLOR_NAMES = {
  red: 'أحمر', orange: 'برتقالي', yellow: 'أصفر', green: 'أخضر',
  blue: 'أزرق', purple: 'بنفسجي', pink: 'وردي', brown: 'بني',
  gray: 'رمادي', black: 'أسود', white: 'أبيض'
};

export const ColorPaletteGenerator: React.FC<ColorPaletteGeneratorProps> = ({
  onPaletteSelect,
  onThemeCreate
}) => {
  const [baseColor, setBaseColor] = useState('#3b82f6');
  const [paletteStyle, setPaletteStyle] = useState<string>('analogous');
  const [colorCount, setColorCount] = useState([5]);
  const [brightness, setBrightness] = useState([50]);
  const [saturation, setSaturation] = useState([70]);
  const [generatedPalette, setGeneratedPalette] = useState<ColorPalette | null>(null);
  const [savedPalettes, setSavedPalettes] = useState<ColorPalette[]>([]);
  const [paletteName, setPaletteName] = useState('');
  
  const { toast } = useToast();

  // تحويل HEX إلى HSL
  const hexToHsl = useCallback((hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

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

  // تحويل HSL إلى HEX
  const hslToHex = useCallback((h: number, s: number, l: number): string => {
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, []);

  // تحويل HEX إلى RGB
  const hexToRgb = useCallback((hex: string): { r: number; g: number; b: number } => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }, []);

  // الحصول على اسم اللون
  const getColorName = useCallback((hex: string): string => {
    const hsl = hexToHsl(hex);
    const hue = hsl.h;
    
    if (hsl.s < 10) return hsl.l < 30 ? 'أسود' : hsl.l > 80 ? 'أبيض' : 'رمادي';
    
    if (hue < 15 || hue >= 345) return 'أحمر';
    if (hue < 45) return 'برتقالي';
    if (hue < 75) return 'أصفر';
    if (hue < 150) return 'أخضر';
    if (hue < 210) return 'أزرق';
    if (hue < 270) return 'بنفسجي';
    if (hue < 345) return 'وردي';
    
    return 'ملون';
  }, [hexToHsl]);

  // توليد لوحة ألوان
  const generatePalette = useCallback(() => {
    const baseHsl = hexToHsl(baseColor);
    const colors: ColorInfo[] = [];
    const count = colorCount[0];
    const targetBrightness = brightness[0];
    const targetSaturation = saturation[0];

    switch (paletteStyle) {
      case 'monochromatic':
        for (let i = 0; i < count; i++) {
          const l = Math.max(10, Math.min(90, targetBrightness + (i - Math.floor(count/2)) * 15));
          const hex = hslToHex(baseHsl.h, targetSaturation, l);
          colors.push({
            hex,
            rgb: hexToRgb(hex),
            hsl: { h: baseHsl.h, s: targetSaturation, l },
            name: getColorName(hex)
          });
        }
        break;

      case 'analogous':
        for (let i = 0; i < count; i++) {
          const h = (baseHsl.h + (i - Math.floor(count/2)) * 30 + 360) % 360;
          const hex = hslToHex(h, targetSaturation, targetBrightness);
          colors.push({
            hex,
            rgb: hexToRgb(hex),
            hsl: { h, s: targetSaturation, l: targetBrightness },
            name: getColorName(hex)
          });
        }
        break;

      case 'complementary':
        colors.push({
          hex: baseColor,
          rgb: hexToRgb(baseColor),
          hsl: baseHsl,
          name: getColorName(baseColor)
        });
        
        const compHue = (baseHsl.h + 180) % 360;
        const compHex = hslToHex(compHue, targetSaturation, targetBrightness);
        colors.push({
          hex: compHex,
          rgb: hexToRgb(compHex),
          hsl: { h: compHue, s: targetSaturation, l: targetBrightness },
          name: getColorName(compHex)
        });

        // إضافة ألوان إضافية بدرجات مختلفة
        for (let i = 2; i < count; i++) {
          const useBase = i % 2 === 0;
          const h = useBase ? baseHsl.h : compHue;
          const l = Math.max(20, Math.min(80, targetBrightness + (Math.random() - 0.5) * 40));
          const s = Math.max(30, Math.min(90, targetSaturation + (Math.random() - 0.5) * 30));
          const hex = hslToHex(h, s, l);
          colors.push({
            hex,
            rgb: hexToRgb(hex),
            hsl: { h, s, l },
            name: getColorName(hex)
          });
        }
        break;

      case 'triadic':
        for (let i = 0; i < Math.min(count, 3); i++) {
          const h = (baseHsl.h + i * 120) % 360;
          const hex = hslToHex(h, targetSaturation, targetBrightness);
          colors.push({
            hex,
            rgb: hexToRgb(hex),
            hsl: { h, s: targetSaturation, l: targetBrightness },
            name: getColorName(hex)
          });
        }
        
        // إضافة ألوان إضافية بدرجات مختلفة
        for (let i = 3; i < count; i++) {
          const baseIndex = i % 3;
          const h = (baseHsl.h + baseIndex * 120) % 360;
          const l = Math.max(20, Math.min(80, targetBrightness + (Math.random() - 0.5) * 30));
          const s = Math.max(40, Math.min(80, targetSaturation + (Math.random() - 0.5) * 20));
          const hex = hslToHex(h, s, l);
          colors.push({
            hex,
            rgb: hexToRgb(hex),
            hsl: { h, s, l },
            name: getColorName(hex)
          });
        }
        break;

      case 'tetradic':
        for (let i = 0; i < Math.min(count, 4); i++) {
          const h = (baseHsl.h + i * 90) % 360;
          const hex = hslToHex(h, targetSaturation, targetBrightness);
          colors.push({
            hex,
            rgb: hexToRgb(hex),
            hsl: { h, s: targetSaturation, l: targetBrightness },
            name: getColorName(hex)
          });
        }
        
        // إضافة ألوان إضافية
        for (let i = 4; i < count; i++) {
          const baseIndex = i % 4;
          const h = (baseHsl.h + baseIndex * 90) % 360;
          const l = Math.max(20, Math.min(80, targetBrightness + (Math.random() - 0.5) * 25));
          const hex = hslToHex(h, targetSaturation, l);
          colors.push({
            hex,
            rgb: hexToRgb(hex),
            hsl: { h, s: targetSaturation, l },
            name: getColorName(hex)
          });
        }
        break;

      case 'split-complementary':
        colors.push({
          hex: baseColor,
          rgb: hexToRgb(baseColor),
          hsl: baseHsl,
          name: getColorName(baseColor)
        });
        
        const split1 = (baseHsl.h + 150) % 360;
        const split2 = (baseHsl.h + 210) % 360;
        
        [split1, split2].forEach(h => {
          const hex = hslToHex(h, targetSaturation, targetBrightness);
          colors.push({
            hex,
            rgb: hexToRgb(hex),
            hsl: { h, s: targetSaturation, l: targetBrightness },
            name: getColorName(hex)
          });
        });
        
        // إضافة ألوان إضافية
        for (let i = 3; i < count; i++) {
          const hues = [baseHsl.h, split1, split2];
          const h = hues[i % 3];
          const l = Math.max(25, Math.min(75, targetBrightness + (Math.random() - 0.5) * 30));
          const s = Math.max(35, Math.min(85, targetSaturation + (Math.random() - 0.5) * 25));
          const hex = hslToHex(h, s, l);
          colors.push({
            hex,
            rgb: hexToRgb(hex),
            hsl: { h, s, l },
            name: getColorName(hex)
          });
        }
        break;
    }

    const palette: ColorPalette = {
      id: Date.now().toString(),
      name: paletteName || `لوحة ${PALETTE_STYLES.find(s => s.value === paletteStyle)?.label}`,
      colors,
      style: paletteStyle as any,
      baseColor,
      createdAt: new Date()
    };

    setGeneratedPalette(palette);
    
    toast({
      title: 'تم توليد لوحة الألوان',
      description: `تم إنشاء ${colors.length} ألوان بنجاح`
    });
  }, [baseColor, paletteStyle, colorCount, brightness, saturation, paletteName, hexToHsl, hslToHex, hexToRgb, getColorName, toast]);

  // نسخ اللون
  const copyColor = useCallback((color: ColorInfo) => {
    navigator.clipboard.writeText(color.hex);
    toast({
      title: 'تم النسخ',
      description: `تم نسخ اللون ${color.hex}`
    });
  }, [toast]);

  // حفظ اللوحة
  const savePalette = useCallback(() => {
    if (!generatedPalette) return;
    
    setSavedPalettes(prev => [generatedPalette, ...prev]);
    toast({
      title: 'تم الحفظ',
      description: 'تم حفظ لوحة الألوان'
    });
  }, [generatedPalette, toast]);

  // إنشاء سمة
  const createTheme = useCallback(() => {
    if (!generatedPalette || !onThemeCreate) return;

    const theme = {
      name: generatedPalette.name,
      colors: {
        primary: generatedPalette.colors[0]?.hex || '#3b82f6',
        secondary: generatedPalette.colors[1]?.hex || '#64748b',
        accent: generatedPalette.colors[2]?.hex || '#8b5cf6',
        background: generatedPalette.colors[generatedPalette.colors.length - 1]?.hex || '#ffffff',
        text: '#000000'
      },
      palette: generatedPalette
    };

    onThemeCreate(theme);
    toast({
      title: 'تم إنشاء السمة',
      description: 'تم إنشاء سمة جديدة من لوحة الألوان'
    });
  }, [generatedPalette, onThemeCreate, toast]);

  // توليد عشوائي
  const randomGenerate = useCallback(() => {
    const randomHue = Math.floor(Math.random() * 360);
    const randomColor = hslToHex(randomHue, 70, 50);
    setBaseColor(randomColor);
    setTimeout(generatePalette, 100);
  }, [hslToHex, generatePalette]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            مولد لوحات الألوان الذكي
          </CardTitle>
          <CardDescription>
            إنشاء لوحات ألوان متناسقة وسمات تصميم بنقرة واحدة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">إنشاء</TabsTrigger>
              <TabsTrigger value="saved">المحفوظة</TabsTrigger>
              <TabsTrigger value="settings">الإعدادات</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="baseColor">اللون الأساسي</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="baseColor"
                        type="color"
                        value={baseColor}
                        onChange={(e) => setBaseColor(e.target.value)}
                        className="w-20 h-10 p-1"
                      />
                      <Input
                        value={baseColor}
                        onChange={(e) => setBaseColor(e.target.value)}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="paletteStyle">نمط اللوحة</Label>
                    <Select value={paletteStyle} onValueChange={setPaletteStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PALETTE_STYLES.map(style => (
                          <SelectItem key={style.value} value={style.value}>
                            <div>
                              <div className="font-medium">{style.label}</div>
                              <div className="text-sm text-muted-foreground">{style.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>عدد الألوان: {colorCount[0]}</Label>
                    <Slider
                      value={colorCount}
                      onValueChange={setColorCount}
                      min={3}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>السطوع: {brightness[0]}%</Label>
                    <Slider
                      value={brightness}
                      onValueChange={setBrightness}
                      min={20}
                      max={80}
                      step={5}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>التشبع: {saturation[0]}%</Label>
                    <Slider
                      value={saturation}
                      onValueChange={setSaturation}
                      min={30}
                      max={90}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="paletteName">اسم اللوحة</Label>
                    <Input
                      id="paletteName"
                      value={paletteName}
                      onChange={(e) => setPaletteName(e.target.value)}
                      placeholder="لوحة ألوان جديدة"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={generatePalette} className="flex-1">
                      <Wand2 className="w-4 h-4 mr-2" />
                      توليد لوحة
                    </Button>
                    <Button onClick={randomGenerate} variant="outline">
                      <Shuffle className="w-4 h-4" />
                    </Button>
                  </div>

                  {generatedPalette && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{generatedPalette.name}</h4>
                        <div className="flex gap-1">
                          <Button onClick={savePalette} size="sm" variant="outline">
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button onClick={createTheme} size="sm">
                            <Sparkles className="w-4 h-4 mr-1" />
                            إنشاء سمة
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {generatedPalette.colors.map((color, index) => (
                          <div
                            key={index}
                            className="group relative rounded-lg overflow-hidden cursor-pointer border"
                            onClick={() => copyColor(color)}
                          >
                            <div
                              className="h-16 w-full"
                              style={{ backgroundColor: color.hex }}
                            />
                            <div className="p-2 bg-white dark:bg-gray-900">
                              <div className="text-xs font-mono">{color.hex}</div>
                              <div className="text-xs text-muted-foreground">{color.name}</div>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <Copy className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="saved" className="space-y-4">
              {savedPalettes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد لوحات محفوظة
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedPalettes.map((palette) => (
                    <Card key={palette.id} className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => onPaletteSelect?.(palette)}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{palette.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {PALETTE_STYLES.find(s => s.value === palette.style)?.label}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-1">
                          {palette.colors.map((color, index) => (
                            <div
                              key={index}
                              className="h-8 flex-1 rounded"
                              style={{ backgroundColor: color.hex }}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="w-8 h-8 mx-auto mb-2" />
                إعدادات متقدمة قريباً
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColorPaletteGenerator;