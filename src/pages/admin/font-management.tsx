import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit, Eye, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Font {
  id: number;
  name: string;
  nameAr?: string;
  family: string;
  type: string;
  url: string;
  displayOrder: number;
  active: boolean;
  isRtl?: boolean;
  webfontUrl?: string;
}

export default function FontManagement() {
  const [isAddingFont, setIsAddingFont] = useState(false);
  const [editingFont, setEditingFont] = useState<Font | null>(null);
  const [newFont, setNewFont] = useState({
    name: "",
    nameAr: "",
    family: "",
    type: "google",
    url: "",
    displayOrder: 0,
    active: true,
    isRtl: false,
    webfontUrl: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fonts = [], isLoading } = useQuery({
    queryKey: ["/api/admin/fonts"],
    queryFn: async () => {
      const response = await fetch("/api/admin/fonts");
      if (!response.ok) throw new Error("فشل في جلب الخطوط");
      return response.json();
    }
  });

  const createFontMutation = useMutation({
    mutationFn: async (fontData: any) => {
      const response = await fetch("/api/admin/fonts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fontData)
      });
      if (!response.ok) throw new Error("فشل في إضافة الخط");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fonts"] });
      setIsAddingFont(false);
      setNewFont({
        name: "",
        nameAr: "",
        family: "",
        type: "google",
        url: "",
        displayOrder: 0,
        active: true,
        isRtl: false,
        webfontUrl: ""
      });
      toast({ title: "تم إضافة الخط بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في إضافة الخط", variant: "destructive" });
    }
  });

  const updateFontMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/admin/fonts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("فشل في تحديث الخط");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fonts"] });
      setEditingFont(null);
      toast({ title: "تم تحديث الخط بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في تحديث الخط", variant: "destructive" });
    }
  });

  const deleteFontMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/fonts/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("فشل في حذف الخط");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fonts"] });
      toast({ title: "تم حذف الخط بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف الخط", variant: "destructive" });
    }
  });

  const handleAddFont = () => {
    createFontMutation.mutate(newFont);
  };

  const handleUpdateFont = () => {
    if (editingFont) {
      updateFontMutation.mutate({ id: editingFont.id, data: editingFont });
    }
  };

  const handleDeleteFont = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الخط؟")) {
      deleteFontMutation.mutate(id);
    }
  };

  const FontPreview = ({ font }: { font: Font }) => (
    <div 
      className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
      style={{ fontFamily: font.family }}
    >
      <p className="text-lg mb-2">نموذج للخط</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {font.isRtl ? "مرحبا بكم في موقعنا" : "Welcome to our website"}
      </p>
    </div>
  );

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">إدارة الخطوط</h1>
        <Button onClick={() => setIsAddingFont(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          إضافة خط جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : (
        <div className="grid gap-6">
          {fonts.map((font: Font) => (
            <Card key={font.id} className="transition-shadow hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <CardTitle className="text-lg">{font.name}</CardTitle>
                    {font.nameAr && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{font.nameAr}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={font.active ? "default" : "secondary"}>
                      {font.active ? "نشط" : "غير نشط"}
                    </Badge>
                    <Badge variant="outline">{font.type}</Badge>
                    {font.isRtl && <Badge variant="outline">RTL</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingFont(font)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteFont(font.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      عائلة الخط: {font.family}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      ترتيب العرض: {font.displayOrder}
                    </p>
                    {font.url && (
                      <a 
                        href={font.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        رابط الخط
                      </a>
                    )}
                  </div>
                  <FontPreview font={font} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* إضافة خط جديد */}
      <Dialog open={isAddingFont} onOpenChange={setIsAddingFont}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة خط جديد</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">اسم الخط (بالإنجليزية)</Label>
                <Input
                  id="name"
                  value={newFont.name}
                  onChange={(e) => setNewFont({ ...newFont, name: e.target.value })}
                  placeholder="Cairo"
                />
              </div>
              <div>
                <Label htmlFor="nameAr">اسم الخط (بالعربية)</Label>
                <Input
                  id="nameAr"
                  value={newFont.nameAr}
                  onChange={(e) => setNewFont({ ...newFont, nameAr: e.target.value })}
                  placeholder="القاهرة"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="family">عائلة الخط</Label>
              <Input
                id="family"
                value={newFont.family}
                onChange={(e) => setNewFont({ ...newFont, family: e.target.value })}
                placeholder="Cairo, sans-serif"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">نوع الخط</Label>
                <Select value={newFont.type} onValueChange={(value) => setNewFont({ ...newFont, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google Fonts</SelectItem>
                    <SelectItem value="system">خط النظام</SelectItem>
                    <SelectItem value="custom">خط مخصص</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="displayOrder">ترتيب العرض</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={newFont.displayOrder}
                  onChange={(e) => setNewFont({ ...newFont, displayOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="url">رابط الخط</Label>
              <Input
                id="url"
                value={newFont.url}
                onChange={(e) => setNewFont({ ...newFont, url: e.target.value })}
                placeholder="https://fonts.googleapis.com/css2?family=Cairo"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={newFont.active}
                  onCheckedChange={(checked) => setNewFont({ ...newFont, active: checked })}
                />
                <Label htmlFor="active">نشط</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRtl"
                  checked={newFont.isRtl}
                  onCheckedChange={(checked) => setNewFont({ ...newFont, isRtl: checked })}
                />
                <Label htmlFor="isRtl">يدعم RTL</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddFont} disabled={createFontMutation.isPending}>
                {createFontMutation.isPending ? "جاري الإضافة..." : "إضافة الخط"}
              </Button>
              <Button variant="outline" onClick={() => setIsAddingFont(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* تعديل خط */}
      {editingFont && (
        <Dialog open={!!editingFont} onOpenChange={() => setEditingFont(null)}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل الخط</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">اسم الخط (بالإنجليزية)</Label>
                  <Input
                    id="edit-name"
                    value={editingFont.name}
                    onChange={(e) => setEditingFont({ ...editingFont, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-nameAr">اسم الخط (بالعربية)</Label>
                  <Input
                    id="edit-nameAr"
                    value={editingFont.nameAr || ""}
                    onChange={(e) => setEditingFont({ ...editingFont, nameAr: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-family">عائلة الخط</Label>
                <Input
                  id="edit-family"
                  value={editingFont.family}
                  onChange={(e) => setEditingFont({ ...editingFont, family: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-type">نوع الخط</Label>
                  <Select value={editingFont.type} onValueChange={(value) => setEditingFont({ ...editingFont, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Fonts</SelectItem>
                      <SelectItem value="system">خط النظام</SelectItem>
                      <SelectItem value="custom">خط مخصص</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-displayOrder">ترتيب العرض</Label>
                  <Input
                    id="edit-displayOrder"
                    type="number"
                    value={editingFont.displayOrder}
                    onChange={(e) => setEditingFont({ ...editingFont, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-url">رابط الخط</Label>
                <Input
                  id="edit-url"
                  value={editingFont.url}
                  onChange={(e) => setEditingFont({ ...editingFont, url: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-active"
                    checked={editingFont.active}
                    onCheckedChange={(checked) => setEditingFont({ ...editingFont, active: checked })}
                  />
                  <Label htmlFor="edit-active">نشط</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isRtl"
                    checked={editingFont.isRtl || false}
                    onCheckedChange={(checked) => setEditingFont({ ...editingFont, isRtl: checked })}
                  />
                  <Label htmlFor="edit-isRtl">يدعم RTL</Label>
                </div>
              </div>

              <FontPreview font={editingFont} />

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateFont} disabled={updateFontMutation.isPending}>
                  {updateFontMutation.isPending ? "جاري التحديث..." : "تحديث الخط"}
                </Button>
                <Button variant="outline" onClick={() => setEditingFont(null)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}