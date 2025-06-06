import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/components/theme-provider';
import { 
  Palette, 
  Monitor, 
  Moon, 
  Sun, 
  Sparkles, 
  Zap,
  Eye,
  CheckCircle
} from 'lucide-react';

type ThemeType = 'default' | 'colorful' | 'vibrant';

export function ThemeSettings() {
  const { theme, darkMode, setTheme, setDarkMode } = useTheme();
  const [previewTheme, setPreviewTheme] = useState<ThemeType>(theme);

  const themes = [
    {
      id: 'default' as const,
      name: 'كلاسيكي نظيف',
      nameEn: 'Clean Classic',
      description: 'تصميم أبيض نظيف وبسيط مناسب لجميع الاستخدامات',
      preview: 'bg-white border-gray-200',
      colors: ['#ffffff', '#f8f9fa', '#6c757d', '#495057']
    },
    {
      id: 'colorful' as const,
      name: 'ملون حديث',
      nameEn: 'Modern Colorful',
      description: 'تصميم ملون متطور مع تدرجات جميلة وتأثيرات بصرية',
      preview: 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white',
      colors: ['#a855f7', '#22d3ee', '#f59e0b', '#ef4444']
    },
    {
      id: 'vibrant' as const,
      name: 'حيوي متدرج',
      nameEn: 'Vibrant Gradient', 
      description: 'خلفية متدرجة حيوية مع بطاقات شفافة وتأثيرات زجاجية',
      preview: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
      colors: ['#3b82f6', '#8b5cf6', '#ffffff', 'rgba(255,255,255,0.9)']
    }
  ];

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    setPreviewTheme(newTheme);
  };

  const handlePreview = (themeId: ThemeType) => {
    setPreviewTheme(themeId);
    // Apply preview temporarily
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    if (themeId !== 'default') {
      root.setAttribute('data-theme', themeId);
    }
  };

  const resetPreview = () => {
    setPreviewTheme(theme);
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    if (theme !== 'default') {
      root.setAttribute('data-theme', theme);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8 text-primary" />
            إعدادات المظهر والثيمات
          </h1>
          <p className="text-muted-foreground mt-1">
            اختر المظهر المناسب لموقعك وخصص الألوان والتصميم
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Theme Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                اختيار الثيم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {themes.map((themeOption) => (
                <div
                  key={themeOption.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    theme === themeOption.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleThemeChange(themeOption.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Theme Preview */}
                    <div className={`w-16 h-12 rounded-md ${themeOption.preview} flex items-center justify-center relative overflow-hidden`}>
                      {themeOption.id === 'colorful' && (
                        <Sparkles className="h-6 w-6 text-white" />
                      )}
                      {themeOption.id === 'vibrant' && (
                        <Zap className="h-6 w-6 text-white" />
                      )}
                      {themeOption.id === 'default' && (
                        <Monitor className="h-6 w-6 text-gray-600" />
                      )}
                    </div>

                    {/* Theme Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{themeOption.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {themeOption.nameEn}
                        </Badge>
                        {theme === themeOption.id && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {themeOption.description}
                      </p>
                      
                      {/* Color Palette */}
                      <div className="flex gap-1">
                        {themeOption.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Preview Button */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(themeOption.id);
                        }}
                        className="text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        معاينة
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Dark Mode Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {darkMode === 'dark' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                إعدادات الوضع المظلم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dark-mode" className="text-base font-medium">
                    الوضع المظلم
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    تفعيل الوضع المظلم للحصول على راحة أكبر للعين
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode === 'dark'}
                  onCheckedChange={(checked) => setDarkMode(checked ? 'dark' : 'light')}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                معاينة مباشرة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                الثيم المختار حالياً: <strong>{themes.find(t => t.id === theme)?.name}</strong>
              </div>
              
              {/* Preview Card */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold mb-2">عينة من التصميم</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  هذا مثال على كيف سيبدو التصميم مع الثيم المختار
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="default">زر أساسي</Button>
                  <Button size="sm" variant="outline">زر ثانوي</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetPreview}
                  className="w-full"
                >
                  إعادة تعيين المعاينة
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  التغييرات سيتم حفظها تلقائياً
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ThemeSettings;