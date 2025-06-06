import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Settings, 
  Users, 
  FileText, 
  BarChart3, 
  CreditCard, 
  Award, 
  Upload, 
  Palette, 
  Globe, 
  Shield, 
  Bell, 
  Menu, 
  X,
  ChevronDown,
  LogOut,
  User,
  Database,
  Image,
  Package,
  Layers,
  FileImage,
  FileStack
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  id: string;
  title: string;
  icon: any;
  href?: string;
  badge?: string;
  children?: MenuItem[];
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard', 'content']);
  
  // إخفاء القائمة الجانبية تلقائيًا عند تغيير المسار على الهاتف
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    // إخفاء القائمة عند تغيير المسار على الهاتف
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }

    // إضافة مستمع لتغيير حجم الشاشة
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [location]);

  // جلب بيانات المستخدم
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  // جلب الإحصائيات للشارات
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      title: 'لوحة التحكم',
      icon: BarChart3,
      href: '/admin',
    },
    {
      id: 'content',
      title: 'إدارة المحتوى',
      icon: FileText,
      children: [
        {
          id: 'templates',
          title: 'إدارة القوالب',
          icon: Layers,
          href: '/admin/templates',
          badge: stats?.totalTemplates?.toString() || '0',
        },
        {
          id: 'categories',
          title: 'التصنيفات',
          icon: Package,
          href: '/admin/categories',
          badge: stats?.totalCategories?.toString() || '0',
        },
        {
          id: 'certificate-templates',
          title: 'قوالب الشهادات',
          icon: Award,
          href: '/admin/certificate-templates',
        },
        {
          id: 'bulk-certificates',
          title: 'الإنتاج المجمع',
          icon: FileStack,
          href: '/admin/bulk-certificates',
        },
      ]
    },
    {
      id: 'users',
      title: 'إدارة المستخدمين',
      icon: Users,
      href: '/admin/users',
      badge: stats?.totalUsers?.toString() || '0',
    },
    {
      id: 'cards',
      title: 'البطاقات',
      icon: CreditCard,
      href: '/admin/cards',
      badge: stats?.totalCards?.toString() || '0',
    },
    {
      id: 'certificates',
      title: 'الشهادات',
      icon: Award,
      href: '/admin/certificates',
      badge: stats?.totalCertificates?.toString() || '0',
    },
    {
      id: 'media',
      title: 'إدارة الوسائط',
      icon: Image,
      children: [
        {
          id: 'thumbnails',
          title: 'صور مصغرة',
          icon: FileImage,
          href: '/admin/thumbnails',
        },
        {
          id: 'uploads',
          title: 'الملفات المرفوعة',
          icon: Upload,
          href: '/admin/uploads',
        },
        {
          id: 'color-palette-studio',
          title: 'استوديو لوحات الألوان',
          icon: Palette,
          href: '/admin/color-palette-studio',
        },
      ]
    },
    {
      id: 'settings',
      title: 'الإعدادات',
      icon: Settings,
      children: [
        {
          id: 'display-settings',
          title: 'إعدادات العرض',
          icon: Palette,
          href: '/admin/display-settings',
        },
        {
          id: 'theme-settings',
          title: 'إعدادات المظهر والثيمات',
          icon: Palette,
          href: '/admin/theme-settings',
        },
        {
          id: 'seo-settings',
          title: 'إعدادات SEO',
          icon: Globe,
          href: '/admin/seo-settings',
        },
        {
          id: 'auth-settings',
          title: 'إعدادات المصادقة',
          icon: Shield,
          href: '/admin/settings/auth',
        },
        {
          id: 'social-auth',
          title: 'تسجيل الدخول الاجتماعي',
          icon: Users,
          href: '/admin/social-auth-settings',
        },
        {
          id: 'database',
          title: 'قاعدة البيانات',
          icon: Database,
          href: '/admin/database',
        },
      ]
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isActiveLink = (href: string) => {
    if (href === '/admin') {
      return location === '/admin';
    }
    return location.startsWith(href);
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.id);
    const isActive = item.href ? isActiveLink(item.href) : false;

    if (hasChildren) {
      return (
        <Collapsible
          key={item.id}
          open={isExpanded}
          onOpenChange={() => toggleSection(item.id)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between text-right hover:bg-gray-100 dark:hover:bg-gray-800",
                level > 0 && "pr-8"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="mr-auto">
                    {item.badge}
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pr-4">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link key={item.id} href={item.href!}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-right hover:bg-gray-100 dark:hover:bg-gray-800",
            level > 0 && "pr-8",
            isActive && "bg-primary/10 text-primary border-r-2 border-primary"
          )}
          onClick={() => setSidebarOpen(false)}
        >
          <div className="flex items-center gap-3 w-full">
            <item.icon className="w-5 h-5" />
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <Badge variant="secondary">
                {item.badge}
              </Badge>
            )}
          </div>
        </Button>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="text-xl font-bold">لوحة التحكم الإدارية</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* الإشعارات */}
            <Button variant="ghost" size="sm">
              <Bell className="w-5 h-5" />
            </Button>

            {/* ملف المستخدم */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="/placeholder-avatar.jpg" />
                    <AvatarFallback>
                      {(user as any)?.fullName?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-right">
                    <div className="text-sm font-medium">{(user as any)?.fullName || 'مدير النظام'}</div>
                    <div className="text-xs text-gray-500">{(user as any)?.email || 'admin@example.com'}</div>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/profile">
                    <User className="w-4 h-4 ml-2" />
                    الملف الشخصي
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <Settings className="w-4 h-4 ml-2" />
                    الإعدادات
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="w-4 h-4 ml-2" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - مخفية افتراضيًا على الهاتف */}
        <aside className={cn(
          "fixed inset-y-0 right-0 z-20 w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out",
          "top-16 h-[calc(100vh-4rem)]",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
          "md:static md:translate-x-0 md:top-0 md:h-full md:z-auto"
        )}>
          <div className="flex flex-col h-full pt-4 md:pt-6">
            <div className="px-4 mb-6">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                القوائم الرئيسية
              </div>
            </div>
            
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {menuItems.map(item => renderMenuItem(item))}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 text-center">
                إصدار النظام 2.0.0
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay للجوال - يظهر فقط عند فتح القائمة */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content - مساحة كاملة على الهاتف */}
        <main className={cn(
          "flex-1 min-h-screen transition-all duration-300",
          "md:mr-80",
          "w-full"
        )}>
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}