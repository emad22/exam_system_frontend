import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.MODE === 'production' 
    ? 'https://alpt.arabacademy.com/api' // Production URL
    : 'http://localhost:8000/api',      // Local Development
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor for Auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;