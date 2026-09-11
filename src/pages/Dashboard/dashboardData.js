import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

export const number = value => Number(value) || 0;
export const lessonRevenue = lesson => lesson.revenue != null ? number(lesson.revenue) : number(lesson.price_snapshot) * number(lesson.paid_children);
export const itemsFrom = response => {
  if (!response.data?.ok) throw new Error('Не удалось получить данные');
  const data = response.data.data;
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
};
export function periodParams(period, filters = {}) {
  const params = new URLSearchParams();
  if (period.start === period.end) params.set('month', period.start);
  else {
    params.set('start', `${period.start}-01T00:00:00`);
    const [year, month] = period.end.split('-').map(Number);
    const next = new Date(Date.UTC(year, month, 1));
    params.set('end', next.toISOString().slice(0, 19));
  }
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params;
}
export async function loadDashboardData(period, filters, signal) {
  const params = periodParams(period, filters);
  const allLessons = async () => {
    const result = [];
    for (let offset = 0; ; offset += 500) {
      const page = itemsFrom(await apiClient.get(`${API_ENDPOINTS.LESSONS}?${params}&limit=500&offset=${offset}`, { signal }));
      result.push(...page);
      if (page.length < 500) return result;
    }
  };
  const [response, lessons] = await Promise.all([
    apiClient.get(`${API_ENDPOINTS.DASHBOARD_OWNER}?${params}`, { signal }), allLessons(),
  ]);
  if (!response.data?.ok) throw new Error('Не удалось получить данные');
  return { ...response.data.data, lessons };
}
export function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function summarizeLessons(lessons) {
  const branches = new Map(), teachers = new Map(), days = new Map(), months = new Map();
  let salary = 0;
  lessons.forEach(lesson => {
    const revenue = lessonRevenue(lesson), pay = number(lesson.teacher_salary);
    const paid = number(lesson.paid_children), trial = number(lesson.trial_children);
    salary += pay;
    const key = dateKey(lesson.starts_at);
    const add = (map, id, name) => {
      if (!map.has(id)) map.set(id, { id, name, revenue: 0, salary: 0, profit: 0, paid: 0, trial: 0, count: 0, lessons: [] });
      const row = map.get(id);
      row.revenue += revenue; row.salary += pay; row.profit += revenue - pay;
      row.paid += paid; row.trial += trial; row.count += 1; row.lessons.push(lesson);
    };
    add(branches, String(lesson.branch_id), lesson.branch_name || 'Без филиала');
    add(teachers, String(lesson.teacher_id), lesson.teacher_name || 'Без преподавателя');
    if (key) { add(days, key, key); add(months, key.slice(0, 7), key.slice(0, 7)); }
  });
  const sorted = map => [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
  // Preserve actual calendar spacing; a day without lessons contributes zero.
  const daily = sorted(days), calendar = [];
  if (daily.length) {
    const cursor = new Date(`${daily[0].id}T12:00:00`);
    const end = daily[daily.length - 1].id;
    while (dateKey(cursor) <= end) {
      const id = dateKey(cursor);
      calendar.push(days.get(id) || { id, revenue: 0, salary: 0, profit: 0, count: 0, paid: 0, trial: 0, lessons: [] });
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return { salary, branches: [...branches.values()], teachers: [...teachers.values()], days: calendar, months: sorted(months) };
}
export function chartSeries(rows, cumulative) {
  let revenue = 0, salary = 0, profit = 0;
  return rows.map(row => {
    revenue += row.revenue; salary += row.salary; profit += row.profit;
    return cumulative ? { ...row, revenue, salary, profit } : row;
  });
}
export const monthLabel = (month, short = false) => new Date(`${month}-01T12:00:00`).toLocaleDateString('ru-RU', { month: short ? 'short' : 'long', year: 'numeric' }).replace(' г.', '');
export const periodLabel = period => period.start === period.end ? monthLabel(period.start) : `${monthLabel(period.start, true)} — ${monthLabel(period.end, true)}`;
export function shiftMonth(month, amount) {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function countLabel(value, forms) {
  const n = Math.abs(value) % 100, last = n % 10;
  return `${value} ${forms[n > 10 && n < 20 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2]}`;
}
