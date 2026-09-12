// Lesson and calendar times are wall-clock values, not instants in a time zone.
// Never pass an API datetime string to new Date() or toISOString().
const pad = value => String(value).padStart(2, '0');

export function wallDateKey(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(String(value ?? ''))?.[1] || '';
}

export function wallTime(value) {
  if (value instanceof Date) return wallDateKey(value) ? `${pad(value.getHours())}:${pad(value.getMinutes())}` : '';
  return /^\d{4}-\d{2}-\d{2}[T ](\d{2}:\d{2})/.exec(String(value ?? ''))?.[1] || '';
}

export function wallDateTime(value) {
  const day = wallDateKey(value);
  if (!day) return '';
  const seconds = value instanceof Date ? pad(value.getSeconds()) : /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:(\d{2})/.exec(String(value))?.[1] || '00';
  return `${day}T${wallTime(value) || '00:00'}:${seconds}`;
}

// UTC is only a fixed carrier for formatting a calendar date and its weekday.
// The entered hours are never converted or interpreted as an instant.
function calendarDate(value) {
  const day = wallDateKey(value);
  return new Date(day ? `${day}T12:00:00Z` : NaN);
}

export function formatWallDate(value, options = {}) {
  const day = calendarDate(value);
  return Number.isNaN(day.getTime()) ? '' : day.toLocaleDateString('ru-RU', { ...options, timeZone: 'UTC' });
}

export const wallWeekday = value => calendarDate(value).getUTCDay();
export const formatWallDateTime = value => [formatWallDate(value), wallTime(value)].filter(Boolean).join(', ');
