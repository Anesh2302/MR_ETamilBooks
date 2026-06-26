import api from './api';
import Router from 'next/router';

export const login = async (username: string, password: string) => {
  const res = await api.post('/api/auth/login', { username, password });
  return res.data;
};

export const register = async (data: {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  preferred_language?: string;
}) => {
  const res = await api.post('/api/auth/register', data);
  return res.data;
};

export const getMe = async () => {
  const res = await api.get('/api/auth/me');
  return res.data;
};

export const updateMe = async (data: { full_name?: string; preferred_language?: string }) => {
  const res = await api.put('/api/auth/me', data);
  return res.data;
};

export const isAuthenticated = () => {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('token');
  }
  return false;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  Router.push('/login');
};
