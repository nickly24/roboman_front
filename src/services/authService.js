import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

export const authService = {
  async login(login, password) {
    const response = await apiClient.post(API_ENDPOINTS.LOGIN, {
      login,
      password,
    });
    
    if (response.data.ok) {
      const { token, role, user, profile } = response.data.data;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify({ role, user, profile }));
      return { token, role, user, profile };
    }
    
    throw new Error(response.data.error?.message || 'Ошибка авторизации');
  },

  async logout() {
    try {
      await apiClient.post(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  },

  async getCurrentUser() {
    const response = await apiClient.get(API_ENDPOINTS.ME);
    if (response.data.ok) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Ошибка получения данных пользователя');
  },

  getStoredUser() {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  getToken() {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated() {
    return !!this.getToken();
  },
};
