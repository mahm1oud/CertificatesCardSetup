import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Upload, Image, Frame, Palette, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ScreenColorPicker from "@/components/screen-color-picker";

interface ContentItem {
  id: number;
  name: string;
  nameAr: string;
  type: string;
  category: string;
  url: string;
  thumbnailUrl: string;
  active: boolean;
  tags?: string[];
}

interface Tag {
  id: number;
  name: string;
  nameAr: string;
  color: string;
  active: boolean;
}

export default function ContentLibrary() {
  const [activeTab, setActiveTab] = useState("library");
  const [selectedType, setSelectedType] = useState("all");
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newContent, setNewContent] = useState({
    name: "",
    nameAr: "",
    type: "background",
    category: "patterns",
    file: null as File | null
  });
  const [newTag, setNewTag] = useState({
    name: "",
    nameAr: "",
    color: "#2563eb"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contentItems = [], isLoading: loadingContent } = useQuery({
    queryKey: ["/api/admin/content-library", selectedType],
    queryFn: async () => {
      const params = selectedType !== "all" ? `?type=${selectedType}` : "";
      const response = await fetch(`/api/admin/content-library${params}`);
      if (!response.ok) throw new Error("فشل في جلب مكتبة المحتوى");
      return response.json();
    }
  });

  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: ["/api/admin/tags"],
    queryFn: async () => {
      const response = await fetch("/api/admin/tags");
      if (!response.ok) throw new Error("فشل في جلب العلامات");
      return response.json();
    }
  });

  const uploadContentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/content-library", {
        method: "POST",
        body: formData
      });
      if (!response.ok) throw new Error("فشل في رفع المحتوى");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-library"] });
      setIsAddingContent(false);
      setNewContent({
        name: "",
        nameAr: "",
        type: "background",
        category: "patterns",
        file: null
      });
      toast({ title: "تم رفع المحتوى بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في رفع المحتوى", variant: "destructive" });
    }
  });

  const createTagMutation = useMutation({
    mutationFn: async (tagData: any) => {
      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tagData)
      });
      if (!response.ok) throw new Error("فشل في إضافة العلامة");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tags"] });
      setIsAddingTag(false);
      setNewTag({
        name: "",
        nameAr: "",
        color: "#2563eb"
      });
      toast({ title: "تم إضافة العلامة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في إضافة العلامة", variant: "destructive" });
    }
  });

  const handleUploadContent = () => {
    if (!newContent.file) {
      toast({ title: "يرجى اختيار ملف", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", newContent.file);
    formData.append("name", newContent.name);
    formData.append("nameAr", newContent.nameAr);
    formData.append("type", newContent.type);
    formData.append("category", newContent.category);

    uploadContentMutation.mutate(formData);
  };

  const handleAddTag = () => {
    createTagMutation.mutate(newTag);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewContent({ ...newContent, file });
    }
  };

  const handleColorSelect = (color: string) => {
    toast({ title: `تم استخراج اللون: ${color}` });
    // يمكن إضافة اللون لمكتبة الألوان أو استخدامه في التطبيق
  };

  const ContentGrid = ({ items }: { items: ContentItem[] }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
          <div className="aspect-square relative">
            <img 
              src={item.thumbnailUrl || item.url} 
              alt={item.nameAr || item.name}
              className="w-full h-full object-cover"
              onClick={() => {
                setSelectedImage(item.url);
                setShowColorPicker(true);
              }}
            />
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                {item.type}
              </Badge>
            </div>
          </div>
          <CardContent className="p-3">
            <h3 className="font-medium text-sm mb-1 truncate">
              {item.nameAr || item.name}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {item.category}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const TagsGrid = ({ tags }: { tags: Tag[] }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {tags.map((tag) => (
        <Card key={tag.id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full border-2 border-gray-300"
              style={{ backgroundColor: tag.color }}
            />
            <div>
              <h3 className="font-medium">{tag.nameAr || tag.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tag.color}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">مكتبة المحتوى</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddingTag(true)} variant="outline">
            <Tag className="w-4 h-4 ml-2" />
            إضافة علامة
          </Button>
          <Button onClick={() => setIsAddingContent(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة محتوى
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library">مكتبة المحتوى</TabsTrigger>
          <TabsTrigger value="tags">العلامات</TabsTrigger>
          <TabsTrigger value="colors">قنطرة الألوان</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-6">
          <div className="mb-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="فلترة حسب النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="background">خلفيات</SelectItem>
                <SelectItem value="frame">إطارات</SelectItem>
                <SelectItem value="icon">أيقونات</SelectItem>
                <SelectItem value="image">صور</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {loadingContent ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : (
            <ContentGrid items={contentItems} />
          )}
        </TabsContent>

        <TabsContent value="tags" className="mt-6">
          {loadingTags ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : (
            <TagsGrid tags={tags} />
          )}
        </TabsContent>

        <TabsContent value="colors" className="mt-6">
          <ScreenColorPicker />
        </TabsContent>
      </Tabs>

      {/* إضافة محتوى جديد */}
      <Dialog open={isAddingContent} onOpenChange={setIsAddingContent}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة محتوى جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="content-name">الاسم (بالإنجليزية)</Label>
              <Input
                id="content-name"
                value={newContent.name}
                onChange={(e) => setNewContent({ ...newContent, name: e.target.value })}
                placeholder="Golden Background"
              />
            </div>
            
            <div>
              <Label htmlFor="content-nameAr">الاسم (بالعربية)</Label>
              <Input
                id="content-nameAr"
                value={newContent.nameAr}
                onChange={(e) => setNewContent({ ...newContent, nameAr: e.target.value })}
                placeholder="خلفية ذهبية"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="content-type">النوع</Label>
                <Select value={newContent.type} onValueChange={(value) => setNewContent({ ...newContent, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="background">خلفية</SelectItem>
                    <SelectItem value="frame">إطار</SelectItem>
                    <SelectItem value="icon">أيقونة</SelectItem>
                    <SelectItem value="image">صورة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="content-category">الفئة</Label>
                <Select value={newContent.category} onValueChange={(value) => setNewContent({ ...newContent, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patterns">أنماط</SelectItem>
                    <SelectItem value="borders">حدود</SelectItem>
                    <SelectItem value="decorative">زخرفية</SelectItem>
                    <SelectItem value="geometric">هندسية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="content-file">الملف</Label>
              <Input
                id="content-file"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleUploadContent} disabled={uploadContentMutation.isPending}>
                {uploadContentMutation.isPending ? "جاري الرفع..." : "رفع المحتوى"}
              </Button>
              <Button variant="outline" onClick={() => setIsAddingContent(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* إضافة علامة جديدة */}
      <Dialog open={isAddingTag} onOpenChange={setIsAddingTag}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة علامة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tag-name">الاسم (بالإنجليزية)</Label>
              <Input
                id="tag-name"
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                placeholder="Modern"
              />
            </div>
            
            <div>
              <Label htmlFor="tag-nameAr">الاسم (بالعربية)</Label>
              <Input
                id="tag-nameAr"
                value={newTag.nameAr}
                onChange={(e) => setNewTag({ ...newTag, nameAr: e.target.value })}
                placeholder="حديث"
              />
            </div>

            <div>
              <Label htmlFor="tag-color">اللون</Label>
              <div className="flex gap-2">
                <Input
                  id="tag-color"
                  type="color"
                  value={newTag.color}
                  onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={newTag.color}
                  onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                  placeholder="#2563eb"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddTag} disabled={createTagMutation.isPending}>
                {createTagMutation.isPending ? "جاري الإضافة..." : "إضافة العلامة"}
              </Button>
              <Button variant="outline" onClick={() => setIsAddingTag(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* أداة استخراج الألوان */}
      <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>استخراج الألوان من الصورة</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <ImageColorPicker 
              imageUrl={selectedImage}
              onColorSelect={handleColorSelect}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}