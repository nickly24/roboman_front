/**
 * Сервис для работы с CRM чатами.
 * Вынесено для переиспользования (отправка сообщений, будущий агент по нескольким чатам и т.д.).
 */
import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

/**
 * Отправить сообщение в чат CRM.
 * @param {number|string} chatId - ID чата
 * @param {string} content - Текст сообщения
 * @returns {Promise<object>} - Ответ API с данными сообщения
 */
export async function sendChatMessage(chatId, content) {
  const res = await apiClient.post(API_ENDPOINTS.CRM_CHAT_MESSAGES(chatId), { content });
  if (!res.data?.ok) {
    throw new Error(res.data?.error?.message || 'Ошибка отправки');
  }
  return res.data;
}
