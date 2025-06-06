import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Image, Type, Upload, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StaticField {
  id?: number;
  name: string;
  label: string;
  labelAr: string;
  type: "static_text" | "static_image";
  staticContent: string;
  position: { x: number; y: number; width: number; height: number };
  style: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    textAlign?: string;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
    zIndex?: number;
  };
  displayOrder: number;
  isVisible: boolean;
}

interface StaticFieldManagerProps {
  templateId: number;
  fields: StaticField[];
  onFieldsChange: (fields: StaticField[]) => void;
}

export default function StaticFieldManager({ templateId, fields, onFieldsChange }: StaticFieldManagerProps) {
  const { toast } = useToast();
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingField, setEditingField] = useState<StaticField | null>(null);
  const [newField, setNewField] = useState<Partial<StaticField>>({
    name: "",
    label: "",
    labelAr: "",
    type: "static_text",
    staticContent: "",
    position: { x: 100, y: 100, width: 200, height: 50 },
    style: {
      fontSize: 16,
      fontFamily: "Cairo",
      fontWeight: "normal",
      color: "#000000",
      textAlign: "right",
      backgroundColor: "transparent",
      borderRadius: 0,
      padding: 10,
      zIndex: 1,
    },
    displayOrder: fields.length + 1,
    isVisible: true,
  });

  const handleAddField = () => {
    if (!newField.name || !newField.label || !newField.staticContent) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const fieldToAdd: StaticField = {
      ...newField as StaticField,
      id: Date.now(), // Temporary ID
    };

    onFieldsChange([...fields, fieldToAdd]);
    setIsAddingField(false);
    setNewField({
      name: "",
      label: "",
      labelAr: "",
      type: "static_text",
      staticContent: "",
      position: { x: 100, y: 100, width: 200, height: 50 },
      style: {
        fontSize: 16,
        fontFamily: "Cairo",
        fontWeight: "normal",
        color: "#000000",
        textAlign: "right",
        backgroundColor: "transparent",
        borderRadius: 0,
        padding: 10,
        zIndex: 1,
      },
      displayOrder: fields.length + 2,
      isVisible: true,
    });

    toast({
      title: "تم إضافة الحقل الثابت",
      description: "تم إضافة الحقل الثابت بنجاح",
    });
  };

  const handleDeleteField = (fieldId: number | undefined) => {
    if (!fieldId) return;
    const updatedFields = fields.filter(field => field.id !== fieldId);
    onFieldsChange(updatedFields);
    toast({
      title: "تم حذف الحقل",
      description: "تم حذف الحقل الثابت بنجاح",
    });
  };

  const handleToggleVisibility = (fieldId: number | undefined) => {
    if (!fieldId) return;
    const updatedFields = fields.map(field =>
      field.id === fieldId ? { ...field, isVisible: !field.isVisible } : field
    );
    onFieldsChange(updatedFields);
  };

  const handleImageUpload = async (file: File, isNewField = true) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'static-field');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('فشل في رفع الصورة');
      }

      const result = await response.json();
      
      if (isNewField) {
        setNewField(prev => ({ ...prev, staticContent: result.url }));
      } else if (editingField) {
        setEditingField(prev => prev ? { ...prev, staticContent: result.url } : null);
      }

      toast({
        title: "تم رفع الصورة",
        description: "تم رفع الصورة بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في رفع الصورة",
        description: "حدث خطأ أثناء رفع الصورة",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">الحقول الثابتة</h3>
        <Button
          onClick={() => setIsAddingField(true)}
          disabled={isAddingField}
        >
          <Type className="h-4 w-4 ml-2" />
          إضافة حقل ثابت
        </Button>
      </div>

      {/* إضافة حقل جديد */}
      {isAddingField && (
        <Card>
          <CardHeader>
            <CardTitle>إضافة حقل ثابت جديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="field-name">اسم الحقل</Label>
                <Input
                  id="field-name"
                  value={newField.name}
                  onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: company_logo"
                />
              </div>
              <div>
                <Label htmlFor="field-label">تسمية الحقل</Label>
                <Input
                  id="field-label"
                  value={newField.label}
                  onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="مثال: شعار الشركة"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="field-label-ar">التسمية العربية</Label>
              <Input
                id="field-label-ar"
                value={newField.labelAr}
                onChange={(e) => setNewField(prev => ({ ...prev, labelAr: e.target.value }))}
                placeholder="مثال: شعار الشركة"
              />
            </div>

            <div>
              <Label htmlFor="field-type">نوع الحقل</Label>
              <Select
                value={newField.type}
                onValueChange={(value) => setNewField(prev => ({ ...prev, type: value as "static_text" | "static_image" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static_text">نص ثابت</SelectItem>
                  <SelectItem value="static_image">صورة ثابتة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newField.type === "static_text" ? (
              <div>
                <Label htmlFor="static-content">المحتوى النصي</Label>
                <Textarea
                  id="static-content"
                  value={newField.staticContent}
                  onChange={(e) => setNewField(prev => ({ ...prev, staticContent: e.target.value }))}
                  placeholder="أدخل النص الثابت هنا..."
                  rows={3}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="static-image">الصورة الثابتة</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, true);
                    }}
                    className="flex-1"
                  />
                  {newField.staticContent && (
                    <img
                      src={newField.staticContent}
                      alt="معاينة"
                      className="h-10 w-10 object-cover rounded border"
                    />
                  )}
                </div>
              </div>
            )}

            {/* إعدادات الموقع */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label>X</Label>
                <Input
                  type="number"
                  value={newField.position?.x || 0}
                  onChange={(e) => setNewField(prev => ({
                    ...prev,
                    position: { ...prev.position!, x: parseInt(e.target.value) || 0 }
                  }))}
                />
              </div>
              <div>
                <Label>Y</Label>
                <Input
                  type="number"
                  value={newField.position?.y || 0}
                  onChange={(e) => setNewField(prev => ({
                    ...prev,
                    position: { ...prev.position!, y: parseInt(e.target.value) || 0 }
                  }))}
                />
              </div>
              <div>
                <Label>العرض</Label>
                <Input
                  type="number"
                  value={newField.position?.width || 0}
                  onChange={(e) => setNewField(prev => ({
                    ...prev,
                    position: { ...prev.position!, width: parseInt(e.target.value) || 0 }
                  }))}
                />
              </div>
              <div>
                <Label>الارتفاع</Label>
                <Input
                  type="number"
                  value={newField.position?.height || 0}
                  onChange={(e) => setNewField(prev => ({
                    ...prev,
                    position: { ...prev.position!, height: parseInt(e.target.value) || 0 }
                  }))}
                />
              </div>
            </div>

            {/* إعدادات التنسيق للنص */}
            {newField.type === "static_text" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>حجم الخط</Label>
                  <Input
                    type="number"
                    value={newField.style?.fontSize || 16}
                    onChange={(e) => setNewField(prev => ({
                      ...prev,
                      style: { ...prev.style!, fontSize: parseInt(e.target.value) || 16 }
                    }))}
                  />
                </div>
                <div>
                  <Label>لون النص</Label>
                  <Input
                    type="color"
                    value={newField.style?.color || "#000000"}
                    onChange={(e) => setNewField(prev => ({
                      ...prev,
                      style: { ...prev.style!, color: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label>محاذاة النص</Label>
                  <Select
                    value={newField.style?.textAlign || "right"}
                    onValueChange={(value) => setNewField(prev => ({
                      ...prev,
                      style: { ...prev.style!, textAlign: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="right">يمين</SelectItem>
                      <SelectItem value="center">وسط</SelectItem>
                      <SelectItem value="left">يسار</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddingField(false)}
              >
                إلغاء
              </Button>
              <Button onClick={handleAddField}>
                إضافة الحقل
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* قائمة الحقول الثابتة */}
      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id || index}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={field.type === "static_text" ? "default" : "secondary"}>
                    {field.type === "static_text" ? (
                      <Type className="h-3 w-3 ml-1" />
                    ) : (
                      <Image className="h-3 w-3 ml-1" />
                    )}
                    {field.type === "static_text" ? "نص ثابت" : "صورة ثابتة"}
                  </Badge>
                  <div>
                    <h4 className="font-medium">{field.label}</h4>
                    <p className="text-sm text-muted-foreground">
                      {field.type === "static_text" 
                        ? `"${field.staticContent?.substring(0, 50)}..."` 
                        : "صورة مرفوعة"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleVisibility(field.id)}
                  >
                    {field.isVisible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {fields.length === 0 && !isAddingField && (
        <div className="text-center py-8 text-muted-foreground">
          <Type className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد حقول ثابتة مضافة حتى الآن</p>
          <p className="text-sm">اضغط على "إضافة حقل ثابت" لبدء إضافة النصوص والصور الثابتة</p>
        </div>
      )}
    </div>
  );
}