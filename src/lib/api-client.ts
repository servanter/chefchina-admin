/**
 * 统一的 API 客户端
 * 自动添加 Authorization header
 */

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiClient(url: string, options: RequestOptions = {}) {
  const { skipAuth, ...fetchOptions } = options;

  // 默认 headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 合并传入的 headers
  if (fetchOptions.headers) {
    const incomingHeaders = new Headers(fetchOptions.headers);
    incomingHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  // 自动添加 token
  if (!skipAuth) {
    const token = localStorage.getItem('admin_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // 401 自动跳转登录
  if (response.status === 401) {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
}

// 便捷方法
export const api = {
  get: (url: string, options?: RequestOptions) =>
    apiClient(url, { ...options, method: 'GET' }),
  
  post: (url: string, data?: any, options?: RequestOptions) =>
    apiClient(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  patch: (url: string, data?: any, options?: RequestOptions) =>
    apiClient(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  put: (url: string, data?: any, options?: RequestOptions) =>
    apiClient(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  delete: (url: string, options?: RequestOptions) =>
    apiClient(url, { ...options, method: 'DELETE' }),
};
