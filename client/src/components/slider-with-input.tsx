import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';

interface SliderWithInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  className?: string;
}

export function SliderWithInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit = '',
  className = ''
}: SliderWithInputProps) {
  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      {/* Slider */}
      <div className="px-2">
        <Slider
          value={[value]}
          onValueChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          className="w-full"
        />
      </div>
      
      {/* Input with increment/decrement buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDecrement}
          disabled={value <= min}
          className="h-8 w-8 p-0 shrink-0"
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
          className="h-8 text-center"
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleIncrement}
          disabled={value >= max}
          className="h-8 w-8 p-0 shrink-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
        
        {unit && (
          <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}