import { addDays, endTime, filterEvents, monday, monthWeeks } from './calendarData';
test('weekly keys cross month and year boundaries without changing wall-clock dates', () => {
  expect(monday('2027-01-01')).toBe('2026-12-28');
  expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
  expect(monthWeeks('2026-09')).toEqual(['2026-08-31','2026-09-07','2026-09-14','2026-09-21','2026-09-28']);
  expect(endTime({ starts_at: '2026-09-11T11:15:00', duration_minutes: 55 })).toBe('12:10');
});
test('teacher filter includes both planned and replacement teacher', () => {
  const item = { branch_id: 1, department_id: 1, planned_teacher_id: 4, confirmed_teacher_id: 8 };
  expect(filterEvents([item], { teacher_id: '8' })).toEqual([item]);
  expect(filterEvents([item], { teacher_id: '4' })).toEqual([item]);
  expect(filterEvents([item], { branch_id: '2' })).toEqual([]);
  const recorded = { ...item, learning: { kind: 'actual', teacher_id: 10 } };
  expect(filterEvents([recorded], { teacher_id: '10' })).toEqual([recorded]);
});
