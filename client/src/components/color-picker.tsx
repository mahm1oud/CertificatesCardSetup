import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Pipette, Palette } from "lucide-react"

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  templateImageUrl?: string;
}

export function ColorPicker({ value, onChange, label, templateImageUrl }: ColorPickerProps) {
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // ألوان سريعة شائعة
  const quickColors = [
    '#000000', '#ffffff', '#8b5a3c', '#d4af37', 
    '#1a1a1a', '#f5f5f5', '#2c3e50', '#e74c3c',
    '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#95a5a6', '#34495e', '#e67e22', '#1abc9c'
  ];

  const handleEyedropper = async () => {
    if (!templateImageUrl) return;
    
    try {
      // إنشاء canvas لمعالجة الصورة
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const img = imageRef.current;
      
      if (!canvas || !ctx || !img) return;

      // تحميل صورة القالب
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        setIsEyedropperActive(true);
      };
      
      img.src = templateImageUrl;
    } catch (error) {
      console.error('خطأ في تفعيل أداة انتقاء اللون:', error);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEyedropperActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // الحصول على لون البكسل
    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;
    
    // تحويل إلى hex
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    
    onChange(hex);
    setIsEyedropperActive(false);
  };

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-8"
        />
        
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />

        {templateImageUrl && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
              >
                <Eyedropper className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eyedropper className="h-4 w-4" />
                  <span className="text-sm font-medium">انتقاء لون من القالب</span>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className={`max-w-full h-auto cursor-${isEyedropperActive ? 'crosshair' : 'pointer'}`}
                    style={{ maxHeight: '200px' }}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleEyedropper}
                    variant={isEyedropperActive ? "default" : "outline"}
                  >
                    {isEyedropperActive ? 'انقر على اللون المطلوب' : 'تفعيل أداة الانتقاء'}
                  </Button>
                  
                  {isEyedropperActive && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEyedropperActive(false)}
                    >
                      إلغاء
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">ألوان سريعة</Label>
              <div className="grid grid-cols-8 gap-2">
                {quickColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                    style={{ backgroundColor: color }}
                    onClick={() => onChange(color)}
                    title={`استخدام اللون ${color}`}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* صورة مخفية لتحميل القالب */}
      <img
        ref={imageRef}
        style={{ display: 'none' }}
        crossOrigin="anonymous"
        alt="Template for color picking"
      />
    </div>
  );
}