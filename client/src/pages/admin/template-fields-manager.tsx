import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import StaticFieldManager from "@/components/static-field-manager";
import AdminLayout from "@/components/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Settings, Type, Image, Eye, EyeOff } from "lucide-react";

interface TemplateField {
  id: number;
  name: string;
  label: string;
  labelAr: string;
  type: string;
  required: boolean;
  isStatic: boolean;
  staticContent: string;
  position: { x: number; y: number; width: number; height: number };
  style: any;
  displayOrder: number;
}

export default function TemplateFieldsManager() {
  const { templateId } = useParams();
  const { toast } = useToast();
  const [staticFields, setStaticFields] = useState<TemplateField[]>([]);

  // Fetch template details
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: [`/api/admin/templates/${templateId}`],
    enabled: !!templateId,
  });

  // Fetch all template fields
  const { data: allFields, isLoading: fieldsLoading } = useQuery({
    queryKey: [`/api/admin/templates/${templateId}/fields`],
    enabled: !!templateId,
  });

  // Fetch static fields specifically
  const { data: staticFieldsData, refetch: refetchStaticFields } = useQuery({
    queryKey: [`/api/admin/templates/${templateId}/static-fields`],
    enabled: !!templateId,
  });

  // Update static fields state when data changes
  useEffect(() => {
    if (staticFieldsData) {
      setStaticFields(staticFieldsData);
    }
  }, [staticFieldsData]);

  // Save static fields mutation
  const saveStaticFields = useMutation({
    mutationFn: async (fields: TemplateField[]) => {
      // Handle creation and updates
      const promises = fields.map(field => {
        if (field.id && field.id > 0) {
          // Update existing field
          return apiRequest("PUT", `/api/admin/templates/${templateId}/static-fields/${field.id}`, field);
        } else {
          // Create new field
          return apiRequest("POST", `/api/admin/templates/${templateId}/static-fields`, field);
        }
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/templates/${templateId}/static-fields`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/templates/${templateId}/fields`] });
      toast({
        title: "تم حفظ الحقول الثابتة",
        description: "تم حفظ جميع التغييرات بنجاح",
      });
      refetchStaticFields();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في حفظ الحقول",
        description: error.message || "حدث خطأ أثناء حفظ الحقول الثابتة",
        variant: "destructive",
      });
    },
  });

  const handleStaticFieldsChange = (fields: TemplateField[]) => {
    setStaticFields(fields);
  };

  const handleSaveFields = () => {
    saveStaticFields.mutate(staticFields);
  };

  if (templateLoading || fieldsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">جاري تحميل بيانات القالب...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!template) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-destructive">القالب غير موجود</h2>
          <p className="text-muted-foreground mt-2">لم يتم العثور على القالب المطلوب</p>
        </div>
      </AdminLayout>
    );
  }

  const regularFields = allFields?.filter((field: TemplateField) => !field.isStatic) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
            <div>
              <h1 className="text-2xl font-bold">إدارة حقول القالب</h1>
              <p className="text-muted-foreground">{template.title}</p>
            </div>
          </div>
          <Button onClick={handleSaveFields} disabled={saveStaticFields.isPending}>
            {saveStaticFields.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>

        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              معلومات القالب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">العنوان</p>
                <p className="font-medium">{template.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">الفئة</p>
                <p className="font-medium">{template.categoryId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">الحالة</p>
                <Badge variant={template.active ? "default" : "secondary"}>
                  {template.active ? "نشط" : "غير نشط"}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الحقول</p>
                <p className="font-medium">{(allFields?.length || 0)} حقل</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fields Management Tabs */}
        <Tabs defaultValue="static-fields" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="static-fields" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              الحقول الثابتة
              <Badge variant="secondary">{staticFields.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="regular-fields" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              الحقول العادية
              <Badge variant="secondary">{regularFields.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="static-fields" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  إدارة الحقول الثابتة
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  الحقول الثابتة هي نصوص وصور لا يمكن للمستخدمين تحريرها، ويتم عرضها بشكل ثابت في القالب
                </p>
              </CardHeader>
              <CardContent>
                <StaticFieldManager
                  templateId={parseInt(templateId!)}
                  fields={staticFields}
                  onFieldsChange={handleStaticFieldsChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regular-fields" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  الحقول العادية
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  الحقول التي يمكن للمستخدمين تحريرها وتخصيصها
                </p>
              </CardHeader>
              <CardContent>
                {regularFields.length > 0 ? (
                  <div className="space-y-4">
                    {regularFields.map((field: TemplateField) => (
                      <Card key={field.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant={field.type === "text" ? "default" : "secondary"}>
                                {field.type === "text" ? (
                                  <Type className="h-3 w-3 ml-1" />
                                ) : (
                                  <Image className="h-3 w-3 ml-1" />
                                )}
                                {field.type}
                              </Badge>
                              <div>
                                <h4 className="font-medium">{field.label}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {field.name} • {field.required ? "مطلوب" : "اختياري"}
                                </p>
                              </div>
                            </div>
                            <Badge variant={field.required ? "destructive" : "outline"}>
                              {field.required ? "مطلوب" : "اختياري"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد حقول عادية في هذا القالب</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}