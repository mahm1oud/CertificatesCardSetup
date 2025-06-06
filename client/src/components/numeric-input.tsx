import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Minus, Plus } from "lucide-react"

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  className?: string;
}

export function NumericInput({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  unit,
  className = ""
}: NumericInputProps) {
  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    if (newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium">
          {label} {unit && `(${unit})`}
        </label>
      )}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          className="text-center h-8 w-20"
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          <Plus className="h-3 w-3" />
        </Button>
        
        {unit && (
          <span className="text-sm text-muted-foreground ml-1">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}