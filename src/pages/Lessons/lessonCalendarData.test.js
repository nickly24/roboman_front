import { addDays, calendarRequestPeriod, fetchCalendarLessons, inPeriod, lessonTopic, localDateKey, localDateTime, monthBounds, startOfWeek, totalsFor } from './lessonCalendarData';
import apiClient from '../../services/api';
jest.mock('../../services/api', () => ({ get: jest.fn() }));
afterEach(() => jest.clearAllMocks());

test('calendar loads adjoining days, while monthly totals and invoices exclude them', () => {
  const week = startOfWeek(new Date(2026, 8, 1));
  const range = calendarRequestPeriod('2026-09', week);
  expect(localDateKey(range.start)).toBe('2026-08-31');
  expect(localDateKey(range.end)).toBe('2026-10-01');
  const { start, end } = monthBounds('2026-09');
  const lessons = [{ starts_at: new Date(2026, 7, 31, 12), revenue: 100, paid_children: 1 }, { starts_at: new Date(2026, 8, 1, 12), revenue: '500', teacher_salary: '200', paid_children: '2', trial_children: '1' }];
  expect(totalsFor(lessons.filter(lesson => inPeriod(lesson, start, end)))).toEqual({ count: 1, helpCount: 0, paid: 2, trial: 1, revenue: 500, salary: 200 });
  const lastWeek = calendarRequestPeriod('2026-09', new Date(2026, 8, 28));
  expect(localDateKey(lastWeek.end)).toBe('2026-10-05');
});

test('help contributes salary without creating attendance, revenue or teaching lessons', () => {
  const help = { lesson_type: 'HELP', teacher_salary: '500', help_rate_snapshot: 500 };
  expect(lessonTopic(help)).toBe('Помощь');
  expect(totalsFor([{ revenue: 1000, teacher_salary: 300, paid_children: 2 }, help])).toEqual({ count: 1, helpCount: 1, paid: 2, trial: 0, revenue: 1000, salary: 800 });
});

test.each(['PLAN', 'REPEAT', 'SKIP_TO_NEXT'])('%s keeps the actual curriculum lesson title for creative lessons', curriculum_mode => {
  expect(lessonTopic({ curriculum_mode, is_creative: true, curriculum_lesson_name: 'Мотоцикл' })).toBe('Мотоцикл');
  expect(lessonTopic({ curriculum_mode, instruction_name: 'Инструкция мотора', curriculum_lesson_name: 'Мотоцикл' })).toBe('Мотоцикл');
});

test('off-plan titles describe what was conducted rather than the replaced curriculum lesson', () => {
  expect(lessonTopic({ curriculum_mode: 'OFF_PLAN_REPLACE', instruction_name: 'Карусель', curriculum_lesson_name: 'Мотоцикл' })).toBe('Карусель');
  expect(lessonTopic({ curriculum_mode: 'OFF_PLAN_PAUSE', is_creative: true, curriculum_lesson_name: 'Мотоцикл' })).toBe('Творческое занятие');
});

test('week navigation crosses years and form time retains local hours', () => {
  expect(localDateKey(addDays(startOfWeek(new Date(2026, 0, 1)), -7))).toBe('2025-12-22');
  expect(localDateTime(new Date(2026, 8, 11, 15, 30))).toBe('2026-09-11T15:30');
});

test('loads all calendar pages with the same filters and request boundaries', async () => {
  apiClient.get.mockImplementation(async url => ({ data: { ok: true, data: { items: url.includes('offset=0') ? Array.from({ length: 500 }, (_, id) => ({ id })) : [{ id: 500 }] } } }));
  const signal = new AbortController().signal;
  const lessons = await fetchCalendarLessons('2026-09', new Date(2026, 8, 28), { department_id: '2' }, signal);
  expect(lessons).toHaveLength(501);
  const params = new URLSearchParams(apiClient.get.mock.calls[1][0].split('?')[1]);
  expect(params.get('end')).toBe('2026-10-05T00:00:00');
  expect(params.get('department_id')).toBe('2');
  expect(params.get('offset')).toBe('500');
});
