import { Switch, Route } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient-simple";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { I18nProvider, useTranslation } from "@/lib/i18n";
import { ThemeProvider } from "next-themes";
import { ThemeProvider as CustomThemeProvider } from "@/components/theme-provider";
import { lazy, Suspense, useState, useEffect } from "react";
import AccessLayers from "@/components/access-layers";
import { Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import ErrorBoundary from "@/components/error-boundary";

// تحميل كل الصفحات بشكل متأخر لتقليل حجم الحزمة الأساسية
const Home = lazy(() => import("@/pages/home"));
const HomePageSinglePage = lazy(() => import("@/pages/home-single-page"));
const TemplateForm = lazy(() => import("@/pages/template-form"));
const CardPreview = lazy(() => import("@/pages/card-preview"));
const FullCardView = lazy(() => import("@/pages/full-card-view"));
const TemplateEditorUnified = lazy(() => import("@/pages/template-editor-unified"));
const TemplateEditorWithLayers = lazy(() => import("@/pages/template-editor-with-layers"));
const TemplateEditorWithLayersNew = lazy(() => import("@/pages/template-editor-with-layers-new"));
const AdvancedLayerEditor = lazy(() => import("@/pages/advanced-layer-editor"));
const AdvancedCertificateEditor = lazy(() => import("@/pages/advanced-certificate-editor"));
const CertificateTemplateGallery = lazy(() => import("@/pages/certificate-template-gallery"));
const AddCertificate = lazy(() => import("@/pages/add-certificate"));

// Lazy load admin and auth pages
const AuthPage = lazy(() => import("@/pages/auth-page"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminCategories = lazy(() => import("@/pages/admin/categories"));
const AdminTemplates = lazy(() => import("@/pages/admin/templates"));
const AdminTemplateEdit = lazy(() => import("@/pages/admin/template-edit"));
const AdminTemplateFields = lazy(() => import("@/pages/admin/template-fields"));
const FieldForm = lazy(() => import("@/pages/admin/field-form"));
const AdminTemplateEditor = lazy(() => import("@/pages/admin/template-editor/index"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminCards = lazy(() => import("@/pages/admin/cards"));
const AdminCertificates = lazy(() => import("@/pages/admin/certificates"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminAuthSettings = lazy(() => import("@/pages/admin/settings/auth-page"));
const AdminSocialAuth = lazy(() => import("@/pages/admin/social-auth-settings"));
const AdminDisplaySettings = lazy(() => import("@/pages/admin/display-settings"));
const FontManagement = lazy(() => import("@/pages/admin/font-management"));
const ContentLibrary = lazy(() => import("@/pages/admin/content-library"));
const ColorPaletteStudio = lazy(() => import("@/pages/admin/color-palette-studio"));
const AdminSeoSettings = lazy(() => import("@/pages/admin/seo-settings"));
const AdminCertificateTemplates = lazy(() => import("@/pages/admin/certificate-templates"));
const AdminBulkCertificates = lazy(() => import("@/pages/admin/bulk-certificates"));
const AdminThemeSettings = lazy(() => import("@/pages/admin/theme-settings"));
const TemplateFieldsManager = lazy(() => import("@/pages/admin/template-fields-manager"));
const UserDashboard = lazy(() => import("@/pages/user/dashboard"));
const UserCards = lazy(() => import("@/pages/user/cards"));
const UserCertificates = lazy(() => import("@/pages/user/certificates"));
const UserProfile = lazy(() => import("@/pages/user/profile"));
const UserPreferences = lazy(() => import("@/pages/user/preferences"));
const CertificateVerify = lazy(() => import("@/pages/certificate-verify"));
const CertificateForm = lazy(() => import("@/pages/certificate-form"));
const CertificatePreview = lazy(() => import("@/pages/certificate-preview"));
const FullCertificateView = lazy(() => import("@/pages/full-certificate-view"));
const TemplateEditor = lazy(() => import("@/pages/template-editor"));
const SocialTemplateEditor = lazy(() => import("@/pages/social-template-editor"));

// Loading component for lazy loaded routes
const LazyLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function Router() {
  const { dir } = useTranslation();
  const [displaySettings, setDisplaySettings] = useState<any>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [userPreferences, setUserPreferences] = useState<{ layout?: 'boxed' | 'fluid', theme?: 'light' | 'dark' | 'system' }>({
    layout: 'fluid',
    theme: 'system'
  });
  
  // جلب إعدادات العرض من المسار الموحد
  useEffect(() => {
    async function fetchDisplaySettings() {
      try {
        // نحاول جلب الإعدادات من الخادم باستخدام apiRequest
        const data = await apiRequest('GET', '/api/display-settings');
        setDisplaySettings(data.settings || { templateViewMode: 'multi-page' });
      } catch (error) {
        // إذا فشل الطلب (مثلاً، المسار غير متاح)، نستخدم القيم الافتراضية
        console.error('Error fetching display settings:', error);
        // استخدام القيم الافتراضية في حال حدوث خطأ
        setDisplaySettings({ templateViewMode: 'multi-page' });
      } finally {
        setIsLoadingSettings(false);
      }
    }
    
    fetchDisplaySettings();
  }, []);
  
  // جلب تفضيلات المستخدم
  useEffect(() => {
    async function fetchUserPreferences() {
      try {
        const data = await apiRequest('GET', '/api/user/preferences', undefined, { on401: 'returnNull' });
        if (data) {
          setUserPreferences({
            layout: data.layout || 'fluid',
            theme: data.theme || 'system'
          });
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    }
    
    fetchUserPreferences();
  }, []);
  
  // اختيار مكون الصفحة الرئيسية بناءً على إعدادات العرض
  const HomeComponent = displaySettings?.displayMode === 'single' 
    ? HomePageSinglePage
    : Home;
    
  if (isLoadingSettings) {
    return <LazyLoadingFallback />;
  }
  
  return (
    <div dir={dir()} className={`flex flex-col min-h-screen layout-${userPreferences.layout}`}>
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<LazyLoadingFallback />}>
          <Switch>
            {/* Public routes */}
            <Route path="/" component={HomeComponent} />
            <Route path="/single" component={HomePageSinglePage} />
            <Route path="/multi" component={Home} />
            <Route path="/cards/:category/:templateId" component={TemplateForm} />
            <Route path="/preview/:category/:templateId/:cardId" component={CardPreview} />
            <Route path="/view/:cardId" component={FullCardView} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/login" component={AuthPage} />
            <Route path="/certificates/verify/:code" component={CertificateVerify} />
            <Route path="/add-certificate" component={AddCertificate} />
            <Route path="/certificates/:templateId" component={CertificateForm} />
            <Route path="/certificates/preview/:certificateId" component={CertificatePreview} />
            <Route path="/certificate/:certificateId" component={FullCertificateView} />
            <Route path="/template-editor/:id" component={TemplateEditor} />
            <Route path="/template-editor-unified/:id?" component={TemplateEditorUnified} />
            <Route path="/template-editor-with-layers/:templateId?" component={TemplateEditorWithLayers} />
            <Route path="/template-editor-with-layers-new/:templateId?" component={TemplateEditorWithLayersNew} />
            <Route path="/advanced-layer-editor/:templateId?" component={AdvancedLayerEditor} />
            {/* تم تعطيل هذا المسار مؤقتًا */}
            <Route path="/social-template-editor/:templateId" component={SocialTemplateEditor} />

            {/* User routes (protected) */}
            <ProtectedRoute path="/user/dashboard" component={UserDashboard} />
            <ProtectedRoute path="/user/cards" component={UserCards} />
            <ProtectedRoute path="/user/certificates" component={UserCertificates} />
            <ProtectedRoute path="/user/profile" component={UserProfile} />
            <ProtectedRoute path="/user/preferences" component={UserPreferences} />
            <ProtectedRoute path="/advanced-certificate-editor" component={AdvancedCertificateEditor} />
            <Route path="/certificate-templates" component={CertificateTemplateGallery} />
            <Route path="/templates/gallery" component={CertificateTemplateGallery} />
            <Route path="/gallery" component={CertificateTemplateGallery} />
            
            {/* Admin routes (protected, admin only) */}
            <Route path="/admin">
              {() => {
                window.location.href = "/admin/dashboard";
                return null;
              }}
            </Route>
            <Route path="/admin/profile">
              {() => {
                window.location.href = "/user/profile";
                return null;
              }}
            </Route>
            <ProtectedRoute path="/admin/dashboard" component={Dashboard} adminOnly />
            <ProtectedRoute path="/dashboard" component={Dashboard} adminOnly />
            <ProtectedRoute path="/admin/categories" component={AdminCategories} adminOnly />
            <ProtectedRoute path="/admin/templates/:templateId/fields/:fieldId/edit" component={FieldForm} adminOnly />
            <ProtectedRoute path="/admin/templates/:templateId/fields/add" component={FieldForm} adminOnly />
            <ProtectedRoute path="/admin/templates/:templateId/fields" component={AdminTemplateFields} adminOnly />
            <ProtectedRoute path="/admin/templates/new" component={AdminTemplateEdit} adminOnly />
            <ProtectedRoute path="/admin/templates/:templateId" component={AdminTemplateEdit} adminOnly />
            <ProtectedRoute path="/admin/templates" component={lazy(() => import("@/pages/admin/templates-simple"))} adminOnly />
            <ProtectedRoute path="/admin/templates/:templateId/static-fields" component={TemplateFieldsManager} adminOnly />
            <ProtectedRoute path="/admin/template-editor/:id" component={AdminTemplateEditor} adminOnly />
            <ProtectedRoute path="/admin/users" component={AdminUsers} adminOnly />
            <ProtectedRoute path="/admin/cards" component={AdminCards} adminOnly />
            <ProtectedRoute path="/admin/certificates" component={AdminCertificates} adminOnly />
            <ProtectedRoute path="/admin/certificate-templates" component={AdminCertificateTemplates} adminOnly />
            <ProtectedRoute path="/admin/bulk-certificates" component={AdminBulkCertificates} adminOnly />
            <ProtectedRoute path="/admin/font-management" component={FontManagement} adminOnly />
            <ProtectedRoute path="/admin/content-library" component={ContentLibrary} adminOnly />
            <ProtectedRoute path="/admin/color-palette-studio" component={ColorPaletteStudio} adminOnly />
            <ProtectedRoute path="/admin/settings" component={AdminSettings} adminOnly />
            <ProtectedRoute path="/admin/display-settings" component={AdminDisplaySettings} adminOnly />
            <ProtectedRoute path="/admin/settings/auth" component={AdminAuthSettings} adminOnly />
            <ProtectedRoute path="/admin/social-auth-settings" component={AdminSocialAuth} adminOnly />
            <ProtectedRoute path="/admin/seo-settings" component={AdminSeoSettings} adminOnly />
            <ProtectedRoute path="/admin/theme-settings" component={AdminThemeSettings} adminOnly />
            
            {/* 404 route */}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

// دالة لتسجيل أخطاء العميل إلى الخادم
const logClientError = async (error: Error, errorInfo: React.ErrorInfo) => {
  try {
    // بيانات الخطأ التي سيتم إرسالها إلى الخادم
    const errorData = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    // إرسال الخطأ إلى نقطة نهاية مخصصة على الخادم
    await fetch('/api/log-client-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorData),
      // تجاهل الاستجابة لأننا لا نريد تعطيل واجهة المستخدم
      keepalive: true
    });

    // تسجيل في وحدة تحكم المتصفح أيضًا في وضع التطوير
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR_LOGGER]', error, errorInfo);
    }
  } catch (logError) {
    // تجاهل أي أخطاء في عملية التسجيل نفسها
    console.warn('فشل في تسجيل الخطأ:', logError);
  }
};

// عرض رسالة خطأ مخصصة لحدود الخطأ
const ErrorFallback = () => (
  <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
    <div className="mb-4 rounded-full bg-red-100 p-4">
      <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2 className="mb-2 text-2xl font-bold text-red-600">حدث خطأ في التطبيق</h2>
    <p className="mb-4 text-gray-600">نعتذر عن هذا الخطأ. يرجى تحديث الصفحة أو العودة للصفحة الرئيسية.</p>
    <button 
      onClick={() => window.location.href = '/'}
      className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
    >
      العودة للصفحة الرئيسية
    </button>
  </div>
);

// تكوين معالج الأخطاء العام
window.addEventListener('error', function(event) {
  console.error('خطأ عام:', event.error || event.message);
  
  // تسجيل الخطأ العام إلى الخادم
  if (event.error instanceof Error) {
    logClientError(event.error, { componentStack: '' });
  } else {
    logClientError(new Error(event.message || 'خطأ غير معروف'), { componentStack: '' });
  }
});

// تكوين معالج الوعود غير المعالجة
window.addEventListener('unhandledrejection', function(event) {
  console.error('وعد غير معالج:', event.reason);
  
  // تسجيل الوعد غير المعالج إلى الخادم
  if (event.reason instanceof Error) {
    logClientError(event.reason, { componentStack: '' });
  } else {
    logClientError(new Error(String(event.reason) || 'وعد غير معالج'), { componentStack: '' });
  }
});

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />} onError={logClientError}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <CustomThemeProvider defaultTheme="default" defaultDarkMode="light" storageKey="certificate-theme">
            <TooltipProvider>
              <I18nProvider>
                <AuthProvider>
                  <SEO />
                  <Toaster />
                  <Router />
                  <AccessLayers />
                </AuthProvider>
              </I18nProvider>
            </TooltipProvider>
          </CustomThemeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
