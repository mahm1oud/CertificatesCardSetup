import { useEffect, useState } from 'react';
import { useAuth } from './use-auth';
import { apiRequest } from '@/lib/queryClient-simple';

interface SessionData {
  formData?: Record<string, any>;
  currentPage?: string;
  timestamp?: number;
  certificateProgress?: {
    templateId?: number;
    formData?: Record<string, any>;
    step?: number;
  };
}

export function useSessionRecovery() {
  const { user } = useAuth();
  const [recoveredData, setRecoveredData] = useState<SessionData | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Save session data to localStorage with user-specific key
  const saveSessionData = (data: Partial<SessionData>) => {
    if (!user?.id) return;
    
    const sessionKey = `session_${user.id}`;
    const existingData = getStoredSessionData();
    const updatedData = {
      ...existingData,
      ...data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(sessionKey, JSON.stringify(updatedData));
  };

  // Get stored session data
  const getStoredSessionData = (): SessionData | null => {
    if (!user?.id) return null;
    
    const sessionKey = `session_${user.id}`;
    const stored = localStorage.getItem(sessionKey);
    
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored);
      // Check if data is not too old (24 hours)
      const isExpired = Date.now() - (data.timestamp || 0) > 24 * 60 * 60 * 1000;
      
      if (isExpired) {
        localStorage.removeItem(sessionKey);
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  };

  // Clear session data
  const clearSessionData = () => {
    if (!user?.id) return;
    
    const sessionKey = `session_${user.id}`;
    localStorage.removeItem(sessionKey);
    setRecoveredData(null);
  };

  // Auto-save form data
  const autoSaveFormData = (formData: Record<string, any>, context?: string) => {
    saveSessionData({
      formData,
      currentPage: window.location.pathname,
      certificateProgress: context === 'certificate' ? {
        formData,
        templateId: formData.templateId,
        step: formData.currentStep
      } : undefined
    });
  };

  // Recover session on login/page load
  useEffect(() => {
    if (user?.id && !recoveredData && !isRecovering) {
      setIsRecovering(true);
      
      const stored = getStoredSessionData();
      if (stored) {
        setRecoveredData(stored);
        
        // Optional: Show recovery notification
        setTimeout(() => {
          setIsRecovering(false);
        }, 1000);
      } else {
        setIsRecovering(false);
      }
    }
  }, [user?.id]);

  // Clear session data on logout
  useEffect(() => {
    if (!user) {
      setRecoveredData(null);
    }
  }, [user]);

  // Periodic auto-save for active forms
  useEffect(() => {
    const interval = setInterval(() => {
      // Auto-save any active form data every 30 seconds
      const forms = document.querySelectorAll('form[data-auto-save]');
      forms.forEach((form) => {
        const formData = new FormData(form as HTMLFormElement);
        const data: Record<string, any> = {};
        
        formData.forEach((value, key) => {
          data[key] = value;
        });
        
        if (Object.keys(data).length > 0) {
          autoSaveFormData(data);
        }
      });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

  return {
    recoveredData,
    isRecovering,
    saveSessionData,
    clearSessionData,
    autoSaveFormData,
    hasRecoveredData: Boolean(recoveredData && Object.keys(recoveredData).length > 0)
  };
}