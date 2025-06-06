import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye, Copy, Settings, Image, FileText, Layers } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface Template {
  id: number;
  title: string;
  titleAr: string | null;
  slug: string;
  categoryId: number;
  imageUrl: string;
  thumbnailUrl: string | null;
  displayOrder: number;
  fields: string[];
  defaultValues: any;
  settings: any;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
}

export default function CertificateTemplates() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // جلب القوالب
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/templates', { type: 'certificate' }],
    queryFn: () => apiRequest(`/api/templates?type=certificate`),
  });

  // جلب التصنيفات
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // إنشاء قالب جديد
  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "تم إنشاء القالب بنجاح",
        description: "تم إضافة قالب الشهادة الجديد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء القالب",
        description: error.message || "حدث خطأ أثناء إنشاء القالب",
        variant: "destructive",
      });
    },
  });

  // تحديث قالب
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/admin/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setEditingTemplate(null);
      toast({
        title: "تم تحديث القالب بنجاح",
        description: "تم حفظ التغييرات على القالب",
      });
    },
  });

  // حذف قالب
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/templates/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "تم حذف القالب",
        description: "تم حذف القالب بنجاح",
      });
    },
  });

  // نسخ قالب
  const duplicateTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/templates/${id}/duplicate`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "تم نسخ القالب",
        description: "تم إنشاء نسخة من القالب بنجاح",
      });
    },
  });

  const templates = templatesData?.templates || [];
  const filteredTemplates = templates.filter((template: Template) => {
    const matchesCategory = selectedCategory === 'all' || template.categoryId === parseInt(selectedCategory);
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.titleAr && template.titleAr.includes(searchTerm));
    return matchesCategory && matchesSearch;
  });

  const handleCreateTemplate = (formData: FormData) => {
    const data = {
      title: formData.get('title'),
      titleAr: formData.get('titleAr'),
      slug: formData.get('slug'),
      categoryId: parseInt(formData.get('categoryId') as string),
      type: 'certificate',
      imageUrl: formData.get('imageUrl'),
      fields: [],
      defaultValues: {},
      settings: {
        orientation: 'landscape',
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        borderStyle: 'none'
      },
      active: true,
    };
    createTemplateMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">إدارة قوالب الشهادات</h1>
          <p className="text-gray-600 mt-1">إدارة وتخصيص قوالب الشهادات الإلكترونية</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              إضافة قالب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إنشاء قالب شهادة جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateTemplate(formData);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">عنوان القالب (انجليزي)</Label>
                  <Input name="title" required />
                </div>
                <div>
                  <Label htmlFor="titleAr">عنوان القالب (عربي)</Label>
                  <Input name="titleAr" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="slug">الرمز المميز</Label>
                <Input name="slug" required placeholder="certificate-template-1" />
              </div>
              
              <div>
                <Label htmlFor="categoryId">التصنيف</Label>
                <Select name="categoryId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="imageUrl">رابط صورة القالب</Label>
                <Input name="imageUrl" type="url" required />
              </div>
              
              <Button type="submit" disabled={createTemplateMutation.isPending}>
                {createTemplateMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء القالب'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* فلاتر البحث */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="البحث في القوالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* قائمة القوالب */}
      {templatesLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template: Template) => (
            <Card key={template.id} className="overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={template.imageUrl}
                  alt={template.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant={template.active ? "default" : "secondary"}>
                    {template.active ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="text-lg">{template.title}</CardTitle>
                {template.titleAr && (
                  <p className="text-sm text-gray-600">{template.titleAr}</p>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-500">
                    {template.category?.name || 'غير محدد'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {template.fields.length} حقل
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/advanced-certificate-editor?templateId=${template.id}`}>
                      <Edit className="w-4 h-4 mr-1" />
                      تحرير
                    </a>
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicateTemplateMutation.mutate(template.id)}
                    disabled={duplicateTemplateMutation.isPending}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    نسخ
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                    disabled={deleteTemplateMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && !templatesLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد قوالب</h3>
            <p className="text-gray-600 mb-4">لم يتم العثور على قوالب تطابق معايير البحث</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              إنشاء قالب جديد
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}