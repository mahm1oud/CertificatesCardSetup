import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Plus, Minus, Loader2, Image as ImageIcon, Upload, Pipette } from "lucide-react";
import { NumericInput } from "@/components/numeric-input";
import { SliderWithInput } from "@/components/slider-with-input";
import { ColorPicker } from "@/components/color-picker";
import { MediaLibraryDialog } from "@/components/media-library";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TextShadow = {
  enabled: boolean;
  color: string;
  blur: number;
};

type TemplateField = {
  id: number;
  templateId: number;
  name: string;
  label: string;
  labelAr?: string;
  type: string;
  imageType?: string;
  required: boolean;
  isStatic?: boolean;
  staticContent?: string;
  defaultValue?: string;
  placeholder?: string;
  placeholderAr?: string;
  options?: string[];
  position?: {
    x: number;
    y: number;
    snapToGrid?: boolean;
  };
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    align?: string;
    verticalPosition?: string;
    textShadow?: TextShadow;
    imageMaxWidth?: number;
    imageMaxHeight?: number;
    imageBorder?: boolean;
    imageRounded?: boolean;
    layer?: number;
    textWidth?: number;
    lineHeight?: number;
    letterSpacing?: number;
    wordWrap?: boolean;
    maxWidth?: number;
  };
  displayOrder: number;
};

