import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ── Token management ──

let accessToken: string | null = localStorage.getItem('openclaw-token');
let refreshToken: string | null = localStorage.getItem('openclaw-refresh-token');

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('openclaw-token', access);
  localStorage.setItem('openclaw-refresh-token', refresh);
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('openclaw-token');
  localStorage.removeItem('openclaw-refresh-token');
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ── Request interceptor: attach token ──

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ──

let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
        setTokens(newAccess, newRefresh);

        refreshQueue.forEach(({ resolve }) => resolve(newAccess));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        refreshQueue.forEach(({ reject }) => reject(refreshErr));
        refreshQueue = [];
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const message = error.response?.data?.error?.message || error.message || 'Unknown network error';
    console.error('[API Error]:', message);
    return Promise.reject(error);
  }
);

// ── SSE Helper for streaming responses ──

export async function fetchSSE(
  url: string,
  body: Record<string, unknown>,
  onChunk: (data: { content: string; messageId: string }) => void,
  onDone: (data: { messageId: string; usage?: { promptTokens: number; completionTokens: number } }) => void,
  onError?: (data: { code: string; message: string }) => void,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    throw new Error(`SSE request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        switch (currentEvent) {
          case 'chunk':
            onChunk(data);
            break;
          case 'done':
            onDone(data);
            break;
          case 'error':
            onError?.(data);
            break;
        }
        currentEvent = '';
      }
    }
  }
}
