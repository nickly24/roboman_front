import { calcIncomeNet } from '../../utils/incomeCalc';
export { shiftMonth } from '../Dashboard/dashboardData';
export const currentPeriod = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit' }).format(new Date());
export const validPeriod = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '') && Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100;
export const periodName = value => { const label = new Date(`${value}-15T12:00:00`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', ''); return label[0].toUpperCase() + label.slice(1); };
export const sheetPeriod = sheet => `${sheet.year}-${String(sheet.month).padStart(2, '0')}`;
export const money = value => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value) || 0);
export const unpack = res => { if (!res.data?.ok) throw new Error(res.data?.error?.message || 'Не удалось выполнить запрос'); return res.data.data; };
export const errorText = err => err?.response?.data?.error?.message || err?.message || 'Не удалось загрузить данные';
export const operationTypes = { income: { label: 'Поступления', single: 'Поступление', description: 'Оплата от филиала', icon: 'income' }, salary: { label: 'Зарплата', single: 'Зарплата', description: 'Выплата преподавателю', icon: 'salary' }, expense: { label: 'Расходы', single: 'Расход', description: 'Закупки и другие затраты', icon: 'expense' }, transfer: { label: 'Переводы', single: 'Перевод', description: 'Между владельцами', icon: 'transfer' } };
export const salaryPeriod = value => ({ '1_15': '1–15 число', '16_end': '16–конец месяца', full: 'Весь месяц' })[value] || 'Весь месяц';
export const operationCount = data => ['incomes', 'salaries', 'expenses', 'transfers'].reduce((n, key) => n + (data?.[key]?.length || 0), 0);
export function ledger(data) {
  return Object.entries({ income: 'incomes', salary: 'salaries', expense: 'expenses', transfer: 'transfers' }).flatMap(([type, key]) => (data?.[key] || []).map(op => ({ ...op, type, key: `${type}-${op.id}`, title: type === 'income' ? op.branch_name : type === 'salary' ? op.teacher_name : type === 'expense' ? op.name : `${op.from_owner_name} → ${op.to_owner_name}`, party: type === 'transfer' ? 'Между владельцами' : op.owner_name, subtitle: type === 'salary' ? salaryPeriod(op.period_type) : type === 'income' ? `После удержаний ${money(calcIncomeNet(op))}` : operationTypes[type].single })));
}
export function filterLedger(rows, { type = 'all', owner = '', search = '', sort = 'newest' }) {
  const query = search.trim().toLocaleLowerCase('ru');
  return rows.filter(op => (type === 'all' || op.type === type) && (!owner || [op.owner_id, op.from_owner_id, op.to_owner_id].some(id => String(id) === String(owner))) && (!query || [op.title, op.party, op.subtitle, op.referral_comment, operationTypes[op.type].single, op.amount].join(' ').toLocaleLowerCase('ru').includes(query))).sort((a, b) => sort === 'amount' ? Number(b.amount) - Number(a.amount) : (sort === 'oldest' ? 1 : -1) * (String(a.created_at || '').localeCompare(String(b.created_at || '')) || Number(a.id) - Number(b.id) || a.type.localeCompare(b.type)));
}
export const amountSign = (op, owner = '') => op.type === 'transfer' ? owner ? String(op.to_owner_id) === String(owner) ? '+' : '−' : '' : op.type === 'income' ? '+' : '−';
