import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  Info, 
  Lightbulb, 
  BookOpen, 
  Video, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Star,
  Zap,
  X
} from 'lucide-react';

interface TooltipData {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  type: 'info' | 'tip' | 'warning' | 'success';
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  examples?: string[];
  videoUrl?: string;
  docsUrl?: string;
  relatedFeatures?: string[];
}

interface ContextualTooltipProps {
  helpId: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showOnHover?: boolean;
  className?: string;
}

const tooltipIcons = {
  info: Info,
  tip: Lightbulb,
  warning: AlertCircle,
  success: CheckCircle
};

const tooltipStyles = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  tip: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  warning: 'border-orange-200 bg-orange-50 text-orange-800',
  success: 'border-green-200 bg-green-50 text-green-800'
};

const levelBadges = {
  beginner: { label: 'مبتدئ', color: 'bg-green-100 text-green-800' },
  intermediate: { label: 'متوسط', color: 'bg-yellow-100 text-yellow-800' },
  advanced: { label: 'متقدم', color: 'bg-red-100 text-red-800' }
};

// Database of contextual help content
const helpDatabase: Record<string, TooltipData> = {
  'background-color': {
    id: 'background-color',
    title: 'Background Color',
    titleAr: 'لون الخلفية',
    description: 'Choose the background color for your certificate',
    descriptionAr: 'اختر لون الخلفية للشهادة الخاصة بك',
    type: 'info',
    level: 'beginner',
    category: 'styling',
    examples: [
      'استخدم الألوان الفاتحة للنصوص الداكنة',
      'الألوان الداكنة تناسب النصوص الذهبية',
      'تجنب الألوان الزاهية للوثائق الرسمية'
    ]
  },
  'border-style': {
    id: 'border-style',
    title: 'Border Style',
    titleAr: 'نمط الحدود',
    description: 'Add decorative borders to your certificate',
    descriptionAr: 'أضف حدود زخرفية إلى شهادتك',
    type: 'tip',
    level: 'intermediate',
    category: 'styling',
    examples: [
      'الحدود المصمتة للمظهر الكلاسيكي',
      'الحدود المنقطة للمظهر الحديث',
      'الحدود المزدوجة للوثائق الهامة'
    ],
    relatedFeatures: ['border-color', 'border-width']
  },
  'font-selection': {
    id: 'font-selection',
    title: 'Font Selection',
    titleAr: 'اختيار الخط',
    description: 'Select appropriate fonts for your certificate text',
    descriptionAr: 'اختر الخطوط المناسبة لنص الشهادة',
    type: 'info',
    level: 'beginner',
    category: 'typography',
    examples: [
      'Cairo للنصوص العربية الواضحة',
      'Amiri للنصوص التراثية الأنيقة',
      'تجنب خلط أكثر من خطين مختلفين'
    ],
    videoUrl: '/help/videos/font-selection.mp4',
    docsUrl: '/docs/typography-guide'
  },
  'text-alignment': {
    id: 'text-alignment',
    title: 'Text Alignment',
    titleAr: 'محاذاة النص',
    description: 'Control how text is positioned within its container',
    descriptionAr: 'تحكم في موضع النص داخل الحاوية الخاصة به',
    type: 'info',
    level: 'beginner',
    category: 'typography',
    examples: [
      'المحاذاة الوسطى للعناوين',
      'المحاذاة اليمنى للنصوص العربية',
      'المحاذاة اليسرى للنصوص الإنجليزية'
    ]
  },
  'shadow-effects': {
    id: 'shadow-effects',
    title: 'Shadow Effects',
    titleAr: 'تأثيرات الظل',
    description: 'Add depth and dimension to your certificate',
    descriptionAr: 'أضف عمق وبعد ثلاثي لشهادتك',
    type: 'tip',
    level: 'advanced',
    category: 'effects',
    examples: [
      'الظلال الخفيفة للمظهر الأنيق',
      'الظلال القوية للتأثير الدراماتيكي',
      'لا تفرط في استخدام الظلال'
    ],
    relatedFeatures: ['border-style', 'background-color']
  },
  'watermark': {
    id: 'watermark',
    title: 'Watermark',
    titleAr: 'العلامة المائية',
    description: 'Add a semi-transparent watermark for branding or security',
    descriptionAr: 'أضف علامة مائية شبه شفافة للعلامة التجارية أو الأمان',
    type: 'info',
    level: 'intermediate',
    category: 'security',
    examples: [
      'استخدم شعار المؤسسة كعلامة مائية',
      'النص الشفاف يضيف الأمان',
      'تجنب العلامات المائية الواضحة جداً'
    ]
  },
  'quality-settings': {
    id: 'quality-settings',
    title: 'Quality Settings',
    titleAr: 'إعدادات الجودة',
    description: 'Control the output quality and file size of your certificate',
    descriptionAr: 'تحكم في جودة المخرجات وحجم ملف الشهادة',
    type: 'warning',
    level: 'intermediate',
    category: 'export',
    examples: [
      'الجودة العالية للطباعة',
      'الجودة المتوسطة للويب',
      'الجودة المنخفضة للمعاينة السريعة'
    ]
  }
};

