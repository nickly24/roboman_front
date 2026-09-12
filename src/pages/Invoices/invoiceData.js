/* global BigInt */
import { formatWallDate, wallTime } from '../../utils/wallClock';
export { currentPeriod, validPeriod, periodName, money, errorText } from '../Accounting/accountingData';
export const invoiceStatuses = {
  draft: { label: 'Черновик', tone: 'muted', icon: 'edit' },
  issued: { label: 'К оплате', tone: 'info', icon: 'invoice' },
  payment_reported: { label: 'Проверка оплаты', tone: 'warning', icon: 'clock' },
  paid: { label: 'Оплачен', tone: 'success', icon: 'check' },
  cancelled: { label: 'Отменён', tone: 'muted', icon: 'close' },
};
export const invoiceNumber = invoice => invoice?.number || `Черновик № ${invoice?.id || '—'}`;
export const localDate = (value, options = {}) => formatWallDate(value, { day: 'numeric', month: 'short', ...options }) || '—';
export const localTime = value => wallTime(value) || '—';
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const overdue = invoice => ['issued', 'payment_reported'].includes(invoice.status) && invoice.due_date && invoice.due_date.slice(0, 10) < today();
// Match the API's Decimal ROUND_HALF_UP without binary floating point multiplication.
const cents = value => {
  let text = String(value ?? 0).trim();
  if (/[eE]/.test(text)) text = Number(text).toFixed(8);
  const match = text.match(/^(-?)(\d*)(?:\.(\d*))?$/);
  if (!match || (!match[2] && !match[3])) return BigInt(0);
  const fraction = (match[3] || '').padEnd(3, '0');
  const amount = BigInt(match[2] || '0') * BigInt(100) + BigInt(fraction.slice(0, 2)) + BigInt(Number(fraction[2]) >= 5 ? 1 : 0);
  return match[1] ? -amount : amount;
};
export const lineAmount = item => {
  const product = cents(item.quantity) * cents(item.unit_price), negative = product < BigInt(0);
  const rounded = ((negative ? -product : product) + BigInt(50)) / BigInt(100);
  return Number(negative ? -rounded : rounded) / 100;
};
export const sumLines = items => Number(items.reduce((sum, item) => sum + cents(lineAmount(item)), BigInt(0))) / 100;
export const lessonTitle = lesson => lesson.curriculum_lesson_name || lesson.instruction_name || (lesson.is_creative ? 'Творческое занятие' : 'Занятие по робототехнике');
export function filterInvoices(items, { search = '', status = '', month = '' } = {}) {
  const q = search.trim().toLocaleLowerCase('ru');
  return items.filter(i => (!status || i.status === status) && (!month || i.month === month) && (!q || [i.number, i.title, i.branch_name, i.total_amount].join(' ').toLocaleLowerCase('ru').includes(q)));
}
