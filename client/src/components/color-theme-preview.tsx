import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ColorTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

interface ColorThemePreviewProps {
  theme: ColorTheme;
  className?: string;
}

export const ColorThemePreview: React.FC<ColorThemePreviewProps> = ({ theme, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Card Preview */}
      <Card 
        className="transition-all duration-300 hover:shadow-lg border-2"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.primary,
          color: theme.colors.text 
        }}
      >
        <CardHeader style={{ backgroundColor: theme.colors.primary }}>
          <CardTitle className="text-white">
            معاينة البطاقة
          </CardTitle>
          <CardDescription className="text-white/80">
            هذا نموذج لعرض السمة على بطاقة
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span>العنصر الأساسي</span>
            <Badge style={{ backgroundColor: theme.colors.accent, color: 'white' }}>
              جديد
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button 
              size="sm"
              style={{ 
                backgroundColor: theme.colors.primary, 
                color: 'white',
                borderColor: theme.colors.primary
              }}
            >
              إجراء أساسي
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              style={{ 
                borderColor: theme.colors.secondary,
                color: theme.colors.secondary
              }}
            >
              إجراء ثانوي
            </Button>
          </div>
          
          <div 
            className="p-3 rounded border-l-4"
            style={{ 
              borderLeftColor: theme.colors.accent,
              backgroundColor: `${theme.colors.accent}15`
            }}
          >
            <p>هذا نص توضيحي لعرض كيفية ظهور النصوص مع السمة المختارة</p>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Preview */}
      <div 
        className="relative p-6 rounded-lg border-2 min-h-[200px] flex flex-col justify-center items-center text-center"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.accent,
          color: theme.colors.text
        }}
      >
        <div 
          className="absolute top-0 left-0 w-full h-2"
          style={{ backgroundColor: theme.colors.primary }}
        />
        <div 
          className="absolute bottom-0 left-0 w-full h-2"
          style={{ backgroundColor: theme.colors.primary }}
        />
        
        <h3 
          className="text-2xl font-bold mb-2"
          style={{ color: theme.colors.primary }}
        >
          شهادة تقدير
        </h3>
        <p className="mb-4">
          نشهد بأن <span style={{ color: theme.colors.accent }} className="font-semibold">[اسم المتلقي]</span>
        </p>
        <p className="text-sm">
          قد أتم بنجاح <span style={{ color: theme.colors.secondary }} className="font-medium">[اسم الدورة]</span>
        </p>
        
        <div 
          className="mt-4 px-4 py-2 rounded"
          style={{ backgroundColor: theme.colors.accent }}
        >
          <span className="text-white text-sm font-medium">ختم المؤسسة</span>
        </div>
      </div>

      {/* Button Collection Preview */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          className="w-full"
          style={{ 
            backgroundColor: theme.colors.primary,
            color: 'white'
          }}
        >
          زر أساسي
        </Button>
        <Button 
          variant="outline"
          className="w-full"
          style={{ 
            borderColor: theme.colors.secondary,
            color: theme.colors.secondary
          }}
        >
          زر ثانوي
        </Button>
        <Button 
          variant="outline"
          className="w-full"
          style={{ 
            borderColor: theme.colors.accent,
            color: theme.colors.accent
          }}
        >
          زر مميز
        </Button>
        <Button 
          variant="ghost"
          className="w-full"
          style={{ color: theme.colors.text }}
        >
          زر شفاف
        </Button>
      </div>

      {/* Color Swatches */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(theme.colors).map(([name, color]) => (
          <div key={name} className="text-center">
            <div 
              className="w-full h-12 rounded border shadow-sm mb-1"
              style={{ backgroundColor: color }}
            />
            <div className="text-xs font-medium capitalize">
              {name === 'primary' && 'أساسي'}
              {name === 'secondary' && 'ثانوي'}
              {name === 'accent' && 'مميز'}
              {name === 'background' && 'خلفية'}
              {name === 'text' && 'نص'}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {color}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorThemePreview;