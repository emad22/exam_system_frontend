import axios from 'axios';
import { authStorage } from './authStorage';
import { emitToast } from '@/stores/notification';
import { parseApiError } from '@/utils/errorHandler';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocal ? 'http://localhost:8000/api/v1' : `${window.location.origin}/api/v1`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor for Auth token
api.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    // Allow the browser/axios to set the correct multipart boundary
    const headers = config.headers || {};
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-type') {
        delete headers[key];
      }
    }
    config.headers = headers;
  }

  return config;
});

// Interceptor for handling API errors uniformly
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config = error.config || {};

    // 401 Unauthorized handling
    if (status === 401) {
      try {
        const sessionId = localStorage.getItem('active_proctoring_session_id');
        if (sessionId) {
          await api.post(`/proctoring/session/${sessionId}/end`, {
            close_reason: 'connection_lost'
          }).catch(() => {});
        }
      } catch (_) {}

      authStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (!config.skipGlobalToast) {
      // Global Toast Notification for 403, 404, 422, 429, 500, or Network errors
      const parsed = parseApiError(error);
      emitToast({
        severity: status && status < 500 ? 'warn' : 'error',
        summary: parsed.title,
        detail: parsed.message,
        life: status === 422 ? 5000 : 4000
      });
    }

    return Promise.reject(error);
  }
);

export default api;