export default function FieldFormPage() {
  const { templateId, fieldId } = useParams();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isEditing = !!fieldId;
  const [newOption, setNewOption] = useState("");
  
  // State for field form data
  const [fieldFormData, setFieldFormData] = useState<Partial<TemplateField>>({
    name: "",
    label: "",
    labelAr: "",
    type: "text",
    imageType: "",
    required: false,
    isStatic: false,
    staticContent: "",
    defaultValue: "",
    placeholder: "",
    placeholderAr: "",
    options: [],
    position: {
      x: 50,
      y: 50,
      snapToGrid: false
    },
    style: {
      fontFamily: "Cairo",
      fontSize: 24,
      fontWeight: "normal",
      color: "#000000",
      align: "center",
      verticalPosition: "middle",
      textShadow: {
        enabled: false,
        color: "#ffffff",
        blur: 5
      },
      imageMaxWidth: 25,
      imageMaxHeight: 25,
      imageBorder: false,
      imageRounded: false,
      layer: 1,
      textWidth: 300,
      lineHeight: 1.2,
      letterSpacing: 0,
      wordWrap: true,
      maxWidth: 400
    },
    displayOrder: 0
  });

  // جلب بيانات القالب
  const { data: templateData } = useQuery({
    queryKey: [`/api/templates/${templateId}`],
    enabled: !!templateId
  });

  // جلب جميع حقول القالب
  const { data: templateFields } = useQuery({
    queryKey: [`/api/admin/template-fields/${templateId}`],
    enabled: !!templateId
  });

  // البحث عن الحقل المحدد للتعديل
  const existingField = Array.isArray(templateFields) ? 
    templateFields.find((field: any) => field.id === parseInt(fieldId || "0")) : 
    undefined;
  const isLoadingField = false;

  // تحميل بيانات الحقل عند التعديل
  useEffect(() => {
    if (isEditing && existingField) {
      setFieldFormData(existingField);
    }
  }, [isEditing, existingField]);

  // Mutation for creating a new field
  const createFieldMutation = useMutation({
    mutationFn: (data: any) => {
      const processedData = {
        name: data.name,
        label: data.label,
        labelAr: data.labelAr || null,
        type: data.type || 'text',
        imageType: data.imageType || null,
        required: Boolean(data.required),
        defaultValue: data.defaultValue || null,
        placeholder: data.placeholder || null,
        placeholderAr: data.placeholderAr || null,
        options: data.options || [],
        position: data.position || { x: 50, y: 50, snapToGrid: false },
        style: data.style || {},
        displayOrder: data.displayOrder || 0,
        isStatic: Boolean(data.isStatic),
        staticContent: data.staticContent || null,
        templateId: parseInt(templateId || "0")
      };
      
      return apiRequest('POST', `/api/admin/template-fields`, processedData);
    },
    onSuccess: () => {
      toast({
        title: "تم إضافة الحقل بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/template-fields/${templateId}`] });
      setLocation(`/admin/templates/${templateId}/fields`);
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message || "حدث خطأ أثناء إضافة الحقل",
        variant: "destructive"
      });
    }
  });

  // Mutation for updating an existing field
  const updateFieldMutation = useMutation({
    mutationFn: (data: any) => {
      const processedData = {
        name: data.name,
        label: data.label,
        labelAr: data.labelAr || null,
        type: data.type || 'text',
        imageType: data.imageType || null,
        required: Boolean(data.required),
        defaultValue: data.defaultValue || null,
        placeholder: data.placeholder || null,
        placeholderAr: data.placeholderAr || null,
        options: data.options || [],
        position: data.position || { x: 50, y: 50, snapToGrid: false },
        style: data.style || {},
        displayOrder: data.displayOrder || 0,
        isStatic: Boolean(data.isStatic),
        staticContent: data.staticContent || null
      };
      
      return apiRequest('PUT', `/api/admin/template-fields/${fieldId}`, processedData);
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث الحقل بنجاح"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/template-fields/${templateId}`] });
      setLocation(`/admin/templates/${templateId}/fields`);
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message || "حدث خطأ أثناء تحديث الحقل",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing) {
      updateFieldMutation.mutate(fieldFormData);
    } else {
      createFieldMutation.mutate(fieldFormData);
    }
  };

  const addOption = () => {
    if (newOption.trim()) {
      setFieldFormData({
        ...fieldFormData,
        options: [...(fieldFormData.options || []), newOption.trim()]
      });
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    const newOptions = [...(fieldFormData.options || [])];
    newOptions.splice(index, 1);
    setFieldFormData({
      ...fieldFormData,
      options: newOptions
    });
  };

  if (isEditing && isLoadingField) {
    return (
      <div className="container py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setLocation(`/admin/templates/${templateId}/fields`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'تعديل الحقل' : 'إضافة حقل جديد'}
          </h1>
          <p className="text-muted-foreground">
            {templateData && typeof templateData === 'object' && 'title' in templateData && `قالب: ${(templateData as any).title}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* نموذج الحقل */}
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الحقل</CardTitle>
            <CardDescription>
              قم بملء المعلومات التالية لإنشاء الحقل
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">أساسي</TabsTrigger>
                  <TabsTrigger value="style">التنسيق</TabsTrigger>
                  <TabsTrigger value="position">الموضع</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">اسم الحقل *</Label>
                      <Input
                        id="name"
                        value={fieldFormData.name || ""}
                        onChange={(e) => setFieldFormData({ ...fieldFormData, name: e.target.value })}
                        placeholder="مثال: student_name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="label">العنوان *</Label>
                      <Input
                        id="label"
                        value={fieldFormData.label || ""}
                        onChange={(e) => setFieldFormData({ ...fieldFormData, label: e.target.value })}
                        placeholder="العنوان الظاهر للمستخدم"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="labelAr">العنوان بالعربية</Label>
                      <Input
                        id="labelAr"
                        value={fieldFormData.labelAr || ""}
                        onChange={(e) => setFieldFormData({ ...fieldFormData, labelAr: e.target.value })}
                        placeholder="العنوان باللغة العربية"
                      />
                    </div>

                    <div>
                      <Label htmlFor="type">نوع الحقل *</Label>
                      <Select 
                        value={fieldFormData.type || 'text'}
                        onValueChange={(value) => setFieldFormData({ 
                          ...fieldFormData, 
                          type: value,
                          isStatic: value === 'static'
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الحقل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">نص قصير</SelectItem>
                          <SelectItem value="textarea">نص طويل</SelectItem>
                          <SelectItem value="number">رقم</SelectItem>
                          <SelectItem value="email">بريد إلكتروني</SelectItem>
                          <SelectItem value="date">تاريخ</SelectItem>
                          <SelectItem value="select">قائمة منسدلة</SelectItem>
                          <SelectItem value="radio">خيارات متعددة</SelectItem>
                          <SelectItem value="checkbox">مربع اختيار</SelectItem>
                          <SelectItem value="image">صورة</SelectItem>
                          <SelectItem value="static-image">صورة ثابتة</SelectItem>
                          <SelectItem value="static">نص ثابت</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {fieldFormData.type === 'static' && (
                    <div>
                      <Label htmlFor="staticContent">النص الثابت *</Label>
                      <Input
                        id="staticContent"
                        value={fieldFormData.staticContent || ""}
                        onChange={(e) => setFieldFormData({ 
                          ...fieldFormData, 
                          staticContent: e.target.value,
                          isStatic: true 
                        })}
                        placeholder="أدخل النص الثابت"
                        required={fieldFormData.type === 'static'}
                      />
                    </div>
                  )}

                  {fieldFormData.type === 'static-image' && (
                    <div className="space-y-4">
                      <Label>اختيار الصورة الثابتة *</Label>
                      
                      {/* عرض الصورة المختارة */}
                      {fieldFormData.staticContent && (
                        <div className="relative">
                          <img 
                            src={fieldFormData.staticContent} 
                            alt="الصورة المختارة"
                            className="w-full max-w-xs h-auto border rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setFieldFormData({ 
                              ...fieldFormData, 
                              staticContent: "",
                              isStatic: true 
                            })}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* اختيار الصورة من المكتبة */}
                      <div className="flex gap-2">
                        <MediaLibraryDialog
                          trigger={
                            <Button type="button" variant="outline" className="flex-1">
                              <Upload className="h-4 w-4 mr-2" />
                              اختيار من المكتبة
                            </Button>
                          }
                          title="اختيار صورة ثابتة"
                          onSelect={(url) => setFieldFormData({ 
                            ...fieldFormData, 
                            staticContent: url,
                            isStatic: true 
                          })}
                          selectedUrl={fieldFormData.staticContent}
                        />
                        
                        {/* إدخال رابط مباشر */}
                        <div className="flex-1">
                          <Input
                            value={fieldFormData.staticContent || ""}
                            onChange={(e) => setFieldFormData({ 
                              ...fieldFormData, 
                              staticContent: e.target.value,
                              isStatic: true 
                            })}
                            placeholder="أو أدخل رابط مباشر"
                          />
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        يمكنك اختيار صورة من المكتبة أو إدخال رابط مباشر للصورة
                      </p>
                    </div>
                  )}

                  {fieldFormData.type === 'image' && (
                    <div>
                      <Label htmlFor="imageType">نوع الصورة</Label>
                      <Select 
                        value={fieldFormData.imageType || 'regular'}
                        onValueChange={(value) => setFieldFormData({ ...fieldFormData, imageType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الصورة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">صورة عادية</SelectItem>
                          <SelectItem value="logo">شعار</SelectItem>
                          <SelectItem value="signature">توقيع</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="defaultValue">القيمة الافتراضية</Label>
                      <Input
                        id="defaultValue"
                        value={fieldFormData.defaultValue || ""}
                        onChange={(e) => setFieldFormData({ ...fieldFormData, defaultValue: e.target.value })}
                        placeholder="القيمة الافتراضية للحقل"
                      />
                    </div>

                    <div>
                      <Label htmlFor="placeholder">النص التوضيحي</Label>
                      <Input
                        id="placeholder"
                        value={fieldFormData.placeholder || ""}
                        onChange={(e) => setFieldFormData({ ...fieldFormData, placeholder: e.target.value })}
                        placeholder="النص التوضيحي داخل الحقل"
                      />
                    </div>

                    <div>
                      <Label htmlFor="placeholderAr">النص التوضيحي (عربي)</Label>
                      <Input
                        id="placeholderAr"
                        value={fieldFormData.placeholderAr || ""}
                        onChange={(e) => setFieldFormData({ ...fieldFormData, placeholderAr: e.target.value })}
                        placeholder="النص التوضيحي باللغة العربية"
                      />
                    </div>
                  </div>

                  {(fieldFormData.type === 'select' || fieldFormData.type === 'radio') && (
                    <div>
                      <Label>خيارات الحقل</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex gap-2">
                          <Input
                            value={newOption}
                            onChange={(e) => setNewOption(e.target.value)}
                            placeholder="أدخل خيار جديد"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                          />
                          <Button type="button" onClick={addOption} size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {fieldFormData.options && fieldFormData.options.length > 0 && (
                          <div className="space-y-1">
                            {fieldFormData.options.map((option, index) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                <span className="flex-1">{option}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(index)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="required"
                      checked={fieldFormData.required || false}
                      onCheckedChange={(checked) => setFieldFormData({
                        ...fieldFormData,
                        required: Boolean(checked)
                      })}
                    />
                    <Label htmlFor="required">حقل مطلوب</Label>
                  </div>
                </TabsContent>

                <TabsContent value="style" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>خط النص</Label>
                      <Select 
                        value={fieldFormData.style?.fontFamily || 'Cairo'}
                        onValueChange={(value) => setFieldFormData({
                          ...fieldFormData,
                          style: {
                            ...fieldFormData.style,
                            fontFamily: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cairo">Cairo</SelectItem>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="color">لون النص</Label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            id="color"
                            type="color"
                            value={fieldFormData.style?.color || "#000000"}
                            onChange={(e) => setFieldFormData({
                              ...fieldFormData,
                              style: {
                                ...fieldFormData.style,
                                color: e.target.value
                              }
                            })}
                            className="w-16 h-8"
                          />
                          <Input
                            type="text"
                            value={fieldFormData.style?.color || "#000000"}
                            onChange={(e) => setFieldFormData({
                              ...fieldFormData,
                              style: {
                                ...fieldFormData.style,
                                color: e.target.value
                              }
                            })}
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                        
                        {/* ألوان سريعة من القالب */}
                        <div>
                          <Label className="text-sm text-muted-foreground">ألوان سريعة</Label>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {['#000000', '#ffffff', '#8b5a3c', '#d4af37', '#1a1a1a', '#f5f5f5', '#2c3e50', '#e74c3c'].map((color) => (
                              <button
                                key={color}
                                type="button"
                                className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                                style={{ backgroundColor: color }}
                                onClick={() => setFieldFormData({
                                  ...fieldFormData,
                                  style: {
                                    ...fieldFormData.style,
                                    color: color
                                  }
                                })}
                                title={`استخدام اللون ${color}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fontSizeNumber">حجم الخط (بالأرقام)</Label>
                      <Input
                        id="fontSizeNumber"
                        type="number"
                        value={fieldFormData.style?.fontSize || 24}
                        onChange={(e) => setFieldFormData({
                          ...fieldFormData,
                          style: {
                            ...fieldFormData.style,
                            fontSize: parseInt(e.target.value) || 24
                          }
                        })}
                        min="8"
                        max="72"
                        placeholder="24"
                      />
                    </div>

                    <div>
                      <Label>حجم الخط ({fieldFormData.style?.fontSize || 24}px)</Label>
                      <Slider
                        value={[fieldFormData.style?.fontSize || 24]}
                        onValueChange={(value) => setFieldFormData({
                          ...fieldFormData,
                          style: {
                            ...fieldFormData.style,
                            fontSize: value[0]
                          }
                        })}
                        max={72}
                        min={8}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SliderWithInput
                      label="عرض النص"
                      value={fieldFormData.style?.textWidth || 300}
                      onChange={(value) => setFieldFormData({
                        ...fieldFormData,
                        style: {
                          ...fieldFormData.style,
                          textWidth: value
                        }
                      })}
                      min={100}
                      max={800}
                      step={10}
                      unit="px"
                    />

                    <SliderWithInput
                      label="تباعد الأسطر"
                      value={fieldFormData.style?.lineHeight || 1.2}
                      onChange={(value) => setFieldFormData({
                        ...fieldFormData,
                        style: {
                          ...fieldFormData.style,
                          lineHeight: value
                        }
                      })}
                      min={0.8}
                      max={3}
                      step={0.1}
                    />
                  </div>

                  <SliderWithInput
                    label="تباعد الحروف"
                    value={fieldFormData.style?.letterSpacing || 0}
                    onChange={(value) => setFieldFormData({
                      ...fieldFormData,
                      style: {
                        ...fieldFormData.style,
                        letterSpacing: value
                      }
                    })}
                    min={-2}
                    max={10}
                    step={0.5}
                    unit="px"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="wordWrap"
                        checked={fieldFormData.style?.wordWrap || true}
                        onCheckedChange={(checked) => setFieldFormData({
                          ...fieldFormData,
                          style: {
                            ...fieldFormData.style,
                            wordWrap: checked as boolean
                          }
                        })}
                      />
                      <Label htmlFor="wordWrap">تفعيل التفاف النص التلقائي</Label>
                    </div>

                    <div>
                      <Label>الحد الأقصى للعرض ({fieldFormData.style?.maxWidth || 400}px)</Label>
                      <Slider
                        value={[fieldFormData.style?.maxWidth || 400]}
                        onValueChange={(value) => setFieldFormData({
                          ...fieldFormData,
                          style: {
                            ...fieldFormData.style,
                            maxWidth: value[0]
                          }
                        })}
                        max={1000}
                        min={200}
                        step={20}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>محاذاة النص</Label>
                      <Select 
                        value={fieldFormData.style?.align || 'center'}
                        onValueChange={(value) => setFieldFormData({
                          ...fieldFormData,
                          style: {
                            ...fieldFormData.style,
                            align: value
                          }
                        })}
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

                    <div>
                      <Label>المحاذاة العمودية</Label>
                      <Select 
                        value={fieldFormData.style?.verticalPosition || 'middle'}
                        onValueChange={(value) => setFieldFormData({
                          ...fieldFormData,
                          style: {
                            ...fieldFormData.style,
                            verticalPosition: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">أعلى</SelectItem>
                          <SelectItem value="middle">وسط</SelectItem>
                          <SelectItem value="bottom">أسفل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>وزن الخط</Label>
                    <Select 
                      value={fieldFormData.style?.fontWeight || 'normal'}
                      onValueChange={(value) => setFieldFormData({
                        ...fieldFormData,
                        style: {
                          ...fieldFormData.style,
                          fontWeight: value
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">عادي</SelectItem>
                        <SelectItem value="bold">عريض</SelectItem>
                        <SelectItem value="100">رفيع جداً</SelectItem>
                        <SelectItem value="300">رفيع</SelectItem>
                        <SelectItem value="500">متوسط</SelectItem>
                        <SelectItem value="700">عريض</SelectItem>
                        <SelectItem value="900">عريض جداً</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* إعدادات ظل النص */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="textShadow"
                        checked={fieldFormData.style?.textShadow?.enabled || false}
                        onCheckedChange={(checked) => setFieldFormData({
                          ...fieldFormData,
                          style: {
                            ...fieldFormData.style,
                            textShadow: {
                              ...fieldFormData.style?.textShadow,
                              enabled: Boolean(checked)
                            }
                          }
                        })}
                      />
                      <Label htmlFor="textShadow">تفعيل ظل النص</Label>
                    </div>

                    {fieldFormData.style?.textShadow?.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="shadowColor">لون الظل</Label>
                          <Input
                            id="shadowColor"
                            type="color"
                            value={fieldFormData.style?.textShadow?.color || "#ffffff"}
                            onChange={(e) => setFieldFormData({
                              ...fieldFormData,
                              style: {
                                ...fieldFormData.style,
                                textShadow: {
                                  ...fieldFormData.style?.textShadow,
                                  color: e.target.value
                                }
                              }
                            })}
                          />
                        </div>

                        <div>
                          <Label>ضبابية الظل ({fieldFormData.style?.textShadow?.blur || 5}px)</Label>
                          <Slider
                            value={[fieldFormData.style?.textShadow?.blur || 5]}
                            onValueChange={(value) => setFieldFormData({
                              ...fieldFormData,
                              style: {
                                ...fieldFormData.style,
                                textShadow: {
                                  ...fieldFormData.style?.textShadow,
                                  blur: value[0]
                                }
                              }
                            })}
                            max={20}
                            min={0}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* إعدادات الصور */}
                  {fieldFormData.type === 'image' && (
                    <div className="space-y-3 p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        <Label>إعدادات الصورة</Label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>العرض الأقصى ({fieldFormData.style?.imageMaxWidth || 25}%)</Label>
                          <Slider
                            value={[fieldFormData.style?.imageMaxWidth || 25]}
                            onValueChange={(value) => setFieldFormData({
                              ...fieldFormData,
                              style: {
                                ...fieldFormData.style,
                                imageMaxWidth: value[0]
                              }
                            })}
                            max={100}
                            min={5}
                            step={5}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label>الارتفاع الأقصى ({fieldFormData.style?.imageMaxHeight || 25}%)</Label>
                          <Slider
                            value={[fieldFormData.style?.imageMaxHeight || 25]}
                            onValueChange={(value) => setFieldFormData({
                              ...fieldFormData,
                              style: {
                                ...fieldFormData.style,
                                imageMaxHeight: value[0]
                              }
                            })}
                            max={100}
                            min={5}
                            step={5}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="imageBorder"
                            checked={fieldFormData.style?.imageBorder || false}
                            onCheckedChange={(checked) => setFieldFormData({
                              ...fieldFormData,
                              style: {
                                ...fieldFormData.style,
                                imageBorder: Boolean(checked)
                              }
                            })}
                          />
                          <Label htmlFor="imageBorder">إطار للصورة</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="imageRounded"
                            checked={fieldFormData.style?.imageRounded || false}
                            onCheckedChange={(checked) => setFieldFormData({
                              ...fieldFormData,
                              style: {
                                ...fieldFormData.style,
                                imageRounded: Boolean(checked)
                              }
                            })}
                          />
                          <Label htmlFor="imageRounded">زوايا دائرية</Label>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="position" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SliderWithInput
                      label="الموضع الأفقي"
                      value={fieldFormData.position?.x || 50}
                      onChange={(value) => setFieldFormData({
                        ...fieldFormData,
                        position: {
                          ...fieldFormData.position,
                          x: value,
                          y: fieldFormData.position?.y || 50
                        }
                      })}
                      min={0}
                      max={100}
                      step={1}
                      unit="%"
                    />

                    <SliderWithInput
                      label="الموضع العمودي"
                      value={fieldFormData.position?.y || 50}
                      onChange={(value) => setFieldFormData({
                        ...fieldFormData,
                        position: {
                          ...fieldFormData.position,
                          x: fieldFormData.position?.x || 50,
                          y: value
                        }
                      })}
                      min={0}
                      max={100}
                      step={1}
                      unit="%"
                    />
                  </div>

                  <div>
                    <Label>ترتيب الطبقة ({fieldFormData.style?.layer || 1})</Label>
                    <Slider
                      value={[fieldFormData.style?.layer || 1]}
                      onValueChange={(value) => setFieldFormData({
                        ...fieldFormData,
                        style: {
                          ...fieldFormData.style,
                          layer: value[0]
                        }
                      })}
                      max={10}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>ترتيب العرض ({fieldFormData.displayOrder || 0})</Label>
                    <Input
                      type="number"
                      value={fieldFormData.displayOrder || 0}
                      onChange={(e) => setFieldFormData({
                        ...fieldFormData,
                        displayOrder: parseInt(e.target.value) || 0
                      })}
                      min="0"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="snapToGrid"
                      checked={fieldFormData.position?.snapToGrid || false}
                      onCheckedChange={(checked) => setFieldFormData({
                        ...fieldFormData,
                        position: {
                          ...fieldFormData.position,
                          snapToGrid: Boolean(checked)
                        }
                      })}
                    />
                    <Label htmlFor="snapToGrid">محاذاة للشبكة</Label>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
                >
                  {(createFieldMutation.isPending || updateFieldMutation.isPending) && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? 'تحديث الحقل' : 'إضافة الحقل'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation(`/admin/templates/${templateId}/fields`)}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* معاينة القالب والحقل */}
        <Card>
          <CardHeader>
            <CardTitle>معاينة الحقل</CardTitle>
            <CardDescription>
              معاينة مرئية لموضع الحقل على القالب
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
              {templateData?.imageUrl ? (
                <div className="relative">
                  <img 
                    src={templateData.imageUrl} 
                    alt="معاينة القالب"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                  
                  {/* معاينة موضع الحقل */}
                  <div 
                    className="absolute border-2 border-blue-500 bg-blue-500/20 rounded"
                    style={{
                      left: `${fieldFormData.position?.x || 50}%`,
                      top: `${fieldFormData.position?.y || 50}%`,
                      transform: 'translate(-50%, -50%)',
                      minWidth: '60px',
                      minHeight: '20px',
                      fontSize: `${Math.min((fieldFormData.style?.fontSize || 24) / 2, 14)}px`,
                      fontFamily: fieldFormData.style?.fontFamily || 'Cairo',
                      color: fieldFormData.style?.color || '#000000',
                      fontWeight: fieldFormData.style?.fontWeight || 'normal',
                      textAlign: fieldFormData.style?.align as any || 'center',
                      display: 'flex',
                      alignItems: fieldFormData.style?.verticalPosition === 'top' ? 'flex-start' : 
                                fieldFormData.style?.verticalPosition === 'bottom' ? 'flex-end' : 'center',
                      justifyContent: fieldFormData.style?.align === 'left' ? 'flex-start' : 
                                    fieldFormData.style?.align === 'right' ? 'flex-end' : 'center',
                      padding: '4px 8px',
                      ...(fieldFormData.style?.textShadow?.enabled && {
                        textShadow: `0 0 ${fieldFormData.style?.textShadow?.blur || 5}px ${fieldFormData.style?.textShadow?.color || '#ffffff'}`
                      })
                    }}
                  >
                    <span className="text-xs">
                      {fieldFormData.type === 'static' ? 
                        fieldFormData.staticContent || 'نص ثابت' :
                        fieldFormData.label || 'اسم الحقل'
                      }
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد صورة للقالب</p>
                  </div>
                </div>
              )}
            </div>

            {/* معلومات الموضع */}
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
              <p><strong>الموضع:</strong> X: {fieldFormData.position?.x || 50}%, Y: {fieldFormData.position?.y || 50}%</p>
              <p><strong>الطبقة:</strong> {fieldFormData.style?.layer || 1}</p>
              <p><strong>حجم الخط:</strong> {fieldFormData.style?.fontSize || 24}px</p>
              <p><strong>اللون:</strong> {fieldFormData.style?.color || '#000000'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}