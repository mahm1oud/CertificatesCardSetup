import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { X, Save, RotateCcw, Type, Image, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FieldType {
  id: number;
  name: string;
  label?: string;
  labelAr?: string;
  type: string;
  position: { x: number; y: number };
  style?: any;
  zIndex?: number;
  visible?: boolean;
  rotation?: number;
  locked?: boolean;
  defaultValue?: string;
  placeholder?: string;
  placeholderAr?: string;
  options?: { value: string; label: string }[];
}

interface OptimizedFieldFormProps {
  field: FieldType;
  onFieldUpdate: (updatedField: FieldType) => void;
  onClose: () => void;
  isOpen: boolean;
}

// مكون محسن لتحرير الحقول مع أداء سريع
const OptimizedFieldForm = memo<OptimizedFieldFormProps>(({
  field,
  onFieldUpdate,
  onClose,
  isOpen
}) => {
  const [localField, setLocalField] = useState<FieldType>(field);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // تحديث الحقل المحلي عند تغيير الحقل الخارجي
  useEffect(() => {
    setLocalField(field);
    setHasChanges(false);
  }, [field]);

  // دوال التحديث المحسنة
  const updateField = useCallback((updates: Partial<FieldType>) => {
    setLocalField(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const updateStyle = useCallback((styleUpdates: Partial<any>) => {
    setLocalField(prev => ({
      ...prev,
      style: { ...prev.style, ...styleUpdates }
    }));
    setHasChanges(true);
  }, []);

  const updatePosition = useCallback((positionUpdates: Partial<{ x: number; y: number }>) => {
    setLocalField(prev => ({
      ...prev,
      position: { ...prev.position, ...positionUpdates }
    }));
    setHasChanges(true);
  }, []);

  // قوائم محسنة بالذاكرة المؤقتة
  const fieldTypes = useMemo(() => [
    { value: 'text', label: 'نص', icon: Type },
    { value: 'image', label: 'صورة', icon: Image },
    { value: 'dropdown', label: 'قائمة منسدلة' },
    { value: 'radio', label: 'خيارات متعددة' }
  ], []);

  const fonts = useMemo(() => [
    { value: 'Cairo', label: 'Cairo - القاهرة' },
    { value: 'Tajawal', label: 'Tajawal - تجوال' },
    { value: 'Amiri', label: 'Amiri - أميري' },
    { value: 'Almarai', label: 'Almarai - المرعى' },
    { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans Arabic' }
  ], []);

  const textAlignments = useMemo(() => [
    { value: 'right', label: 'يمين' },
    { value: 'center', label: 'وسط' },
    { value: 'left', label: 'يسار' }
  ], []);

  // دوال الأحداث
  const handleSave = useCallback(() => {
    if (hasChanges) {
      onFieldUpdate(localField);
      setHasChanges(false);
      toast({ title: 'تم حفظ التغييرات بنجاح' });
    }
  }, [localField, hasChanges, onFieldUpdate, toast]);

  const handleReset = useCallback(() => {
    setLocalField(field);
    setHasChanges(false);
    toast({ title: 'تم إعادة تعيين التغييرات' });
  }, [field, toast]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      const confirmClose = window.confirm('هناك تغييرات غير محفوظة. هل تريد المتابعة؟');
      if (!confirmClose) return;
    }
    onClose();
  }, [hasChanges, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-2 py-1">
              {fieldTypes.find(t => t.value === localField.type)?.label || localField.type}
            </Badge>
            <CardTitle className="text-lg">
              {localField.labelAr || localField.label || localField.name}
            </CardTitle>
            {hasChanges && (
              <Badge variant="destructive" className="text-xs">
                غير محفوظ
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              disabled={!hasChanges}
            >
              <RotateCcw className="w-4 h-4 ml-1" />
              إعادة تعيين
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4 ml-1" />
              حفظ
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="basic">الإعدادات الأساسية</TabsTrigger>
              <TabsTrigger value="style">التنسيق والألوان</TabsTrigger>
              <TabsTrigger value="position">الموضع والحركة</TabsTrigger>
            </TabsList>

            {/* الإعدادات الأساسية */}
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">نوع الحقل</Label>
                    <Select 
                      value={localField.type} 
                      onValueChange={(value) => updateField({ type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">اسم الحقل</Label>
                    <Input
                      value={localField.name}
                      onChange={(e) => updateField({ name: e.target.value })}
                      className="mt-1"
                      placeholder="اسم فريد للحقل"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">التسمية (عربي)</Label>
                    <Input
                      value={localField.labelAr || ''}
                      onChange={(e) => updateField({ labelAr: e.target.value })}
                      className="mt-1"
                      placeholder="النص الذي سيظهر بالعربية"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">التسمية (إنجليزي)</Label>
                    <Input
                      value={localField.label || ''}
                      onChange={(e) => updateField({ label: e.target.value })}
                      className="mt-1"
                      placeholder="النص الذي سيظهر بالإنجليزية"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">القيمة الافتراضية</Label>
                    <Input
                      value={localField.defaultValue || ''}
                      onChange={(e) => updateField({ defaultValue: e.target.value })}
                      className="mt-1"
                      placeholder="النص الافتراضي"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">النص التوضيحي (عربي)</Label>
                    <Input
                      value={localField.placeholderAr || ''}
                      onChange={(e) => updateField({ placeholderAr: e.target.value })}
                      className="mt-1"
                      placeholder="نص المساعدة بالعربية"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">النص التوضيحي (إنجليزي)</Label>
                    <Input
                      value={localField.placeholder || ''}
                      onChange={(e) => updateField({ placeholder: e.target.value })}
                      className="mt-1"
                      placeholder="نص المساعدة بالإنجليزية"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">مرئي</Label>
                      <Switch
                        checked={localField.visible !== false}
                        onCheckedChange={(checked) => updateField({ visible: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">مقفل</Label>
                      <Switch
                        checked={localField.locked === true}
                        onCheckedChange={(checked) => updateField({ locked: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* التنسيق والألوان */}
            <TabsContent value="style" className="space-y-6">
              {localField.type === 'text' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">نوع الخط</Label>
                      <Select 
                        value={localField.style?.fontFamily || 'Cairo'} 
                        onValueChange={(value) => updateStyle({ fontFamily: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fonts.map(font => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">محاذاة النص</Label>
                      <Select 
                        value={localField.style?.align || 'center'} 
                        onValueChange={(value) => updateStyle({ align: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {textAlignments.map(align => (
                            <SelectItem key={align.value} value={align.value}>
                              {align.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        حجم الخط: {localField.style?.fontSize || 16}px
                      </Label>
                      <Slider
                        value={[localField.style?.fontSize || 16]}
                        onValueChange={([value]) => updateStyle({ fontSize: value })}
                        min={8}
                        max={72}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">لون النص</Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="color"
                          value={localField.style?.color || '#000000'}
                          onChange={(e) => updateStyle({ color: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={localField.style?.color || '#000000'}
                          onChange={(e) => updateStyle({ color: e.target.value })}
                          className="flex-1"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">لون الخلفية</Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="color"
                          value={localField.style?.backgroundColor || '#ffffff'}
                          onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={localField.style?.backgroundColor || '#ffffff'}
                          onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                          className="flex-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        العرض الأقصى: {localField.style?.maxWidth || 300}px
                      </Label>
                      <Slider
                        value={[localField.style?.maxWidth || 300]}
                        onValueChange={([value]) => updateStyle({ maxWidth: value })}
                        min={50}
                        max={800}
                        step={10}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {localField.type === 'image' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    إعدادات الصور ستكون متاحة قريباً
                  </p>
                </div>
              )}
            </TabsContent>

            {/* الموضع والحركة */}
            <TabsContent value="position" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b pb-2">الموضع</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">الموضع الأفقي (X)</Label>
                      <Input
                        type="number"
                        value={localField.position.x}
                        onChange={(e) => updatePosition({ x: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">الموضع العمودي (Y)</Label>
                      <Input
                        type="number"
                        value={localField.position.y}
                        onChange={(e) => updatePosition({ y: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">الطبقة (Z-Index)</Label>
                    <Input
                      type="number"
                      value={localField.zIndex || 1}
                      onChange={(e) => updateField({ zIndex: parseInt(e.target.value) || 1 })}
                      className="mt-1"
                      min="1"
                      max="999"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b pb-2">التدوير والحركة</h3>
                  
                  <div>
                    <Label className="text-sm font-medium">
                      زاوية الدوران: {localField.rotation || 0}°
                    </Label>
                    <Slider
                      value={[localField.rotation || 0]}
                      onValueChange={([value]) => updateField({ rotation: value })}
                      min={-180}
                      max={180}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="text-sm font-medium mb-2">معاينة الموضع</h4>
                    <div className="text-xs text-muted-foreground">
                      <p>الموضع: ({localField.position.x}, {localField.position.y})</p>
                      <p>الطبقة: {localField.zIndex || 1}</p>
                      <p>الدوران: {localField.rotation || 0}°</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});

OptimizedFieldForm.displayName = 'OptimizedFieldForm';

export default OptimizedFieldForm;