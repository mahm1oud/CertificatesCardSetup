import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Image, Check, X, Search } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"

interface MediaFile {
  id: number;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  userId: number;
}

interface MediaLibraryProps {
  onSelect: (url: string) => void;
  selectedUrl?: string;
  allowUpload?: boolean;
}

export function MediaLibrary({ onSelect, selectedUrl, allowUpload = true }: MediaLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const queryClient = useQueryClient();

  // جلب الصور المرفوعة
  const { data: mediaFiles = [], isLoading } = useQuery({
    queryKey: ['/api/media'],
    enabled: true
  });

  // رفع ملف جديد
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('فشل في رفع الملف');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/media'] });
      setUploadingFiles([]);
    }
  });

  // حذف ملف
  const deleteMutation = useMutation({
    mutationFn: async (mediaId: number) => {
      return apiRequest(`/api/media/${mediaId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/media'] });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadingFiles(files);
  };

  const handleUpload = async () => {
    for (const file of uploadingFiles) {
      await uploadMutation.mutateAsync(file);
    }
  };

  const filteredMedia = (mediaFiles?.files || []).filter((file: MediaFile) =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="library">مكتبة الصور</TabsTrigger>
          {allowUpload && <TabsTrigger value="upload">رفع صور جديدة</TabsTrigger>}
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          {/* شريط البحث */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الصور..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* عرض الصور */}
          <ScrollArea className="h-96 w-full border rounded-lg p-4">
            {isLoading ? (
              <div className="text-center py-8">جار تحميل الصور...</div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'لا توجد صور تطابق البحث' : 'لا توجد صور مرفوعة بعد'}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredMedia.map((file: MediaFile) => (
                  <div
                    key={file.id}
                    className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedUrl === file.url
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => onSelect(file.url)}
                  >
                    <div className="aspect-square">
                      {file.mimeType.startsWith('image/') ? (
                        <img
                          src={file.thumbnailUrl || file.url}
                          alt={file.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <Image className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {selectedUrl === file.url && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    {/* معلومات الملف عند التمرير */}
                    <div className="absolute inset-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end">
                      <p className="text-xs font-medium truncate">{file.originalName}</p>
                      <p className="text-xs text-gray-300">{formatFileSize(file.size)}</p>
                      <div className="flex gap-1 mt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(file.url);
                          }}
                        >
                          اختيار
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(file.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {allowUpload && (
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="fileUpload">اختر الصور لرفعها</Label>
                <Input
                  id="fileUpload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="mt-2"
                />
              </div>

              {uploadingFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>الملفات المحددة:</Label>
                  {uploadingFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadMutation.isPending ? 'جار الرفع...' : 'رفع الملفات'}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

interface MediaLibraryDialogProps extends MediaLibraryProps {
  trigger: React.ReactNode;
  title?: string;
}

export function MediaLibraryDialog({ 
  trigger, 
  title = "اختيار صورة", 
  onSelect, 
  selectedUrl, 
  allowUpload = true 
}: MediaLibraryDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (url: string) => {
    onSelect(url);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <MediaLibrary
          onSelect={handleSelect}
          selectedUrl={selectedUrl}
          allowUpload={allowUpload}
        />
      </DialogContent>
    </Dialog>
  );
}