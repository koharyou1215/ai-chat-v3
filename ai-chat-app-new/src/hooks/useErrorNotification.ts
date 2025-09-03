import { useCallback } from 'react';
import { toast } from 'sonner';

interface ErrorNotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useErrorNotification = () => {
  const showError = useCallback((
    error: Error | string,
    options: ErrorNotificationOptions = {}
  ) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const title = options.title || 'エラーが発生しました';
    
    // コンソールにもログ出力（デバッグ用）
    console.error('🚨 Error notification:', {
      title,
      message: errorMessage,
      error: typeof error === 'object' ? error : new Error(error)
    });
    
    toast.error(title, {
      description: options.description || errorMessage,
      duration: options.duration || 5000,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    });
  }, []);

  const showSuccess = useCallback((
    message: string,
    options: Omit<ErrorNotificationOptions, 'title'> = {}
  ) => {
    toast.success(message, {
      description: options.description,
      duration: options.duration || 3000
    });
  }, []);

  const showWarning = useCallback((
    message: string,
    options: Omit<ErrorNotificationOptions, 'title'> = {}
  ) => {
    toast.warning(message, {
      description: options.description,
      duration: options.duration || 4000
    });
  }, []);

  const showInfo = useCallback((
    message: string,
    options: Omit<ErrorNotificationOptions, 'title'> = {}
  ) => {
    toast.info(message, {
      description: options.description,
      duration: options.duration || 3000
    });
  }, []);

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo
  };
};


