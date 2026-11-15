import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de requisição: insere o Bearer Token
http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('totvs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de resposta: 401 limpa sessão; 403 PASSWORD_CHANGE_REQUIRED redireciona para troca obrigatória
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('totvs_token');
      sessionStorage.removeItem('totvs_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (
      error.response &&
      error.response.status === 403 &&
      error.response.data?.code === 'PASSWORD_CHANGE_REQUIRED'
    ) {
      if (window.location.pathname !== '/force-change-password') {
        window.location.href = '/force-change-password';
      }
    }
    return Promise.reject(error);
  }
);

export default http;
