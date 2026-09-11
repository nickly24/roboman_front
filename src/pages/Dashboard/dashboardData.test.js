import apiClient from '../../services/api';
import { chartSeries, lessonRevenue, loadDashboardData, periodParams, summarizeLessons } from './dashboardData';
jest.mock('../../services/api', () => ({ get: jest.fn() }));
afterEach(() => jest.clearAllMocks());

test('a cross-year range includes its last month and keeps all filters', () => {
  const params = periodParams({ start: '2025-11', end: '2026-01' }, { branch_id: '3', teacher_id: '', department_id: '2' });
  expect(Object.fromEntries(params)).toEqual({ start: '2025-11-01T00:00:00', end: '2026-02-01T00:00:00', branch_id: '3', department_id: '2' });
});

test('zero revenue stays zero and numeric strings do not concatenate', () => {
  const lessons = [{ id: 1, starts_at: '2026-09-01T12:00:00', branch_id: 1, teacher_id: 1, revenue: '0', price_snapshot: 500, paid_children: '2', trial_children: '1', teacher_salary: '200' }, { id: 2, starts_at: '2026-09-02T12:00:00', branch_id: 1, teacher_id: 1, revenue: '500', paid_children: '1', trial_children: '0', teacher_salary: '100' }];
  expect(lessonRevenue(lessons[0])).toBe(0);
  const result = summarizeLessons(lessons);
  expect(result.salary).toBe(300);
  expect(result.branches[0]).toMatchObject({ revenue: 500, profit: 200, paid: 3, trial: 1, count: 2 });
  expect(chartSeries(result.days, true).map(row => row.profit)).toEqual([-200, 200]);
});

test('loads every lesson page, including records after the first 500', async () => {
  const signal = new AbortController().signal;
  apiClient.get.mockImplementation(async url => url.startsWith('/dashboard') ? { data: { ok: true, data: { kpi: { revenue_sum: 501 } } } } : { data: { ok: true, data: { items: url.includes('offset=0') ? Array.from({ length: 500 }, (_, id) => ({ id })) : [{ id: 500 }] } } });
  const data = await loadDashboardData({ start: '2026-01', end: '2026-01' }, { branch_id: '7' }, signal);
  expect(data.lessons).toHaveLength(501);
  expect(apiClient.get).toHaveBeenCalledWith('/lessons?month=2026-01&branch_id=7&limit=500&offset=500', { signal });
});

test('a failed lesson page fails the report instead of showing partial profit', async () => {
  apiClient.get.mockImplementation(async url => url.startsWith('/dashboard') ? { data: { ok: true, data: { kpi: {} } } } : { data: { ok: false } });
  await expect(loadDashboardData({ start: '2026-01', end: '2026-01' }, {}, new AbortController().signal)).rejects.toThrow();
});
