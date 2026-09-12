import { formatWallDate, formatWallDateTime, wallDateKey, wallDateTime, wallTime, wallWeekday } from './wallClock';
import { inPeriod, localDateTime, monthBounds } from '../pages/Lessons/lessonCalendarData';
import { dayText, timeText } from '../pages/Calendar/calendarData';
import { localDate, localTime } from '../pages/Invoices/invoiceData';
import { summarizeLessons } from '../pages/Dashboard/dashboardData';

jest.mock('../services/api', () => ({ get: jest.fn() }));

// Run this suite with TZ=UTC, Europe/Moscow and America/Los_Angeles.
test.each([
  ['2026-09-12T16:00:00', '12.09.2026', '16:00', 6],
  ['2026-09-01T00:30:00', '01.09.2026', '00:30', 2],
  ['2026-09-30T23:45:00', '30.09.2026', '23:45', 3],
  // This local time does not exist in Los Angeles on its DST transition day.
  ['2026-03-08T02:30:00', '08.03.2026', '02:30', 0],
])('lesson %s keeps its entered date and time on every screen', (value, date, time, weekday) => {
  expect(wallTime(value)).toBe(time);
  expect(wallDateKey(value)).toBe(value.slice(0, 10));
  expect(wallDateTime(value)).toBe(value);
  expect(localDateTime(value)).toBe(value.slice(0, 16));
  expect(formatWallDateTime(value)).toBe(`${date}, ${time}`);
  expect(wallWeekday(value)).toBe(weekday);
  expect(timeText(value)).toBe(time);
  expect(localTime(value)).toBe(time);
  expect(dayText(value, { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe(date);
  expect(localDate(value, { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe(date);
});

test('month boundaries and dashboard totals use the entered date', () => {
  const lessons = [
    { starts_at: '2026-08-31T23:45:00', revenue: 100 },
    { starts_at: '2026-09-01T00:30:00', revenue: 200 },
    { starts_at: '2026-09-30T23:45:00', revenue: 300 },
    { starts_at: '2026-10-01T00:00:00', revenue: 400 },
  ];
  const { start, end } = monthBounds('2026-09');
  const included = lessons.filter(lesson => inPeriod(lesson, start, end));
  expect(included).toEqual(lessons.slice(1, 3));
  expect(summarizeLessons(included).months).toEqual([expect.objectContaining({ id: '2026-09', revenue: 500, count: 2 })]);
});

test('formatting never converts suffixes or a date-only value to the device timezone', () => {
  expect(formatWallDate('2026-09-01')).toBe('01.09.2026');
  for (const suffix of ['Z', '+03:00', '-07:00']) {
    expect(formatWallDateTime(`2026-09-01T00:30:00${suffix}`)).toBe('01.09.2026, 00:30');
  }
  expect(formatWallDate(null)).toBe('');
  expect(wallTime('invalid')).toBe('');
});
