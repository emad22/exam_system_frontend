import axios from 'axios';
import { authStorage } from './authStorage';

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
    const headers = config.headers || {}
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-type') {
        delete headers[key]
      }
    }
    config.headers = headers
  }

  return config;
});

// Interceptor for handling 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
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
    }
    return Promise.reject(error);
  }
);

export default api;