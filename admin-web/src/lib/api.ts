import axios, { AxiosError } from 'axios';
import { useAuth } from '../store/auth';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, try a single refresh then retry; otherwise log out.
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const { refreshToken, setTokens, logout } = useAuth.getState();

    if (error.response?.status === 401 && original && !original._retry && refreshToken) {
      original._retry = true;
      try {
        refreshing ??= api
          .post('/auth/refresh', { refreshToken })
          .then(({ data }) => {
            setTokens(data.accessToken, data.refreshToken);
            return data.accessToken as string;
          })
          .catch(() => {
            logout();
            return null;
          })
          .finally(() => {
            refreshing = null;
          });
        const newToken = await refreshing;
        if (newToken) {
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        logout();
      }
    }
    return Promise.reject(error);
  },
);

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) return err.response?.data?.message ?? err.message;
  return 'Something went wrong';
}
