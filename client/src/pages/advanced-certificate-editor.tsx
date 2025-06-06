import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Palette, 
  Type, 
  Image as ImageIcon, 
  Layers, 
  Settings, 
  Download,
  Eye,
  RotateCw,
  Move,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline
} from 'lucide-react';

interface Template {
  id: number;
  title: string;
  imageUrl: string;
  categoryId: number;
}

interface CustomizationOptions {
  backgroundColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  watermark?: {
    text?: string;
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
  format?: 'png' | 'jpg';
  dimensions?: {
    width: number;
    height: number;
  };
}

interface LayerCustomization {
  id: number;
  type: 'text' | 'image' | 'shape';
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  visible: boolean;
  content?: string;
  imageUrl?: string;
  textCustomization?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
  };
  shapeProperties?: {
    type: 'rectangle' | 'circle' | 'line';
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  };
}

export default function AdvancedCertificateEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customizations, setCustomizations] = useState<CustomizationOptions>({
    backgroundColor: '#ffffff',
    borderStyle: 'none',
    borderColor: '#000000',
    borderWidth: 2,
    orientation: 'portrait',
    quality: 'high',
    format: 'png',
    shadow: { enabled: false, color: '#000000', blur: 10, offsetX: 5, offsetY: 5 }
  });
  const [layers, setLayers] = useState<LayerCustomization[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<LayerCustomization | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('general');

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['/api/templates'],
    queryFn: async () => {
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error('فشل في جلب القوالب');
      return response.json();
    }
  });

  // Generate certificate mutation
  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/certificates/advanced-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('فشل في إنشاء الشهادة');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم إنشاء الشهادة بنجاح",
        description: "يمكنك الآن تحميل الشهادة المخصصة"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء الشهادة",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const addTextLayer = () => {
    const newLayer: LayerCustomization = {
      id: Date.now(),
      type: 'text',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 50 },
      zIndex: layers.length,
      visible: true,
      content: 'نص جديد',
      textCustomization: {
        fontFamily: 'Cairo',
        fontSize: 24,
        fontWeight: 'normal',
        color: '#000000',
        textAlign: 'center'
      }
    };
    setLayers([...layers, newLayer]);
    setSelectedLayer(newLayer);
  };

  const addImageLayer = () => {
    const newLayer: LayerCustomization = {
      id: Date.now(),
      type: 'image',
      position: { x: 100, y: 100 },
      size: { width: 150, height: 150 },
      zIndex: layers.length,
      visible: true,
      imageUrl: '/placeholder-image.jpg'
    };
    setLayers([...layers, newLayer]);
    setSelectedLayer(newLayer);
  };

  const addShapeLayer = () => {
    const newLayer: LayerCustomization = {
      id: Date.now(),
      type: 'shape',
      position: { x: 100, y: 100 },
      size: { width: 100, height: 100 },
      zIndex: layers.length,
      visible: true,
      shapeProperties: {
        type: 'rectangle',
        fillColor: '#007bff',
        strokeColor: '#0056b3',
        strokeWidth: 2
      }
    };
    setLayers([...layers, newLayer]);
    setSelectedLayer(newLayer);
  };

  const updateLayer = (layerId: number, updates: Partial<LayerCustomization>) => {
    setLayers(layers.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
    if (selectedLayer?.id === layerId) {
      setSelectedLayer({ ...selectedLayer, ...updates });
    }
  };

  const deleteLayer = (layerId: number) => {
    setLayers(layers.filter(layer => layer.id !== layerId));
    if (selectedLayer?.id === layerId) {
      setSelectedLayer(null);
    }
  };

  const generateCertificate = () => {
    if (!selectedTemplate) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار قالب أولاً",
        variant: "destructive"
      });
      return;
    }

    generateMutation.mutate({
      templateId: selectedTemplate.id,
      customizations,
      layers,
      formData
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            محرر الشهادات المتقدم
          </h1>
          <p className="text-gray-600">
            قم بتخصيص الشهادات بأدوات متقدمة واحترافية
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Preview Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  معاينة الشهادة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                  {selectedTemplate ? (
                    <div className="relative w-full h-full">
                      <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-full border rounded"
                        style={{ aspectRatio: customizations.orientation === 'landscape' ? '4/3' : '3/4' }}
                      />
                      {/* Layer overlay controls would go here */}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>اختر قالباً لبدء التصميم</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Button onClick={generateCertificate} disabled={generateMutation.isPending}>
                    <Download className="w-4 h-4 ml-2" />
                    {generateMutation.isPending ? 'جاري الإنشاء...' : 'تحميل الشهادة'}
                  </Button>
                  <Button variant="outline">
                    <Eye className="w-4 h-4 ml-2" />
                    معاينة
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customization Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  أدوات التخصيص
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">عام</TabsTrigger>
                    <TabsTrigger value="layers">طبقات</TabsTrigger>
                    <TabsTrigger value="text">نص</TabsTrigger>
                    <TabsTrigger value="effects">تأثيرات</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4 mt-4">
                    <div>
                      <Label>اختيار القالب</Label>
                      <Select onValueChange={(value) => {
                        const template = templatesData?.templates?.find((t: Template) => t.id === parseInt(value));
                        setSelectedTemplate(template || null);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر قالباً" />
                        </SelectTrigger>
                        <SelectContent>
                          {templatesData?.templates?.map((template: Template) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div>
                      <Label>لون الخلفية</Label>
                      <Input
                        type="color"
                        value={customizations.backgroundColor}
                        onChange={(e) => setCustomizations({
                          ...customizations,
                          backgroundColor: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <Label>الاتجاه</Label>
                      <Select value={customizations.orientation} onValueChange={(value: 'portrait' | 'landscape') => 
                        setCustomizations({ ...customizations, orientation: value })
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">عمودي</SelectItem>
                          <SelectItem value="landscape">أفقي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>الجودة</Label>
                      <Select value={customizations.quality} onValueChange={(value: any) => 
                        setCustomizations({ ...customizations, quality: value })
                      }>
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

                    <div>
                      <Label>تنسيق الملف</Label>
                      <Select value={customizations.format} onValueChange={(value: 'png' | 'jpg') => 
                        setCustomizations({ ...customizations, format: value })
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="jpg">JPG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="layers" className="space-y-4 mt-4">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addTextLayer}>
                        <Type className="w-4 h-4 ml-1" />
                        نص
                      </Button>
                      <Button size="sm" onClick={addImageLayer}>
                        <ImageIcon className="w-4 h-4 ml-1" />
                        صورة
                      </Button>
                      <Button size="sm" onClick={addShapeLayer}>
                        <Layers className="w-4 h-4 ml-1" />
                        شكل
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {layers.map((layer, index) => (
                        <div key={layer.id} className={`p-3 border rounded-lg cursor-pointer ${
                          selectedLayer?.id === layer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`} onClick={() => setSelectedLayer(layer)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {layer.type === 'text' && <Type className="w-4 h-4" />}
                              {layer.type === 'image' && <ImageIcon className="w-4 h-4" />}
                              {layer.type === 'shape' && <Layers className="w-4 h-4" />}
                              <span className="text-sm font-medium">
                                {layer.type === 'text' ? 'طبقة نص' : 
                                 layer.type === 'image' ? 'طبقة صورة' : 'طبقة شكل'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={layer.visible}
                                onCheckedChange={(checked) => updateLayer(layer.id, { visible: checked })}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteLayer(layer.id);
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                          {layer.content && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {layer.content}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="text" className="space-y-4 mt-4">
                    {selectedLayer?.type === 'text' ? (
                      <>
                        <div>
                          <Label>النص</Label>
                          <Input
                            value={selectedLayer.content || ''}
                            onChange={(e) => updateLayer(selectedLayer.id, { content: e.target.value })}
                            placeholder="أدخل النص"
                          />
                        </div>

                        <div>
                          <Label>الخط</Label>
                          <Select
                            value={selectedLayer.textCustomization?.fontFamily || 'Cairo'}
                            onValueChange={(value) => updateLayer(selectedLayer.id, {
                              textCustomization: { ...selectedLayer.textCustomization, fontFamily: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cairo">Cairo</SelectItem>
                              <SelectItem value="Amiri">Amiri</SelectItem>
                              <SelectItem value="Tajawal">Tajawal</SelectItem>
                              <SelectItem value="Arial">Arial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>حجم الخط: {selectedLayer.textCustomization?.fontSize || 24}</Label>
                          <Slider
                            value={[selectedLayer.textCustomization?.fontSize || 24]}
                            onValueChange={(value) => updateLayer(selectedLayer.id, {
                              textCustomization: { ...selectedLayer.textCustomization, fontSize: value[0] }
                            })}
                            min={8}
                            max={72}
                            step={1}
                          />
                        </div>

                        <div>
                          <Label>لون النص</Label>
                          <Input
                            type="color"
                            value={selectedLayer.textCustomization?.color || '#000000'}
                            onChange={(e) => updateLayer(selectedLayer.id, {
                              textCustomization: { ...selectedLayer.textCustomization, color: e.target.value }
                            })}
                          />
                        </div>

                        <div>
                          <Label>محاذاة النص</Label>
                          <div className="flex gap-1">
                            {[
                              { value: 'left', icon: AlignLeft },
                              { value: 'center', icon: AlignCenter },
                              { value: 'right', icon: AlignRight }
                            ].map(({ value, icon: Icon }) => (
                              <Button
                                key={value}
                                size="sm"
                                variant={selectedLayer.textCustomization?.textAlign === value ? 'default' : 'outline'}
                                onClick={() => updateLayer(selectedLayer.id, {
                                  textCustomization: { ...selectedLayer.textCustomization, textAlign: value as any }
                                })}
                              >
                                <Icon className="w-4 h-4" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 text-center">اختر طبقة نص للتعديل</p>
                    )}
                  </TabsContent>

                  <TabsContent value="effects" className="space-y-4 mt-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>الظل</Label>
                        <Switch
                          checked={customizations.shadow?.enabled || false}
                          onCheckedChange={(checked) => setCustomizations({
                            ...customizations,
                            shadow: { ...customizations.shadow, enabled: checked }
                          })}
                        />
                      </div>
                      
                      {customizations.shadow?.enabled && (
                        <div className="space-y-3">
                          <div>
                            <Label>لون الظل</Label>
                            <Input
                              type="color"
                              value={customizations.shadow.color || '#000000'}
                              onChange={(e) => setCustomizations({
                                ...customizations,
                                shadow: { ...customizations.shadow, color: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <Label>ضبابية الظل: {customizations.shadow.blur || 10}</Label>
                            <Slider
                              value={[customizations.shadow.blur || 10]}
                              onValueChange={(value) => setCustomizations({
                                ...customizations,
                                shadow: { ...customizations.shadow, blur: value[0] }
                              })}
                              min={0}
                              max={50}
                              step={1}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <Label>نمط الحدود</Label>
                      <Select value={customizations.borderStyle} onValueChange={(value: any) => 
                        setCustomizations({ ...customizations, borderStyle: value })
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون حدود</SelectItem>
                          <SelectItem value="solid">مصمت</SelectItem>
                          <SelectItem value="dashed">متقطع</SelectItem>
                          <SelectItem value="dotted">منقط</SelectItem>
                          <SelectItem value="double">مزدوج</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {customizations.borderStyle !== 'none' && (
                      <>
                        <div>
                          <Label>لون الحدود</Label>
                          <Input
                            type="color"
                            value={customizations.borderColor || '#000000'}
                            onChange={(e) => setCustomizations({
                              ...customizations,
                              borderColor: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <Label>سماكة الحدود: {customizations.borderWidth || 2}</Label>
                          <Slider
                            value={[customizations.borderWidth || 2]}
                            onValueChange={(value) => setCustomizations({
                              ...customizations,
                              borderWidth: value[0]
                            })}
                            min={1}
                            max={20}
                            step={1}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}