import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Palette } from "lucide-react"

interface GradientColor {
  color: string;
  position: number;
}

interface FontGradient {
  type: 'linear' | 'radial';
  direction: number;
  colors: GradientColor[];
}

interface FontGradientPickerProps {
  value?: FontGradient;
  onChange: (gradient: FontGradient) => void;
  label?: string;
}

export function FontGradientPicker({ value, onChange, label = "تدرج لون الخط" }: FontGradientPickerProps) {
  const [gradient, setGradient] = useState<FontGradient>(
    value || {
      type: 'linear',
      direction: 45,
      colors: [
        { color: '#ff6b6b', position: 0 },
        { color: '#4ecdc4', position: 100 }
      ]
    }
  );

  const updateGradient = (updates: Partial<FontGradient>) => {
    const newGradient = { ...gradient, ...updates };
    setGradient(newGradient);
    onChange(newGradient);
  };

  const addColor = () => {
    const newColors = [...gradient.colors, { color: '#000000', position: 50 }];
    updateGradient({ colors: newColors });
  };

  const removeColor = (index: number) => {
    if (gradient.colors.length > 2) {
      const newColors = gradient.colors.filter((_, i) => i !== index);
      updateGradient({ colors: newColors });
    }
  };

  const updateColor = (index: number, updates: Partial<GradientColor>) => {
    const newColors = gradient.colors.map((color, i) => 
      i === index ? { ...color, ...updates } : color
    );
    updateGradient({ colors: newColors });
  };

  const generateCSSGradient = () => {
    const colorStops = gradient.colors
      .sort((a, b) => a.position - b.position)
      .map(color => `${color.color} ${color.position}%`)
      .join(', ');

    if (gradient.type === 'linear') {
      return `linear-gradient(${gradient.direction}deg, ${colorStops})`;
    } else {
      return `radial-gradient(circle, ${colorStops})`;
    }
  };

  const presetGradients = [
    {
      name: "غروب الشمس",
      gradient: {
        type: 'linear' as const,
        direction: 45,
        colors: [
          { color: '#ff6b6b', position: 0 },
          { color: '#ffa726', position: 50 },
          { color: '#ff5722', position: 100 }
        ]
      }
    },
    {
      name: "المحيط",
      gradient: {
        type: 'linear' as const,
        direction: 90,
        colors: [
          { color: '#4ecdc4', position: 0 },
          { color: '#44a08d', position: 100 }
        ]
      }
    },
    {
      name: "البنفسجي",
      gradient: {
        type: 'linear' as const,
        direction: 135,
        colors: [
          { color: '#667eea', position: 0 },
          { color: '#764ba2', position: 100 }
        ]
      }
    },
    {
      name: "الذهبي",
      gradient: {
        type: 'linear' as const,
        direction: 45,
        colors: [
          { color: '#ffd700', position: 0 },
          { color: '#ffb347', position: 50 },
          { color: '#ff8c00', position: 100 }
        ]
      }
    },
    {
      name: "الأخضر الطبيعي",
      gradient: {
        type: 'linear' as const,
        direction: 0,
        colors: [
          { color: '#56ab2f', position: 0 },
          { color: '#a8e6cf', position: 100 }
        ]
      }
    },
    {
      name: "النار",
      gradient: {
        type: 'radial' as const,
        direction: 0,
        colors: [
          { color: '#ff4757', position: 0 },
          { color: '#ff3838', position: 50 },
          { color: '#c44569', position: 100 }
        ]
      }
    }
  ];

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{label}</Label>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full h-12 relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-75"
              style={{ background: generateCSSGradient() }}
            />
            <div className="relative z-10 flex items-center gap-2 text-white font-bold text-shadow">
              <Palette className="h-4 w-4" />
              تدرج الألوان
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* نوع التدرج */}
            <div className="space-y-2">
              <Label>نوع التدرج</Label>
              <Select 
                value={gradient.type} 
                onValueChange={(value: 'linear' | 'radial') => updateGradient({ type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">خطي</SelectItem>
                  <SelectItem value="radial">دائري</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* اتجاه التدرج (للخطي فقط) */}
            {gradient.type === 'linear' && (
              <div className="space-y-2">
                <Label>الاتجاه (درجة)</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[gradient.direction]}
                    onValueChange={([value]) => updateGradient({ direction: value })}
                    min={0}
                    max={360}
                    step={15}
                    className="flex-1"
                  />
                  <span className="text-sm w-12">{gradient.direction}°</span>
                </div>
              </div>
            )}

            {/* الألوان */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>الألوان</Label>
                <Button size="sm" variant="outline" onClick={addColor}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="space-y-2">
                {gradient.colors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={color.color}
                      onChange={(e) => updateColor(index, { color: e.target.value })}
                      className="w-12 h-8 p-1 border"
                    />
                    <Slider
                      value={[color.position]}
                      onValueChange={([position]) => updateColor(index, { position })}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs w-8">{color.position}%</span>
                    {gradient.colors.length > 2 && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeColor(index)}
                        className="p-1 h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* معاينة */}
            <div className="space-y-2">
              <Label>المعاينة</Label>
              <div 
                className="h-16 rounded border flex items-center justify-center text-white font-bold text-lg"
                style={{ 
                  background: generateCSSGradient(),
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                }}
              >
                نص تجريبي
              </div>
            </div>

            {/* القوالب الجاهزة */}
            <div className="space-y-2">
              <Label>قوالب جاهزة</Label>
              <div className="grid grid-cols-2 gap-2">
                {presetGradients.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => updateGradient(preset.gradient)}
                    className="h-8 text-xs relative overflow-hidden"
                  >
                    <div 
                      className="absolute inset-0 opacity-60"
                      style={{ 
                        background: `linear-gradient(${preset.gradient.direction}deg, ${preset.gradient.colors.map(c => `${c.color} ${c.position}%`).join(', ')})`
                      }}
                    />
                    <span className="relative z-10 text-white font-medium text-shadow">
                      {preset.name}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* عرض CSS للنسخ */}
      <div className="text-xs text-muted-foreground">
        <code className="bg-muted p-1 rounded text-xs">
          background: {generateCSSGradient()}
        </code>
      </div>
    </div>
  );
}