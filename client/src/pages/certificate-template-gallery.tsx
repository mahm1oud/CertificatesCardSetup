import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OptimizedImage, useThumbnailUrl } from '@/components/optimized-image';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Users, 
  Eye,
  Download,
  Palette,
  Award,
  GraduationCap,
  Trophy,
  FileCheck,
  FileText,
  Crown
} from 'lucide-react';
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
  category?: {
    id: number;
    name: string;
    icon: string;
  };
  stats?: {
    views: number;
    downloads: number;
    rating: number;
  };
}

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  count: number;
}

// قوالب شهادات مميزة مع تصاميم متنوعة
const featuredTemplates = [
  {
    id: 'modern-achievement',
    title: 'شهادة إنجاز عصرية',
    titleAr: 'شهادة إنجاز عصرية',
    description: 'تصميم عصري وأنيق مع ألوان متدرجة',
    category: 'إنجازات',
    imageUrl: '/templates/modern-achievement.jpg',
    features: ['تصميم عصري', 'ألوان متدرجة', 'خطوط عربية أنيقة'],
    colors: ['#667eea', '#764ba2'],
    type: 'achievement'
  },
  {
    id: 'elegant-completion',
    title: 'شهادة إتمام راقية',
    titleAr: 'شهادة إتمام راقية', 
    description: 'تصميم راقي مع إطار ذهبي كلاسيكي',
    category: 'دورات تدريبية',
    imageUrl: '/templates/elegant-completion.jpg',
    features: ['إطار ذهبي', 'تصميم كلاسيكي', 'رموز شرف'],
    colors: ['#f4d03f', '#8b7355'],
    type: 'completion'
  },
  {
    id: 'creative-excellence',
    title: 'شهادة تميز إبداعية',
    titleAr: 'شهادة تميز إبداعية',
    description: 'تصميم إبداعي مع عناصر جرافيكية مميزة',
    category: 'تميز',
    imageUrl: '/templates/creative-excellence.jpg',
    features: ['عناصر إبداعية', 'ألوان زاهية', 'تأثيرات بصرية'],
    colors: ['#ff6b6b', '#4ecdc4'],
    type: 'excellence'
  },
  {
    id: 'professional-certification',
    title: 'شهادة مهنية',
    titleAr: 'شهادة مهنية معتمدة',
    description: 'تصميم مهني للشركات والمؤسسات',
    category: 'مهنية',
    imageUrl: '/templates/professional-cert.jpg',
    features: ['تصميم مؤسسي', 'ألوان محافظة', 'خانات للشعارات'],
    colors: ['#2c3e50', '#34495e'],
    type: 'professional'
  },
  {
    id: 'graduation-diploma',
    title: 'شهادة تخرج',
    titleAr: 'شهادة تخرج أكاديمية',
    description: 'تصميم أكاديمي كلاسيكي للتخرج',
    category: 'أكاديمية',
    imageUrl: '/templates/graduation-diploma.jpg',
    features: ['طابع أكاديمي', 'رموز تعليمية', 'إطار رسمي'],
    colors: ['#8e44ad', '#3498db'],
    type: 'graduation'
  },
  {
    id: 'participation-award',
    title: 'شهادة مشاركة',
    titleAr: 'شهادة مشاركة وتقدير',
    description: 'تصميم بسيط ومشجع للمشاركة',
    category: 'مشاركة',
    imageUrl: '/templates/participation-award.jpg',
    features: ['تصميم مشجع', 'ألوان دافئة', 'رموز إيجابية'],
    colors: ['#e74c3c', '#f39c12'],
    type: 'participation'
  }
];

export default function CertificateTemplateGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // جلب القوالب
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['/api/templates', { type: 'certificate' }],
    queryFn: () => apiRequest('/api/templates?type=certificate'),
  });

  // جلب التصنيفات
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const templates = templatesData?.templates || [];
  
  // فلترة وترتيب القوالب
  const filteredTemplates = templates.filter((template: Template) => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.titleAr && template.titleAr.includes(searchTerm));
    const matchesCategory = selectedCategory === 'all' || template.categoryId === parseInt(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (categoryName: string) => {
    const icons: Record<string, any> = {
      'إنجازات': Award,
      'دورات تدريبية': GraduationCap,
      'تميز': Trophy,
      'مهنية': FileCheck,
      'أكاديمية': FileText,
      'مشاركة': Star
    };
    return icons[categoryName] || FileCheck;
  };

  const getTemplateIcon = (type: string) => {
    const icons: Record<string, any> = {
      'achievement': Award,
      'completion': GraduationCap,
      'excellence': Trophy,
      'professional': FileCheck,
      'graduation': Crown,
      'participation': Star
    };
    return icons[type] || FileCheck;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-4">معرض قوالب الشهادات</h1>
        <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto">
          اختر من مجموعة واسعة من قوالب الشهادات المصممة بعناية لتناسب جميع احتياجاتك
        </p>
      </div>

      {/* شريط البحث والفلاتر */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="ابحث في القوالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="جميع التصنيفات" />
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

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">الأكثر شيوعاً</SelectItem>
                <SelectItem value="recent">الأحدث</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
                <SelectItem value="rating">التقييم</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="featured" className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="featured">القوالب المميزة</TabsTrigger>
          <TabsTrigger value="all">جميع القوالب</TabsTrigger>
          <TabsTrigger value="categories">حسب التصنيف</TabsTrigger>
        </TabsList>

        <TabsContent value="featured" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTemplates.map((template) => {
              const IconComponent = getTemplateIcon(template.type);
              return (
                <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br relative" 
                       style={{ 
                         background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})` 
                       }}>
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                      <IconComponent className="w-16 h-16 text-white opacity-80" />
                    </div>
                    <Badge className="absolute top-2 right-2 bg-white text-gray-800">
                      {template.category}
                    </Badge>
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <Eye className="w-4 h-4 mr-1" />
                        معاينة
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-1" />
                        استخدام
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="all">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>جاري تحميل القوالب...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template: Template) => (
                <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gray-100 relative">
                    <OptimizedImage
                      src={template.imageUrl}
                      alt={template.title}
                      thumbnailSrc={useThumbnailUrl(template.imageUrl, 'gallery')}
                      className="w-full h-full object-cover"
                      priority={false}
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Badge variant="default">
                        {template.category?.name || 'عام'}
                      </Badge>
                      {template.active && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          نشط
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1">{template.title}</CardTitle>
                    {template.titleAr && (
                      <p className="text-sm text-gray-600 line-clamp-1">{template.titleAr}</p>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {template.stats?.downloads || 0}
                      </span>
                      <span className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {template.stats?.views || 0}
                      </span>
                      <span className="flex items-center">
                        <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                        {template.stats?.rating || 4.5}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        معاينة
                      </Button>
                      <Button size="sm" className="flex-1" asChild>
                        <a href={`/advanced-certificate-editor?templateId=${template.id}`}>
                          استخدام
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredTemplates.length === 0 && !isLoading && (
            <Card className="text-center py-12">
              <CardContent>
                <FileCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد قوالب</h3>
                <p className="text-gray-600">لم يتم العثور على قوالب تطابق معايير البحث</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const IconComponent = getCategoryIcon(category.name);
              const categoryTemplates = templates.filter((t: Template) => t.categoryId === category.id);
              
              return (
                <Card key={category.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <IconComponent className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle>{category.name}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {categoryTemplates.length} قالب متاح
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setSelectedCategory(category.id.toString())}
                    >
                      استعراض القوالب
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* قسم الإحصائيات */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-center">إحصائيات المعرض</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">{templates.length + featuredTemplates.length}</div>
              <div className="text-sm text-gray-600">إجمالي القوالب</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{categories.length}</div>
              <div className="text-sm text-gray-600">التصنيفات</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">12k+</div>
              <div className="text-sm text-gray-600">مرات التحميل</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">4.8</div>
              <div className="text-sm text-gray-600">متوسط التقييم</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}