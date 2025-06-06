import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  FileText
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface Template {
  id: number;
  title: string;
  titleAr: string | null;
  fields: string[];
  settings: any;
}

interface Batch {
  id: number;
  name: string;
  templateId: number;
  status: string;
  totalItems: number;
  processedItems: number;
  errorItems: number;
  createdAt: string;
  template?: Template;
}

interface BatchItem {
  id: number;
  batchId: number;
  rowNumber: number;
  recipientName: string;
  recipientEmail: string | null;
  status: string;
  errorMessage: string | null;
  data: any;
}

export default function BulkCertificates() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);

  // جلب القوالب
  const { data: templatesData } = useQuery({
    queryKey: ['/api/templates', { type: 'certificate' }],
    queryFn: () => apiRequest('/api/templates?type=certificate'),
  });

  // جلب مجموعات الإنتاج
  const { data: batches = [], refetch: refetchBatches } = useQuery<Batch[]>({
    queryKey: ['/api/admin/certificate-batches'],
    queryFn: () => apiRequest('/api/admin/certificate-batches'),
  });

  // جلب عناصر المجموعة المحددة
  const { data: batchItems = [] } = useQuery<BatchItem[]>({
    queryKey: ['/api/admin/certificate-batches', selectedBatch, 'items'],
    queryFn: () => apiRequest(`/api/admin/certificate-batches/${selectedBatch}/items`),
    enabled: !!selectedBatch,
  });

  // إنشاء مجموعة جديدة
  const createBatchMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/admin/certificate-batches', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) throw new Error('فشل في إنشاء المجموعة');
      return response.json();
    },
    onSuccess: () => {
      refetchBatches();
      setUploadedFile(null);
      setBatchName('');
      setSelectedTemplate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({
        title: "تم إنشاء المجموعة بنجاح",
        description: "تم تحميل الملف وإنشاء مجموعة الإنتاج",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء المجموعة",
        description: error.message || "حدث خطأ أثناء إنشاء المجموعة",
        variant: "destructive",
      });
    },
  });

  // بدء معالجة المجموعة
  const processBatchMutation = useMutation({
    mutationFn: (batchId: number) => 
      apiRequest(`/api/admin/certificate-batches/${batchId}/process`, {
        method: 'POST',
      }),
    onSuccess: () => {
      refetchBatches();
      toast({
        title: "تم بدء المعالجة",
        description: "بدأت عملية إنتاج الشهادات",
      });
    },
  });

  // إيقاف معالجة المجموعة
  const pauseBatchMutation = useMutation({
    mutationFn: (batchId: number) => 
      apiRequest(`/api/admin/certificate-batches/${batchId}/pause`, {
        method: 'POST',
      }),
    onSuccess: () => {
      refetchBatches();
      toast({
        title: "تم إيقاف المعالجة",
        description: "تم إيقاف عملية إنتاج الشهادات مؤقتاً",
      });
    },
  });

  // تنزيل النتائج
  const downloadResultsMutation = useMutation({
    mutationFn: async (batchId: number) => {
      const response = await fetch(`/api/admin/certificate-batches/${batchId}/download`);
      if (!response.ok) throw new Error('فشل في تنزيل النتائج');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificates-batch-${batchId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "تم التنزيل بنجاح",
        description: "تم تنزيل ملف الشهادات المضغوط",
      });
    },
  });

  const templates = templatesData?.templates || [];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (allowedTypes.includes(file.type)) {
        setUploadedFile(file);
      } else {
        toast({
          title: "نوع ملف غير مدعوم",
          description: "يرجى اختيار ملف Excel (.xlsx, .xls) أو CSV",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateBatch = () => {
    if (!uploadedFile || !selectedTemplate || !batchName.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('templateId', selectedTemplate);
    formData.append('name', batchName.trim());

    createBatchMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'draft': { variant: 'secondary', text: 'مسودة' },
      'processing': { variant: 'default', text: 'جاري المعالجة' },
      'paused': { variant: 'outline', text: 'متوقف' },
      'completed': { variant: 'default', text: 'مكتمل' },
      'failed': { variant: 'destructive', text: 'فشل' },
    };
    
    const config = variants[status] || { variant: 'secondary', text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getItemStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">الإنتاج المجمع للشهادات</h1>
        <p className="text-gray-600 mt-1">إنتاج شهادات متعددة من ملفات Excel أو CSV</p>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">إنشاء مجموعة جديدة</TabsTrigger>
          <TabsTrigger value="manage">إدارة المجموعات</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>إنشاء مجموعة إنتاج جديدة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="batch-name">اسم المجموعة</Label>
                <Input
                  id="batch-name"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="مثال: شهادات دورة البرمجة - دفعة يناير 2025"
                />
              </div>

              <div>
                <Label htmlFor="template-select">قالب الشهادة</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر قالب الشهادة" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template: Template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.title} {template.titleAr && `(${template.titleAr})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="file-upload">ملف البيانات (Excel أو CSV)</Label>
                <div className="mt-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadedFile ? uploadedFile.name : 'اختر ملف'}
                  </Button>
                </div>
                {uploadedFile && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <FileSpreadsheet className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800">
                        تم اختيار: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Alert>
                <FileText className="w-4 h-4" />
                <AlertDescription>
                  يجب أن يحتوي الملف على أعمدة: اسم المستلم، البريد الإلكتروني (اختياري)، 
                  وأي حقول أخرى مطلوبة في القالب المحدد.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleCreateBatch}
                disabled={createBatchMutation.isPending || !uploadedFile || !selectedTemplate || !batchName.trim()}
                className="w-full"
              >
                {createBatchMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المجموعة'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <div className="space-y-6">
            {batches.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا توجد مجموعات</h3>
                  <p className="text-gray-600">لم يتم إنشاء أي مجموعات إنتاج بعد</p>
                </CardContent>
              </Card>
            ) : (
              batches.map((batch) => (
                <Card key={batch.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{batch.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          القالب: {batch.template?.title || 'غير محدد'}
                        </p>
                        <p className="text-sm text-gray-500">
                          تم الإنشاء: {new Date(batch.createdAt).toLocaleDateString('ar')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(batch.status)}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{batch.totalItems}</div>
                        <div className="text-sm text-blue-800">إجمالي العناصر</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{batch.processedItems}</div>
                        <div className="text-sm text-green-800">تم الانتهاء</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{batch.errorItems}</div>
                        <div className="text-sm text-red-800">أخطاء</div>
                      </div>
                    </div>

                    {batch.totalItems > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">التقدم</span>
                          <span className="text-sm text-gray-600">
                            {Math.round((batch.processedItems / batch.totalItems) * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={(batch.processedItems / batch.totalItems) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {batch.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => processBatchMutation.mutate(batch.id)}
                          disabled={processBatchMutation.isPending}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          بدء المعالجة
                        </Button>
                      )}
                      
                      {batch.status === 'processing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pauseBatchMutation.mutate(batch.id)}
                          disabled={pauseBatchMutation.isPending}
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          إيقاف مؤقت
                        </Button>
                      )}

                      {batch.status === 'paused' && (
                        <Button
                          size="sm"
                          onClick={() => processBatchMutation.mutate(batch.id)}
                          disabled={processBatchMutation.isPending}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          استكمال
                        </Button>
                      )}

                      {(batch.status === 'completed' || batch.processedItems > 0) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadResultsMutation.mutate(batch.id)}
                          disabled={downloadResultsMutation.isPending}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          تنزيل النتائج
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedBatch(selectedBatch === batch.id ? null : batch.id)}
                      >
                        {selectedBatch === batch.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                      </Button>
                    </div>

                    {selectedBatch === batch.id && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-medium mb-3">تفاصيل العناصر</h4>
                        <div className="max-h-64 overflow-y-auto">
                          <div className="space-y-2">
                            {batchItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                  {getItemStatusIcon(item.status)}
                                  <span className="font-medium">{item.recipientName}</span>
                                  {item.recipientEmail && (
                                    <span className="text-sm text-gray-600">({item.recipientEmail})</span>
                                  )}
                                </div>
                                <div className="text-sm">
                                  {item.status === 'failed' && item.errorMessage && (
                                    <span className="text-red-600">{item.errorMessage}</span>
                                  )}
                                  {item.status === 'completed' && (
                                    <span className="text-green-600">مكتملة</span>
                                  )}
                                  {item.status === 'pending' && (
                                    <span className="text-gray-600">في الانتظار</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}