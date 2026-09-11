import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
export const pad = value => String(value).padStart(2, '0');
export function localDateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export const localDateTime = value => { const d = new Date(value); return `${localDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const monthOf = value => localDateKey(value).slice(0, 7);
export function addDays(value, count) { const d = new Date(value); d.setDate(d.getDate() + count); return d; }
export function startOfWeek(value) { const d = new Date(value); d.setHours(0, 0, 0, 0); return addDays(d, -((d.getDay() + 6) % 7)); }
export const monthBounds = month => { const [y, m] = month.split('-').map(Number); return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) }; };
export const inPeriod = (lesson, start, end) => { const time = new Date(lesson.starts_at); return time >= start && time < end; };
export const totalsFor = lessons => lessons.reduce((total, lesson) => ({ count: total.count + 1, paid: total.paid + (Number(lesson.paid_children) || 0), trial: total.trial + (Number(lesson.trial_children) || 0), revenue: total.revenue + (Number(lesson.revenue) || 0), salary: total.salary + (Number(lesson.teacher_salary) || 0) }), { count: 0, paid: 0, trial: 0, revenue: 0, salary: 0 });
export const weekLabel = value => {
  const end = addDays(value, 6);
  if (value.getMonth() === end.getMonth()) return `${value.getDate()}–${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
  return `${value.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
};
export function weeksOfMonth(month) {
  const { start, end } = monthBounds(month), weeks = [];
  for (let week = startOfWeek(start); week < end; week = addDays(week, 7)) weeks.push(week);
  return weeks;
}
export function calendarRequestPeriod(month, week) {
  const { start, end } = monthBounds(month);
  return { start: week < start ? week : start, end: addDays(week, 7) > end ? addDays(week, 7) : end };
}
export async function fetchCalendarLessons(month, week, filters, signal) {
  const { start, end } = calendarRequestPeriod(month, week);
  const params = new URLSearchParams({ start: `${localDateKey(start)}T00:00:00`, end: `${localDateKey(end)}T00:00:00`, limit: '500', sort: 'starts_at', order: 'asc' });
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  const all = [];
  for (let offset = 0; ; offset += 500) {
    const response = await apiClient.get(`${API_ENDPOINTS.LESSONS}?${params}&offset=${offset}`, { signal });
    if (!response.data?.ok) throw new Error('Не удалось загрузить занятия');
    const data = response.data.data;
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : null;
    if (!items) throw new Error('Не удалось загрузить занятия');
    all.push(...items);
    if (items.length < 500) return all;
  }
}
export const lessonTopic = lesson => lesson.is_creative ? 'Творческое занятие' : lesson.instruction_name || (lesson.curriculum_mode?.startsWith('OFF_PLAN') ? 'Внеплановое занятие' : lesson.curriculum_lesson_name || 'Без инструкции');
export function teacherColor(lesson) {
  const raw = String(lesson.teacher_color || '').trim();
  return /^#?[0-9a-f]{6}$/i.test(raw) ? `#${raw.replace('#', '')}` : 'var(--color-secondary)';
}
