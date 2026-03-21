import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

// Get token from localStorage
const getToken = () => localStorage.getItem('wealthos_token');

// Generic fetch with auth
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  };
  
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (response.status === 401) {
    localStorage.removeItem('wealthos_token');
    localStorage.removeItem('wealthos_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

// Hook for async data fetching
export function useAsync(asyncFn, immediate = true) {
  const [state, setState] = useState({
    data: null,
    loading: immediate,
    error: null
  });
  
  const execute = useCallback(async (...args) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await asyncFn(...args);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState(s => ({ ...s, loading: false, error: error.message }));
      throw error;
    }
  }, [asyncFn]);
  
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, []);
  
  return { ...state, execute, refetch: execute };
}

// Convenience hooks
export function useFetch(endpoint, options = {}) {
  const { immediate = true, ...fetchOptions } = options;
  
  return useAsync(
    useCallback(() => apiFetch(endpoint, fetchOptions), [endpoint]),
    immediate
  );
}

// API methods
export const api = {
  get: (endpoint) => apiFetch(endpoint),
  post: (endpoint, body) => apiFetch(endpoint, { method: 'POST', body }),
  patch: (endpoint, body) => apiFetch(endpoint, { method: 'PATCH', body }),
  delete: (endpoint) => apiFetch(endpoint, { method: 'DELETE' })
};

// Auth helpers
export const auth = {
  login: async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('wealthos_token', data.token);
    localStorage.setItem('wealthos_user', JSON.stringify(data.user));
    return data;
  },
  
  logout: () => {
    localStorage.removeItem('wealthos_token');
    localStorage.removeItem('wealthos_user');
    window.location.href = '/login';
  },
  
  getUser: () => {
    const user = localStorage.getItem('wealthos_user');
    return user ? JSON.parse(user) : null;
  },
  
  isAuthenticated: () => !!getToken()
};

export default api;
