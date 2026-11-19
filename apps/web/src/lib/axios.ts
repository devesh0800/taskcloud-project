import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to normalize URLs and attach Authorization header
apiClient.interceptors.request.use((config) => {
  if (config.url) {
    if (config.url.startsWith('/api/v1/')) {
      config.url = config.url.substring(7); // Remove '/api/v1'
    } else if (config.url.startsWith('api/v1/')) {
      config.url = config.url.substring(6); // Remove 'api/v1'
    } else if (config.url === '/api/v1') {
      config.url = '/';
    }
  }

  // Attach token from localStorage to guarantee auth even when third-party cookies are blocked (e.g. Incognito)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// Response interceptor for automatic refresh token rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt token refresh for login/register/refresh endpoints
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken =
          typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

        const refreshRes = await apiClient.post(
          '/auth/refresh',
          { refreshToken: storedRefreshToken },
          {
            headers: storedRefreshToken ? { 'x-refresh-token': storedRefreshToken } : undefined,
          }
        );

        if (typeof window !== 'undefined') {
          if (refreshRes.data?.accessToken) {
            localStorage.setItem('accessToken', refreshRes.data.accessToken);
          }
          if (refreshRes.data?.refreshToken) {
            localStorage.setItem('refreshToken', refreshRes.data.refreshToken);
          }
        }

        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          const path = window.location.pathname;
          const isProtected = ['/teacher', '/student', '/admin', '/profile', '/notifications'].some((p) =>
            path.startsWith(p)
          );
          if (isProtected) {
            window.location.href = '/login?session_expired=true';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

