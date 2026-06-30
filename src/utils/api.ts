const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('inventory_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('inventory_auth_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('inventory_auth_token');
}

export function getSavedUser(): any | null {
  const user = localStorage.getItem('inventory_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setSavedUser(user: any) {
  localStorage.setItem('inventory_user', JSON.stringify(user));
}

export function removeSavedUser() {
  localStorage.removeItem('inventory_user');
}

// Request Helper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(text || 'Internal server error');
  }

  if (!response.ok) {
    throw new Error(json.message || 'An error occurred');
  }

  return json as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' })
};
