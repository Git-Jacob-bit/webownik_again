import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL, withCredentials: true });

const getCookie = name => document.cookie
  .split('; ')
  .find(row => row.startsWith(`${name}=`))
  ?.split('=')
  .slice(1)
  .join('=');

const csrfHeaders = () => {
  const token = getCookie('webownik_csrf');
  return token ? { 'X-CSRF-Token': decodeURIComponent(token) } : {};
};

let refreshPromise = null;
const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = axios.post(`${baseURL}/auth/refresh`, {}, {
      withCredentials: true,
      headers: csrfHeaders(),
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

api.interceptors.request.use(config => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    Object.assign(config.headers, csrfHeaders());
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    const isAuthEntry = ['/auth/token', '/auth/register', '/auth/forgot-password', '/auth/reset-password-confirm']
      .some(path => original?.url?.includes(path));
    if (error.response?.status === 401 && !original?._retried && !isAuthEntry) {
      try {
        original._retried = true;
        await refreshSession();
        Object.assign(original.headers, csrfHeaders());
        return api(original);
      } catch {
        if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
