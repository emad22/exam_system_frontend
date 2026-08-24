import { defineStore } from 'pinia';
import { ref } from 'vue';
import { parseApiError } from '@/utils/errorHandler';

export interface ToastMessage {
  id?: string;
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail: string;
  life?: number;
}

// Global emitter for PrimeVue Toast integration without needing inject()
type ToastListener = (toast: ToastMessage) => void;
const listeners: Set<ToastListener> = new Set();

export const registerToastListener = (listener: ToastListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitToast = (toast: ToastMessage) => {
  listeners.forEach(listener => listener(toast));
};

export const useNotificationStore = defineStore('notification', () => {
  const toasts = ref<ToastMessage[]>([]);

  const show = (toast: ToastMessage) => {
    const toastItem: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      life: toast.life ?? 4000,
      ...toast
    };

    toasts.value.push(toastItem);
    emitToast(toastItem);

    if (toasts.value.length > 20) {
      toasts.value.shift();
    }
  };

  const showSuccess = (summary?: string, detail?: string) => {
    show({
      severity: 'success',
      summary: summary || 'Success',
      detail: detail || 'Operation completed successfully.',
      life: 3500
    });
  };

  const showError = (error: any, customSummary?: string, customDetail?: string) => {
    const parsed = parseApiError(error);
    show({
      severity: 'error',
      summary: customSummary || parsed.title,
      detail: customDetail || parsed.message,
      life: 5000
    });
  };

  const showWarning = (summary: string, detail?: string) => {
    show({
      severity: 'warn',
      summary,
      detail: detail || '',
      life: 4000
    });
  };

  const showInfo = (summary: string, detail?: string) => {
    show({
      severity: 'info',
      summary,
      detail: detail || '',
      life: 3500
    });
  };

  const clear = () => {
    toasts.value = [];
  };

  return {
    toasts,
    show,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clear
  };
});
