import { formatWallDate, wallTime } from '../../utils/wallClock';

export const pad = value => String(value).padStart(2, '0');
export const dateObject = key => new Date(`${String(key).slice(0, 10)}T12:00:00`);
export const dateKey = value => `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
export const addDays = (key, days) => { const d = dateObject(key); d.setDate(d.getDate() + days); return dateKey(d); };
export const monday = key => addDays(key, -((dateObject(key).getDay() + 6) % 7));
export const moscowToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const timeText = wallTime;
export const dayText = (key, options = {}) => formatWallDate(key, { day: 'numeric', month: 'long', ...options });
export const weekText = week => `${dayText(week, { month: 'short' })} — ${dayText(addDays(week, 6), { month: 'short' })}`;
export const endTime = item => { const [h, m] = timeText(item.starts_at).split(':').map(Number); const total = h * 60 + m + Number(item.duration_minutes); return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`; };
export const eventUrl = item => item.is_journal_only ? `/calendar/recorded-lessons/${item.journal_lesson_id}` : `/calendar/occurrences/${item.series_id}/${item.week_start}`;
export const versionBody = item => ({ revision: item.revision, version_id: item.version_id });
export const statusInfo = {
  recorded: { label: 'Проведено', icon: 'check' },
  pending: { label: 'Ждём ответа', icon: 'clock' },
  confirmed: { label: 'Подтверждено', icon: 'check' },
  replacement: { label: 'Нужна замена', icon: 'replace' },
  cancelled: { label: 'Отменено', icon: 'close' },
};
export const errorMessage = error => error.response?.data?.error?.message || error.message || 'Не удалось сохранить. Попробуйте ещё раз.';
export function filterEvents(items, filters) {
  return items.filter(item => (!filters.branch_id || String(item.branch_id) === filters.branch_id)
    && (!filters.department_id || String(item.department_id) === filters.department_id)
    && (!filters.teacher_id || [item.planned_teacher_id, item.confirmed_teacher_id, item.learning?.kind === 'actual' ? item.learning.teacher_id : null].some(id => String(id) === filters.teacher_id)));
}
export function monthWeeks(month) {
  const start = monday(`${month}-01`), end = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0);
  const result = [];
  for (let week = start; week <= dateKey(end); week = addDays(week, 7)) result.push(week);
  return result;
}

export const lessonCount = n => `${n} ${n % 100 >= 11 && n % 100 <= 14 ? 'занятий' : n % 10 === 1 ? 'занятие' : n % 10 >= 2 && n % 10 <= 4 ? 'занятия' : 'занятий'}`;
