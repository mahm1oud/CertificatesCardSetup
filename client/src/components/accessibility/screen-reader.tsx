import { useEffect, useRef } from 'react';

interface ScreenReaderProps {
  children: React.ReactNode;
  announcement?: string;
  priority?: 'polite' | 'assertive';
}

// Screen reader announcements component
export function ScreenReaderAnnouncement({ 
  announcement, 
  priority = 'polite' 
}: { 
  announcement: string; 
  priority?: 'polite' | 'assertive' 
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (announcement && ref.current) {
      ref.current.textContent = announcement;
    }
  }, [announcement]);

  return (
    <div
      ref={ref}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    />
  );
}

// Skip to main content link
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md transition-all"
    >
      تخطي إلى المحتوى الرئيسي
    </a>
  );
}

// Accessible form wrapper
export function AccessibleForm({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form 
      {...props}
      role="form"
      aria-label={props['aria-label'] || 'نموذج'}
    >
      {children}
    </form>
  );
}

// Accessible button with proper ARIA attributes
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  loadingText?: string;
}

export function AccessibleButton({ 
  children, 
  loading, 
  loadingText = 'جارٍ التحميل...', 
  disabled,
  ...props 
}: AccessibleButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      aria-describedby={loading ? 'loading-description' : undefined}
    >
      {loading ? loadingText : children}
      {loading && (
        <span id="loading-description" className="sr-only">
          العملية قيد التنفيذ، يرجى الانتظار
        </span>
      )}
    </button>
  );
}

// Accessible navigation landmarks
export function NavigationLandmark({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <nav role="navigation" aria-label={label}>
      {children}
    </nav>
  );
}

// Accessible main content wrapper
export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" role="main" tabIndex={-1}>
      {children}
    </main>
  );
}

// Live region for dynamic content updates
export function LiveRegion({ 
  children, 
  priority = 'polite' 
}: { 
  children: React.ReactNode; 
  priority?: 'polite' | 'assertive' 
}) {
  return (
    <div aria-live={priority} aria-atomic="true">
      {children}
    </div>
  );
}

// Accessible modal dialog
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function AccessibleModal({ isOpen, onClose, title, children }: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else {
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-md w-full mx-4"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <h2 id="modal-title" className="text-xl font-bold mb-4">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

// Focus management hook
export function useFocusManagement() {
  const focusRef = useRef<HTMLElement | null>(null);

  const setFocus = (element: HTMLElement | null) => {
    focusRef.current = element;
    element?.focus();
  };

  const restoreFocus = () => {
    focusRef.current?.focus();
  };

  return { setFocus, restoreFocus };
}