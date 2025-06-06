import React, { memo, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Edit3,
  Copy,
  Trash2,
  Type,
  Image,
  List,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldType {
  id: number;
  name: string;
  label?: string;
  labelAr?: string;
  type: string;
  position: { x: number; y: number };
  style?: any;
  zIndex?: number;
  visible?: boolean;
  rotation?: number;
  locked?: boolean;
}

interface FastFieldsListProps {
  fields: FieldType[];
  selectedFieldId?: number | null;
  onFieldSelect: (fieldId: number) => void;
  onFieldEdit: (field: FieldType) => void;
  onFieldToggleVisibility: (fieldId: number) => void;
  onFieldToggleLock: (fieldId: number) => void;
  onFieldDuplicate: (fieldId: number) => void;
  onFieldDelete: (fieldId: number) => void;
}

// مكون محسن لعرض قائمة حقول القالب بسرعة
const FastFieldsList = memo<FastFieldsListProps>(({
  fields,
  selectedFieldId,
  onFieldSelect,
  onFieldEdit,
  onFieldToggleVisibility,
  onFieldToggleLock,
  onFieldDuplicate,
  onFieldDelete
}) => {
  // أيقونات نوع الحقل
  const getFieldTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'text':
        return <Type className="w-3 h-3" />;
      case 'image':
        return <Image className="w-3 h-3" />;
      case 'dropdown':
        return <List className="w-3 h-3" />;
      case 'radio':
        return <Radio className="w-3 h-3" />;
      default:
        return <Type className="w-3 h-3" />;
    }
  }, []);

  // ألوان نوع الحقل
  const getFieldTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'text':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'image':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'dropdown':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'radio':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }, []);

  // تصنيف الحقول حسب النوع للعرض المحسن
  const fieldsByType = useMemo(() => {
    const grouped = fields.reduce((acc, field) => {
      const type = field.type || 'text';
      if (!acc[type]) acc[type] = [];
      acc[type].push(field);
      return acc;
    }, {} as Record<string, FieldType[]>);
    
    return grouped;
  }, [fields]);

  // دوال الأحداث المحسنة
  const handleFieldClick = useCallback((field: FieldType) => {
    onFieldSelect(field.id);
  }, [onFieldSelect]);

  const handleEditClick = useCallback((e: React.MouseEvent, field: FieldType) => {
    e.stopPropagation();
    onFieldEdit(field);
  }, [onFieldEdit]);

  const handleVisibilityToggle = useCallback((e: React.MouseEvent, fieldId: number) => {
    e.stopPropagation();
    onFieldToggleVisibility(fieldId);
  }, [onFieldToggleVisibility]);

  const handleLockToggle = useCallback((e: React.MouseEvent, fieldId: number) => {
    e.stopPropagation();
    onFieldToggleLock(fieldId);
  }, [onFieldToggleLock]);

  const handleDuplicate = useCallback((e: React.MouseEvent, fieldId: number) => {
    e.stopPropagation();
    onFieldDuplicate(fieldId);
  }, [onFieldDuplicate]);

  const handleDelete = useCallback((e: React.MouseEvent, fieldId: number) => {
    e.stopPropagation();
    onFieldDelete(fieldId);
  }, [onFieldDelete]);

  // مكون حقل واحد محسن
  const FieldItem = memo<{ field: FieldType }>(({ field }) => {
    const isSelected = selectedFieldId === field.id;
    const isVisible = field.visible !== false;
    const isLocked = field.locked === true;

    return (
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md border",
          isSelected
            ? "ring-2 ring-primary border-primary bg-primary/5"
            : "hover:border-primary/50",
          !isVisible && "opacity-50"
        )}
        onClick={() => handleFieldClick(field)}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge variant="secondary" className={cn("p-1", getFieldTypeColor(field.type))}>
                {getFieldTypeIcon(field.type)}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {field.labelAr || field.label || field.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {field.name} • {field.type}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => handleVisibilityToggle(e, field.id)}
                title={isVisible ? "إخفاء" : "إظهار"}
              >
                {isVisible ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => handleLockToggle(e, field.id)}
                title={isLocked ? "إلغاء القفل" : "قفل"}
              >
                {isLocked ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Unlock className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              الموضع: {field.position.x}, {field.position.y}
              {field.zIndex && ` • طبقة: ${field.zIndex}`}
            </div>
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => handleEditClick(e, field)}
                title="تحرير"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => handleDuplicate(e, field.id)}
                title="نسخ"
              >
                <Copy className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={(e) => handleDelete(e, field.id)}
                title="حذف"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  });

  FieldItem.displayName = 'FieldItem';

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Type className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>لا توجد حقول في هذا القالب</p>
        <p className="text-sm">قم بإضافة حقول جديدة لبدء التصميم</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" dir="rtl">
      <div className="space-y-4 p-1">
        {Object.entries(fieldsByType).map(([type, typeFields]) => (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Badge variant="outline" className={getFieldTypeColor(type)}>
                {getFieldTypeIcon(type)}
                <span className="mr-1">
                  {type === 'text' && 'نصوص'}
                  {type === 'image' && 'صور'}
                  {type === 'dropdown' && 'قوائم'}
                  {type === 'radio' && 'خيارات'}
                </span>
                <span className="mr-1">({typeFields.length})</span>
              </Badge>
            </div>
            
            <div className="space-y-1">
              {typeFields
                .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                .map(field => (
                  <FieldItem key={field.id} field={field} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
});

FastFieldsList.displayName = 'FastFieldsList';

export default FastFieldsList;