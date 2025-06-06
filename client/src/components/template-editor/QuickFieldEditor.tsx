import React, { memo, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Save, RotateCcw } from 'lucide-react';
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

interface QuickFieldEditorProps {
  field: FieldType;
  isOpen: boolean;
  onSave: (updatedField: FieldType) => void;
  onClose: () => void;
}

// مكون محسن لتحرير سريع للحقول
const QuickFieldEditor = memo<QuickFieldEditorProps>(({ 
  field, 
  isOpen, 
  onSave, 
  onClose 
}) => {
  const [editedField, setEditedField] = useState<FieldType>(field);
  const { toast } = useToast();

  // تحديث الحقل المحلي عند تغيير الحقل الخارجي
  React.useEffect(() => {
    setEditedField(field);
  }, [field]);

  // دوال التحديث المحسنة
  const updateField = useCallback((updates: Partial<FieldType>) => {
    setEditedField(prev => ({ ...prev, ...updates }));
  }, []);

  const updateStyle = useCallback((styleUpdates: Partial<any>) => {
    setEditedField(prev => ({
      ...prev,
      style: { ...prev.style, ...styleUpdates }
    }));
  }, []);

  const updatePosition = useCallback((positionUpdates: Partial<{ x: number; y: number }>) => {
    setEditedField(prev => ({
      ...prev,
      position: { ...prev.position, ...positionUpdates }
    }));
  }, []);

  // القوائم المحسنة
  const fontOptions = useMemo(() => [
    { value: 'Cairo', label: 'Cairo - القاهرة' },
    { value: 'Tajawal', label: 'Tajawal - تجوال' },
    { value: 'Amiri', label: 'Amiri - أميري' },
    { value: 'Almarai', label: 'Almarai - المرعى' },
    { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans Arabic' }
  ], []);

  const typeOptions = useMemo(() => [
    { value: 'text', label: 'نص' },
    { value: 'image', label: 'صورة' },
    { value: 'dropdown', label: 'قائمة منسدلة' },
    { value: 'radio', label: 'خيارات متعددة' }
  ], []);

  const alignOptions = useMemo(() => [
    { value: 'right', label: 'يمين' },
    { value: 'center', label: 'وسط' },
    { value: 'left', label: 'يسار' }
  ], []);

  const handleSave = useCallback(() => {
    onSave(editedField);
    toast({ title: 'تم حفظ التغييرات بنجاح' });
  }, [editedField, onSave, toast]);

  const handleReset = useCallback(() => {
    setEditedField(field);
    toast({ title: 'تم إعادة تعيين التغييرات' });
  }, [field, toast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg">
            تحرير سريع: {editedField.labelAr || editedField.label || editedField.name}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 ml-1" />
              إعادة تعيين
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 ml-1" />
              حفظ
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* الإعدادات الأساسية */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">الإعدادات الأساسية</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">اسم الحقل</Label>
                  <Input
                    size="sm"
                    value={editedField.name}
                    onChange={(e) => updateField({ name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">نوع الحقل</Label>
                  <Select value={editedField.type} onValueChange={(value) => updateField({ type: value })}>
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">التسمية (عربي)</Label>
                  <Input
                    size="sm"
                    value={editedField.labelAr || ''}
                    onChange={(e) => updateField({ labelAr: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">التسمية (إنجليزي)</Label>
                  <Input
                    size="sm"
                    value={editedField.label || ''}
                    onChange={(e) => updateField({ label: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">القيمة الافتراضية</Label>
                <Input
                  size="sm"
                  value={editedField.defaultValue || ''}
                  onChange={(e) => updateField({ defaultValue: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">مرئي</Label>
                <Switch
                  checked={editedField.visible !== false}
                  onCheckedChange={(checked) => updateField({ visible: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">مقفل</Label>
                <Switch
                  checked={editedField.locked === true}
                  onCheckedChange={(checked) => updateField({ locked: checked })}
                />
              </div>
            </div>

            {/* إعدادات التنسيق والموضع */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">التنسيق والموضع</h3>
              
              {editedField.type === 'text' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">الخط</Label>
                      <Select 
                        value={editedField.style?.fontFamily || 'Cairo'} 
                        onValueChange={(value) => updateStyle({ fontFamily: value })}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fontOptions.map(font => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">المحاذاة</Label>
                      <Select 
                        value={editedField.style?.align || 'center'} 
                        onValueChange={(value) => updateStyle({ align: value })}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {alignOptions.map(align => (
                            <SelectItem key={align.value} value={align.value}>
                              {align.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">
                        حجم الخط: {editedField.style?.fontSize || 16}px
                      </Label>
                      <Slider
                        value={[editedField.style?.fontSize || 16]}
                        onValueChange={([value]) => updateStyle({ fontSize: value })}
                        min={8}
                        max={72}
                        step={1}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">لون النص</Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="color"
                          value={editedField.style?.color || '#000000'}
                          onChange={(e) => updateStyle({ color: e.target.value })}
                          className="w-10 h-8 rounded border"
                        />
                        <Input
                          size="sm"
                          value={editedField.style?.color || '#000000'}
                          onChange={(e) => updateStyle({ color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">الموضع X</Label>
                  <Input
                    size="sm"
                    type="number"
                    value={editedField.position.x}
                    onChange={(e) => updatePosition({ x: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">الموضع Y</Label>
                  <Input
                    size="sm"
                    type="number"
                    value={editedField.position.y}
                    onChange={(e) => updatePosition({ y: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">الطبقة</Label>
                  <Input
                    size="sm"
                    type="number"
                    value={editedField.zIndex || 1}
                    onChange={(e) => updateField({ zIndex: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">
                  الدوران: {editedField.rotation || 0}°
                </Label>
                <Slider
                  value={[editedField.rotation || 0]}
                  onValueChange={([value]) => updateField({ rotation: value })}
                  min={-180}
                  max={180}
                  step={1}
                  className="mt-1"
                />
              </div>

              {editedField.style && (
                <div>
                  <Label className="text-xs">
                    العرض الأقصى: {editedField.style.maxWidth || 300}px
                  </Label>
                  <Slider
                    value={[editedField.style.maxWidth || 300]}
                    onValueChange={([value]) => updateStyle({ maxWidth: value })}
                    min={50}
                    max={800}
                    step={10}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

QuickFieldEditor.displayName = 'QuickFieldEditor';

export default QuickFieldEditor;