import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient-simple";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Loader2,
  Search,
  Image,
  Eye,
  Layers,
  Layout,
  Settings
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Types
type Template = {
  id: number;
  title: string;
  titleAr?: string;
  slug: string;
  categoryId: number;
  imageUrl: string;
  thumbnailUrl?: string;
  displayOrder: number;
  fields: string[];
  defaultValues?: Record<string, any>;
  settings?: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type Category = {
  id: number;
  name: string;
  nameAr?: string;
  slug: string;
  displayOrder: number;
};

export default function AdminTemplatesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState<string>("all");

  // Fetch templates
  const { data: templatesData, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ["/api/templates"],
  });

  // Fetch categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  const templates = templatesData?.templates || [];
  const totalTemplates = templatesData?.total || 0;

  // Filter templates
  const filteredTemplates = templates.filter((template: Template) => {
    // Filter by search query
    const matchesSearch = searchQuery
      ? template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.titleAr && template.titleAr.toLowerCase().includes(searchQuery.toLowerCase())) ||
        template.slug.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // Filter by category
    const matchesCategory = selectedCategory === "all" || 
      categories?.find((cat: Category) => cat.id === template.categoryId)?.slug === selectedCategory;

    // Filter by active status
    const matchesStatus = selectedTab === "all" || 
      (selectedTab === "active" && template.active) || 
      (selectedTab === "inactive" && !template.active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number, active: boolean }) => {
      return await apiRequest(`/api/admin/templates/${id}`, {
        method: 'PUT',
        body: { active }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "تم تحديث حالة القالب بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل تحديث القالب",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/templates/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "تم حذف القالب بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل حذف القالب",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Toggle template active status
  const toggleTemplateStatus = (id: number, currentStatus: boolean) => {
    updateTemplateMutation.mutate({ id, active: !currentStatus });
  };
  
  // Delete template
  const deleteTemplate = (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا القالب؟ لا يمكن التراجع عن هذه العملية.')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  // Get category name by id
  const getCategoryName = (categoryId: number) => {
    const category = categories?.find((cat: Category) => cat.id === categoryId);
    return category ? category.name : "غير معروف";
  };

  if (isTemplatesLoading || isCategoriesLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">القوالب</h1>
            <p className="text-muted-foreground">إدارة قوالب البطاقات والشهادات</p>
          </div>
          <Button asChild>
            <Link href="/admin/templates/new">
              <Plus className="h-4 w-4 ml-2" />
              إضافة قالب
            </Link>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث في القوالب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="جميع الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {categories?.map((category: Category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTab} onValueChange={setSelectedTab}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>القوالب ({filteredTemplates.length})</CardTitle>
            <CardDescription>
              إدارة وتحرير قوالب الشهادات والبطاقات الإلكترونية
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTemplates.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">الصورة</TableHead>
                      <TableHead>اسم القالب</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template: Template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="w-16 h-12 rounded border bg-muted flex items-center justify-center overflow-hidden">
                            {template.thumbnailUrl || template.imageUrl ? (
                              <img 
                                src={template.thumbnailUrl || template.imageUrl} 
                                alt={template.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Image className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{template.title}</div>
                          {template.titleAr && (
                            <div className="text-sm text-muted-foreground">{template.titleAr}</div>
                          )}
                        </TableCell>
                        <TableCell>{getCategoryName(template.categoryId)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={template.active}
                              onCheckedChange={() => toggleTemplateStatus(template.id, template.active)}
                              disabled={updateTemplateMutation.isPending}
                            />
                            <span className={template.active ? "text-green-600" : "text-gray-500"}>
                              {template.active ? "نشط" : "غير نشط"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(template.createdAt).toLocaleDateString('ar-EG')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">فتح القائمة</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/template/${template.slug}`}>
                                  <Eye className="h-4 w-4 ml-2" />
                                  معاينة
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/templates/${template.id}/edit`}>
                                  <Pencil className="h-4 w-4 ml-2" />
                                  تحرير
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/template-editor/${template.id}`}>
                                  <Layout className="h-4 w-4 ml-2" />
                                  محرر التخطيط
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/templates/${template.id}/fields`}>
                                  <Settings className="h-4 w-4 ml-2" />
                                  إدارة الحقول
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteTemplate(template.id)}
                              >
                                <Trash2 className="h-4 w-4 ml-2" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                لا توجد قوالب متطابقة مع معايير البحث
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}