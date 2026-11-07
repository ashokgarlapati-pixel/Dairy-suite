import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Bearer Token if present
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dairy_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardize response unwrapping & 401 handling
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('dairy_auth_token');
        localStorage.removeItem('dairy_auth_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;

