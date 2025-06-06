import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { LoadingAnimation } from '@/components/loading-animation';
import { 
  Palette, 
  Type, 
  Image, 
  Layers, 
  Settings, 
  Download,
  Eye,
  RotateCcw,
  Save,
  Sparkles
} from 'lucide-react';

interface CustomizationOptions {
  backgroundColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  watermark?: {
    text?: string;
    image?: string;
    opacity?: number;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    size?: number;
  };
  shadow?: {
    enabled: boolean;
    color?: string;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
  };
  orientation?: 'portrait' | 'landscape';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  format?: 'png' | 'jpg' | 'pdf';
  dimensions?: {
    width: number;
    height: number;
    dpi?: number;
  };
}

interface TextCustomization {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  textShadow?: {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
  };
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    direction?: number;
  };
}

interface AdvancedCustomizationProps {
  template: any;
  formData: Record<string, any>;
  onCustomizationChange: (customization: CustomizationOptions) => void;
  onPreviewUpdate: (previewUrl: string) => void;
}

export function AdvancedCustomization({
  template,
  formData,
  onCustomizationChange,
  onPreviewUpdate
}: AdvancedCustomizationProps) {
  const [customization, setCustomization] = useState<CustomizationOptions>({
    backgroundColor: '#ffffff',
    borderStyle: 'none',
    borderColor: '#000000',
    borderWidth: 1,
    borderRadius: 0,
    orientation: 'portrait',
    quality: 'high',
    format: 'png',
    dimensions: { width: 800, height: 600, dpi: 300 },
    shadow: { enabled: false, color: '#000000', blur: 10, offsetX: 5, offsetY: 5 },
    watermark: { opacity: 0.1, position: 'bottom-right', size: 100 }
  });

  const [textCustomizations, setTextCustomizations] = useState<Record<string, TextCustomization>>({});
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const previewTimeoutRef = useRef<NodeJS.Timeout>();

  // Font families available
  const fontFamilies = [
    'Cairo', 'Amiri', 'Noto Sans Arabic', 'Scheherazade',
    'Arial', 'Times New Roman', 'Georgia', 'Verdana',
    'Helvetica', 'Roboto', 'Open Sans', 'Lato'
  ];

  // Generate real-time preview
  const generatePreview = async () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = setTimeout(async () => {
      setIsGeneratingPreview(true);
      
      try {
        const response = await fetch('/api/certificates/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: template.id,
            formData,
            customization,
            textCustomizations
          })
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          onPreviewUpdate(url);
        }
      } catch (error) {
        console.error('خطأ في إنشاء المعاينة:', error);
      } finally {
        setIsGeneratingPreview(false);
      }
    }, 500); // Debounce for 500ms
  };

  // Update customization and notify parent
  const updateCustomization = (updates: Partial<CustomizationOptions>) => {
    const newCustomization = { ...customization, ...updates };
    setCustomization(newCustomization);
    onCustomizationChange(newCustomization);
    generatePreview();
  };

  // Update text customization for specific field
  const updateTextCustomization = (fieldName: string, updates: Partial<TextCustomization>) => {
    const newTextCustomizations = {
      ...textCustomizations,
      [fieldName]: { ...textCustomizations[fieldName], ...updates }
    };
    setTextCustomizations(newTextCustomizations);
    generatePreview();
  };

  // Reset to defaults
  const resetCustomization = () => {
    setCustomization({
      backgroundColor: '#ffffff',
      borderStyle: 'none',
      borderColor: '#000000',
      borderWidth: 1,
      borderRadius: 0,
      orientation: 'portrait',
      quality: 'high',
      format: 'png',
      dimensions: { width: 800, height: 600, dpi: 300 },
      shadow: { enabled: false, color: '#000000', blur: 10, offsetX: 5, offsetY: 5 },
      watermark: { opacity: 0.1, position: 'bottom-right', size: 100 }
    });
    setTextCustomizations({});
  };

  // Generate preview on mount and when dependencies change
  useEffect(() => {
    generatePreview();
  }, [template.id, formData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">تخصيص متقدم</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetCustomization}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            إعادة تعيين
          </Button>
          <Button size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            حفظ القالب
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customization Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              خيارات التخصيص
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="layout" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="layout">التخطيط</TabsTrigger>
                <TabsTrigger value="style">الأسلوب</TabsTrigger>
                <TabsTrigger value="text">النص</TabsTrigger>
                <TabsTrigger value="effects">التأثيرات</TabsTrigger>
              </TabsList>

              {/* Layout Tab */}
              <TabsContent value="layout" className="space-y-4">
                <div className="space-y-2">
                  <Label>الاتجاه</Label>
                  <Select
                    value={customization.orientation || 'portrait'}
                    onValueChange={(value: 'portrait' | 'landscape') =>
                      updateCustomization({ orientation: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">عمودي</SelectItem>
                      <SelectItem value="landscape">أفقي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>العرض (px)</Label>
                    <Input
                      type="number"
                      value={customization.dimensions?.width || 800}
                      onChange={(e) =>
                        updateCustomization({
                          dimensions: {
                            ...customization.dimensions,
                            width: parseInt(e.target.value) || 800
                          }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الارتفاع (px)</Label>
                    <Input
                      type="number"
                      value={customization.dimensions?.height || 600}
                      onChange={(e) =>
                        updateCustomization({
                          dimensions: {
                            ...customization.dimensions,
                            height: parseInt(e.target.value) || 600
                          }
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>الجودة</Label>
                  <Select
                    value={customization.quality || 'high'}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'ultra') =>
                      updateCustomization({ quality: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="ultra">فائقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Style Tab */}
              <TabsContent value="style" className="space-y-4">
                <div className="space-y-2">
                  <Label>لون الخلفية</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customization.backgroundColor || '#ffffff'}
                      onChange={(e) =>
                        updateCustomization({ backgroundColor: e.target.value })
                      }
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={customization.backgroundColor || '#ffffff'}
                      onChange={(e) =>
                        updateCustomization({ backgroundColor: e.target.value })
                      }
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>نمط الحدود</Label>
                  <Select
                    value={customization.borderStyle || 'none'}
                    onValueChange={(value: any) =>
                      updateCustomization({ borderStyle: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بلا حدود</SelectItem>
                      <SelectItem value="solid">خط مصمت</SelectItem>
                      <SelectItem value="dashed">خط متقطع</SelectItem>
                      <SelectItem value="dotted">نقاط</SelectItem>
                      <SelectItem value="double">خط مزدوج</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {customization.borderStyle !== 'none' && (
                  <>
                    <div className="space-y-2">
                      <Label>لون الحدود</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={customization.borderColor || '#000000'}
                          onChange={(e) =>
                            updateCustomization({ borderColor: e.target.value })
                          }
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={customization.borderColor || '#000000'}
                          onChange={(e) =>
                            updateCustomization({ borderColor: e.target.value })
                          }
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>عرض الحدود: {customization.borderWidth || 1}px</Label>
                      <Slider
                        value={[customization.borderWidth || 1]}
                        onValueChange={([value]) =>
                          updateCustomization({ borderWidth: value })
                        }
                        max={20}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>انحناء الزوايا: {customization.borderRadius || 0}px</Label>
                  <Slider
                    value={[customization.borderRadius || 0]}
                    onValueChange={([value]) =>
                      updateCustomization({ borderRadius: value })
                    }
                    max={50}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>
              </TabsContent>

              {/* Text Tab */}
              <TabsContent value="text" className="space-y-4">
                {template.fields?.map((field: any) => (
                  <Card key={field.name} className="p-4">
                    <h4 className="font-medium mb-3">{field.label}</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>نوع الخط</Label>
                        <Select
                          value={textCustomizations[field.name]?.fontFamily || 'Cairo'}
                          onValueChange={(value) =>
                            updateTextCustomization(field.name, { fontFamily: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fontFamilies.map(font => (
                              <SelectItem key={font} value={font}>
                                {font}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>حجم الخط</Label>
                        <Input
                          type="number"
                          value={textCustomizations[field.name]?.fontSize || 16}
                          onChange={(e) =>
                            updateTextCustomization(field.name, {
                              fontSize: parseInt(e.target.value) || 16
                            })
                          }
                          min={8}
                          max={72}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>لون النص</Label>
                        <Input
                          type="color"
                          value={textCustomizations[field.name]?.color || '#000000'}
                          onChange={(e) =>
                            updateTextCustomization(field.name, { color: e.target.value })
                          }
                          className="w-full h-10 p-1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>محاذاة النص</Label>
                        <Select
                          value={textCustomizations[field.name]?.textAlign || 'center'}
                          onValueChange={(value: any) =>
                            updateTextCustomization(field.name, { textAlign: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">يسار</SelectItem>
                            <SelectItem value="center">وسط</SelectItem>
                            <SelectItem value="right">يمين</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              {/* Effects Tab */}
              <TabsContent value="effects" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>تفعيل الظل</Label>
                    <Switch
                      checked={customization.shadow?.enabled || false}
                      onCheckedChange={(checked) =>
                        updateCustomization({
                          shadow: { ...customization.shadow, enabled: checked }
                        })
                      }
                    />
                  </div>

                  {customization.shadow?.enabled && (
                    <div className="space-y-3 pl-4 border-l-2 border-muted">
                      <div className="space-y-2">
                        <Label>لون الظل</Label>
                        <Input
                          type="color"
                          value={customization.shadow?.color || '#000000'}
                          onChange={(e) =>
                            updateCustomization({
                              shadow: { ...customization.shadow, color: e.target.value }
                            })
                          }
                          className="w-full h-10 p-1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>ضبابية الظل: {customization.shadow?.blur || 10}px</Label>
                        <Slider
                          value={[customization.shadow?.blur || 10]}
                          onValueChange={([value]) =>
                            updateCustomization({
                              shadow: { ...customization.shadow, blur: value }
                            })
                          }
                          max={50}
                          min={0}
                          step={1}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>إزاحة X: {customization.shadow?.offsetX || 5}px</Label>
                          <Slider
                            value={[customization.shadow?.offsetX || 5]}
                            onValueChange={([value]) =>
                              updateCustomization({
                                shadow: { ...customization.shadow, offsetX: value }
                              })
                            }
                            max={50}
                            min={-50}
                            step={1}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>إزاحة Y: {customization.shadow?.offsetY || 5}px</Label>
                          <Slider
                            value={[customization.shadow?.offsetY || 5]}
                            onValueChange={([value]) =>
                              updateCustomization({
                                shadow: { ...customization.shadow, offsetY: value }
                              })
                            }
                            max={50}
                            min={-50}
                            step={1}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>العلامة المائية</Label>
                  
                  <div className="space-y-2">
                    <Label>نص العلامة المائية</Label>
                    <Input
                      value={customization.watermark?.text || ''}
                      onChange={(e) =>
                        updateCustomization({
                          watermark: { ...customization.watermark, text: e.target.value }
                        })
                      }
                      placeholder="نص العلامة المائية"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>شفافية العلامة المائية: {Math.round((customization.watermark?.opacity || 0.1) * 100)}%</Label>
                    <Slider
                      value={[(customization.watermark?.opacity || 0.1) * 100]}
                      onValueChange={([value]) =>
                        updateCustomization({
                          watermark: { ...customization.watermark, opacity: value / 100 }
                        })
                      }
                      max={100}
                      min={0}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>موقع العلامة المائية</Label>
                    <Select
                      value={customization.watermark?.position || 'bottom-right'}
                      onValueChange={(value: any) =>
                        updateCustomization({
                          watermark: { ...customization.watermark, position: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">أعلى اليسار</SelectItem>
                        <SelectItem value="top-right">أعلى اليمين</SelectItem>
                        <SelectItem value="bottom-left">أسفل اليسار</SelectItem>
                        <SelectItem value="bottom-right">أسفل اليمين</SelectItem>
                        <SelectItem value="center">الوسط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              معاينة مباشرة
              {isGeneratingPreview && <Badge variant="secondary">جارٍ التحديث...</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-50 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              {isGeneratingPreview ? (
                <LoadingAnimation text="جارٍ إنشاء المعاينة..." />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="معاينة الشهادة"
                  className="max-w-full max-h-[500px] object-contain rounded shadow-lg"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>ستظهر المعاينة هنا</p>
                </div>
              )}
            </div>
            
            {previewUrl && (
              <div className="mt-4 flex gap-2">
                <Button className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  تحميل الشهادة
                </Button>
                <Button variant="outline" onClick={generatePreview}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}