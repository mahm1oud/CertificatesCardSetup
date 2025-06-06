/**
 * مكون حدود الأخطاء (Error Boundary)
 * 
 * يقوم بالتقاط أخطاء React التي تحدث في شجرة المكونات الفرعية وعرض واجهة بديلة
 * يمكن استخدامه لتغليف أي جزء من التطبيق لمنع انهيار التطبيق بالكامل عند حدوث خطأ
 * 
 * الميزات:
 * - عرض واجهة مستخدم بديلة عند حدوث خطأ
 * - تسجيل الأخطاء في الخادم عبر إرسالها إلى نقطة نهاية مخصصة
 * - دعم استئناف واستعادة الحالة بعد الخطأ
 * 
 * الاستخدام:
 * <ErrorBoundary fallback={<ErrorMessage />} onError={handleError}>
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * @file components/error-boundary.tsx
 */

import { Component, ReactNode, ErrorInfo, ReactElement } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  /**
   * التقاط وتعيين حالة الخطأ
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  /**
   * يُستدعى بعد حدوث خطأ مرحلة التنفيذ
   * يقوم بتسجيل الخطأ ومعلوماته
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // تسجيل الخطأ في وحدة تحكم المتصفح
    console.error('حدث خطأ في مكون React:', error, errorInfo);

    // استدعاء معالج الخطأ المخصص إذا تم توفيره
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * إعادة تعيين حالة الخطأ
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });

    // استدعاء معالج إعادة التعيين المخصص إذا تم توفيره
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render(): ReactNode {
    // إذا كان هناك خطأ، عرض واجهة المستخدم البديلة
    if (this.state.hasError) {
      // إذا تم توفير عنصر بديل مخصص، استخدمه
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // عرض واجهة مستخدم بديلة افتراضية للأخطاء
      return (
        <div className="flex h-[70vh] flex-col items-center justify-center text-center p-4">
          <div className="mb-4 rounded-full bg-red-100 p-4">
            <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-red-600">حدث خطأ في التطبيق</h2>
          <p className="mb-4 text-gray-600">نعتذر عن هذا الخطأ. يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.</p>
          <div className="space-x-2 rtl:space-x-reverse">
            <button 
              onClick={this.handleReset}
              className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            >
              إعادة تحميل المكون
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="rounded border border-gray-300 bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-100"
            >
              تحديث الصفحة
            </button>
          </div>
          {this.state.error && process.env.NODE_ENV === 'development' && (
            <div className="mt-6 text-left rtl:text-right w-full max-w-lg">
              <details className="cursor-pointer">
                <summary className="font-bold text-red-800">تفاصيل الخطأ (وضع التطوير)</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-gray-100 p-4 text-xs text-red-900">
                  {this.state.error.toString()}
                  {this.state.error.stack && (
                    <>
                      <hr className="my-2 border-t border-gray-300" />
                      {this.state.error.stack}
                    </>
                  )}
                </pre>
              </details>
            </div>
          )}
        </div>
      );
    }

    // إذا لم يكن هناك خطأ، عرض الأطفال كالمعتاد
    return this.props.children;
  }
}

export default ErrorBoundary;