export function ContextualTooltip({ 
  helpId, 
  children, 
  position = 'top',
  showOnHover = true,
  className = ''
}: ContextualTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipData = helpDatabase[helpId];

  if (!tooltipData) {
    return <>{children}</>;
  }

  const IconComponent = tooltipIcons[tooltipData.type];
  const levelBadge = levelBadges[tooltipData.level];

  const TooltipIcon = () => (
    <div className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${tooltipStyles[tooltipData.type]} ml-2`}>
      <IconComponent className="w-3 h-3" />
    </div>
  );

  const TooltipContentComponent = () => (
    <div className="w-80 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-base">{tooltipData.titleAr}</h4>
          <p className="text-sm text-muted-foreground mt-1">{tooltipData.descriptionAr}</p>
        </div>
        <Badge className={`text-xs ${levelBadge.color} ml-2`}>
          {levelBadge.label}
        </Badge>
      </div>

      {/* Examples */}
      {tooltipData.examples && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            نصائح مفيدة:
          </h5>
          <ul className="space-y-1">
            {tooltipData.examples.map((example, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <Star className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                {example}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Features */}
      {tooltipData.relatedFeatures && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            ميزات ذات صلة:
          </h5>
          <div className="flex flex-wrap gap-1">
            {tooltipData.relatedFeatures.map((feature, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {helpDatabase[feature]?.titleAr || feature}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        {tooltipData.videoUrl && (
          <Button size="sm" variant="outline" className="gap-2 text-xs">
            <Video className="w-3 h-3" />
            شاهد الفيديو
          </Button>
        )}
        {tooltipData.docsUrl && (
          <Button size="sm" variant="outline" className="gap-2 text-xs">
            <BookOpen className="w-3 h-3" />
            الدليل
          </Button>
        )}
      </div>
    </div>
  );

  if (showOnHover) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center ${className}`}>
              {children}
              <TooltipIcon />
            </div>
          </TooltipTrigger>
          <TooltipContent side={position} className="p-0 border-0 bg-transparent shadow-lg">
            <Card className="border shadow-lg">
              <CardContent className="p-0">
                <TooltipContentComponent />
              </CardContent>
            </Card>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={`inline-flex items-center cursor-pointer ${className}`}>
          {children}
          <TooltipIcon />
        </div>
      </PopoverTrigger>
      <PopoverContent side={position} className="p-0 border-0 bg-transparent shadow-lg w-auto">
        <Card className="border shadow-lg">
          <CardContent className="p-0">
            <TooltipContentComponent />
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Specialized help components for common use cases
export function HelpLabel({ 
  children, 
  helpId, 
  required = false 
}: { 
  children: React.ReactNode; 
  helpId: string; 
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-medium">
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <ContextualTooltip helpId={helpId} showOnHover>
        <span></span>
      </ContextualTooltip>
    </div>
  );
}

export function HelpCard({ 
  helpId, 
  children 
}: { 
  helpId: string; 
  children: React.ReactNode;
}) {
  const tooltipData = helpDatabase[helpId];
  
  if (!tooltipData) {
    return <>{children}</>;
  }

  return (
    <Card className="relative">
      <div className="absolute top-2 right-2">
        <ContextualTooltip helpId={helpId} showOnHover={false}>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </ContextualTooltip>
      </div>
      {children}
    </Card>
  );
}

// Smart Help System that shows contextual tips based on user actions
export function SmartHelpSystem() {
  const [activeTips, setActiveTips] = useState<string[]>([]);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());

  const dismissTip = (tipId: string) => {
    setDismissedTips(prev => new Set([...prev, tipId]));
    setActiveTips(prev => prev.filter(id => id !== tipId));
  };

  const showTip = (tipId: string) => {
    if (!dismissedTips.has(tipId) && !activeTips.includes(tipId)) {
      setActiveTips(prev => [...prev, tipId]);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {activeTips.map(tipId => {
          const tipData = helpDatabase[tipId];
          if (!tipData) return null;

          const IconComponent = tooltipIcons[tipData.type];

          return (
            <motion.div
              key={tipId}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className="max-w-sm"
            >
              <Card className={`${tooltipStyles[tipData.type]} border-2`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{tipData.titleAr}</h4>
                      <p className="text-xs mt-1 opacity-90">{tipData.descriptionAr}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                      onClick={() => dismissTip(tipId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Hook to trigger contextual help
export function useContextualHelp() {
  const showHelp = (helpId: string, delay = 1000) => {
    setTimeout(() => {
      console.log(`Showing help for: ${helpId}`);
    }, delay);
  };

  const hideHelp = (helpId: string) => {
    console.log(`Hiding help for: ${helpId}`);
  };

  return { showHelp, hideHelp };
}