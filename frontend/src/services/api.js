import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 429 && err.response?.data?.upgradeUrl) {
      window.dispatchEvent(new CustomEvent('lucred:plan-limit'));
      // Dynamically import toast to avoid circular deps
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(`Monthly API limit reached (${err.response.data.used}/${err.response.data.limit} calls). Upgrade to continue.`, { duration: 5000 });
      });
    }
    return Promise.reject(err);
  }
);

export default api;
