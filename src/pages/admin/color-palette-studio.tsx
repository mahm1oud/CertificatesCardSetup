import React, { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Palette, Download, Save, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ColorPaletteGenerator from '@/components/color-palette-generator';
import ColorThemePreview from '@/components/color-theme-preview';
import { useToast } from '@/hooks/use-toast';

interface ColorTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  palette: any;
}

const ColorPaletteStudio: React.FC = () => {
  const [activeThemes, setActiveThemes] = useState<ColorTheme[]>([]);
  const { toast } = useToast();

  const handleThemeCreate = (theme: ColorTheme) => {
    setActiveThemes(prev => [theme, ...prev]);
    toast({
      title: 'تم إنشاء السمة',
      description: `تم إنشاء سمة "${theme.name}" بنجاح`
    });
  };

  const handlePaletteSelect = (palette: any) => {
    console.log('Selected palette:', palette);
    toast({
      title: 'تم اختيار اللوحة',
      description: 'يمكنك الآن استخدام هذه اللوحة في مشاريعك'
    });
  };

  const exportTheme = (theme: ColorTheme) => {
    const exportData = {
      name: theme.name,
      colors: theme.colors,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${theme.name.replace(/\s+/g, '-')}-theme.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'تم التصدير',
      description: 'تم تصدير السمة كملف JSON'
    });
  };

  const copyThemeCSS = (theme: ColorTheme) => {
    const cssVariables = `
:root {
  --color-primary: ${theme.colors.primary};
  --color-secondary: ${theme.colors.secondary};
  --color-accent: ${theme.colors.accent};
  --color-background: ${theme.colors.background};
  --color-text: ${theme.colors.text};
}

/* Tailwind CSS Custom Colors */
@layer base {
  .bg-theme-primary { background-color: var(--color-primary); }
  .bg-theme-secondary { background-color: var(--color-secondary); }
  .bg-theme-accent { background-color: var(--color-accent); }
  .bg-theme-background { background-color: var(--color-background); }
  
  .text-theme-primary { color: var(--color-primary); }
  .text-theme-secondary { color: var(--color-secondary); }
  .text-theme-accent { color: var(--color-accent); }
  .text-theme-text { color: var(--color-text); }
  
  .border-theme-primary { border-color: var(--color-primary); }
  .border-theme-secondary { border-color: var(--color-secondary); }
  .border-theme-accent { border-color: var(--color-accent); }
}
    `.trim();

    navigator.clipboard.writeText(cssVariables);
    toast({
      title: 'تم النسخ',
      description: 'تم نسخ كود CSS للسمة'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin/content-library">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                العودة
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Palette className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">استوديو لوحات الألوان</h1>
            </div>
          </div>
          <p className="text-muted-foreground">
            أنشئ وادر لوحات ألوان متناسقة وسمات تصميم متكاملة لمشاريعك
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Color Palette Generator */}
          <div className="lg:col-span-2">
            <ColorPaletteGenerator
              onPaletteSelect={handlePaletteSelect}
              onThemeCreate={handleThemeCreate}
            />
          </div>

          {/* Active Themes Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">السمات النشطة</CardTitle>
                <CardDescription>
                  السمات التي تم إنشاؤها في هذه الجلسة
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeThemes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لم يتم إنشاء أي سمات بعد
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeThemes.map((theme, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{theme.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              سمة
                            </Badge>
                          </div>
                          
                          {/* Color Preview */}
                          <div className="grid grid-cols-5 gap-1">
                            <div
                              className="h-8 rounded"
                              style={{ backgroundColor: theme.colors.primary }}
                              title="أساسي"
                            />
                            <div
                              className="h-8 rounded"
                              style={{ backgroundColor: theme.colors.secondary }}
                              title="ثانوي"
                            />
                            <div
                              className="h-8 rounded"
                              style={{ backgroundColor: theme.colors.accent }}
                              title="تمييز"
                            />
                            <div
                              className="h-8 rounded border"
                              style={{ backgroundColor: theme.colors.background }}
                              title="خلفية"
                            />
                            <div
                              className="h-8 rounded border"
                              style={{ backgroundColor: theme.colors.text }}
                              title="نص"
                            />
                          </div>
                          
                          {/* Theme Preview */}
                          <div className="mt-3">
                            <ColorThemePreview theme={theme} />
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyThemeCSS(theme)}
                              className="flex-1"
                            >
                              <Share className="w-3 h-3 mr-1" />
                              CSS
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportTheme(theme)}
                              className="flex-1"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              تصدير
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">نصائح سريعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong>الألوان المتجاورة:</strong> تخلق شعوراً بالانسجام والراحة البصرية
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong>الألوان المكملة:</strong> تخلق تباينات قوية وجذابة
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong>الألوان الثلاثية:</strong> متوازنة وديناميكية للتصاميم الحيوية
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong>نصيحة:</strong> اختبر السمات على خلفيات مختلفة قبل التطبيق
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPaletteStudio;