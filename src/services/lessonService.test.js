import apiClient from './api';
import { fetchAllLessons } from './lessonService';

jest.mock('./api', () => ({ get: jest.fn() }));
afterEach(() => jest.clearAllMocks());

test('financial reports include help after the first page and retain report filters', async () => {
  const help = { id: 501, lesson_type: 'HELP', teacher_salary: 500 };
  apiClient.get.mockImplementation(async url => ({ data: { ok: true, data: { items: url.includes('offset=0') ? Array.from({ length: 500 }, (_, id) => ({ id })) : [help] } } }));
  const result = await fetchAllLessons({ month: '2026-09', department_id: '3' });
  expect(result).toHaveLength(501);
  expect(result[500]).toEqual(help);
  expect(apiClient.get.mock.calls[1][0]).toContain('month=2026-09&department_id=3&limit=500&offset=500');
});

test('a failed page cannot silently produce a partial salary total', async () => {
  apiClient.get.mockResolvedValueOnce({ data: { ok: true, data: { items: new Array(500).fill({}) } } }).mockResolvedValueOnce({ data: { ok: false } });
  await expect(fetchAllLessons({ month: '2026-09' })).rejects.toThrow('Не удалось загрузить занятия');
});
