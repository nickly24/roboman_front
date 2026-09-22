import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

// Totals must include every record, including help outside the first page.
export async function fetchAllLessons(filters, options) {
  const params = new URLSearchParams(filters);
  params.set('limit', '500');
  const all = [];
  for (let offset = 0; ; offset += 500) {
    params.set('offset', String(offset));
    const response = await apiClient.get(`${API_ENDPOINTS.LESSONS}?${params}`, options);
    if (!response.data?.ok) throw new Error('Не удалось загрузить занятия');
    const data = response.data.data;
    const page = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : null;
    if (!page) throw new Error('Не удалось загрузить занятия');
    all.push(...page);
    if (page.length < 500) return all;
  }
}
