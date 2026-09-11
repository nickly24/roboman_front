import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import Accounting from './Accounting';
import OperationModal from './OperationModal';
import apiClient from '../../services/api';
import { amountSign, filterLedger, ledger, money, shiftMonth } from './accountingData';

jest.mock('../../services/api', () => ({ get: jest.fn(), post: jest.fn(), delete: jest.fn() }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <main>{children}</main>);
const ok = data => ({ data: { ok: true, data } });
const sheet = { id: 1, department_id: 2, department_name: 'Основной', year: 2026, month: 8 };
const owners = [{ id: 1, full_name: 'Николай' }, { id: 2, full_name: 'Александр' }];
const income = { id: 1, owner_id: 1, owner_name: 'Николай', branch_name: 'Академия', amount: '10000.25', tax_amount: 600, referral_percent: 10, referral_from_net: 1, created_at: '2026-08-21T12:00:00' };
const transfer = { id: 1, from_owner_id: 1, from_owner_name: 'Николай', to_owner_id: 2, to_owner_name: 'Александр', amount: 2000, created_at: '2026-08-23T12:00:00' };
const record = { sheet, owners, branches: [{ id: 8, name: 'Академия' }], teachers: [{ id: 3, full_name: 'Анна' }], incomes: [income], salaries: [{ id: 2, teacher_id: 3, teacher_name: 'Анна', owner_id: 2, owner_name: 'Александр', amount: 3000, period_type: 'full', created_at: '2026-08-22T12:00:00' }], expenses: [], transfers: [transfer], summary: { revenue: 10000.25, costs: 1540.025, costs_tax: 600, costs_referral: 940.025, expenses: 3000, expenses_salaries: 3000, expenses_other: 0, profit: 5460.225, owner_balances: [{ owner_id: 1, owner_name: 'Николай', income_net: 8460.225, salary_paid: 0, expenses_paid: 0, balance: 6460.225 }, { owner_id: 2, owner_name: 'Александр', income_net: 0, salary_paid: 3000, expenses_paid: 0, balance: -1000 }], discrepancy: 3730.1125 } };
function Location() { const location = useLocation(), navigate = useNavigate(); return <><output data-testid="location">{location.search}</output><button onClick={() => navigate(-1)}>История назад</button></>; }
const click = async el => act(async () => { fireEvent.click(el); });
const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const choose = async (label, name) => { await click(screen.getByRole('button', { name: label })); await click(screen.getByRole('option', { name, exact: true })); };
const setup = async (path = '/accounting') => act(async () => { render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Accounting /><Location /></MemoryRouter>); });
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-11T09:00:00Z'));
  apiClient.get.mockImplementation(async url => ok(url === '/departments' ? { items: [{ id: 2, name: 'Основной' }] } : url.includes('/accounting/sheets?') ? { items: url.endsWith('month=8') ? [sheet] : [] } : record));
  apiClient.post.mockResolvedValue(ok({ id: 1 })); apiClient.delete.mockResolvedValue(ok({}));
});
afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });

test('opens current and previous month tabs, preserves month through sheet navigation and browser back', async () => {
  await setup();
  expect(screen.getByRole('tab', { name: /Сентябрь 2026/ })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getAllByRole('tab')).toHaveLength(2);
  await screen.findByText('За этот месяц пока нет листов');
  await click(screen.getByRole('tab', { name: /Август 2026/ }));
  await click(await screen.findByRole('button', { name: /Основной Август 2026 Прибыль/ }));
  expect(await screen.findByRole('region', { name: 'Журнал операций' })).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('month=2026-08&sheet=1');
  await click(screen.getByRole('button', { name: 'История назад' }));
  expect(await screen.findByRole('heading', { name: 'Денежные листы' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /Август/ })).toHaveAttribute('aria-selected', 'true');
});

test('January defaults include December of the previous year and arbitrary periods stay accessible', async () => {
  jest.setSystemTime(new Date('2027-01-02T09:00:00Z'));
  await setup('/accounting?month=2025-07');
  expect(screen.getByRole('tab', { name: /Январь 2027/ })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /Декабрь 2026/ })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /Июль 2025/ })).toHaveAttribute('aria-selected', 'true');
  expect(shiftMonth('2027-01', -1)).toBe('2026-12');
});

test('list load failure is shown as an error with retry rather than an empty month', async () => {
  apiClient.get.mockRejectedValue(new Error('Нет соединения'));
  await setup();
  expect(screen.queryByText('За этот месяц пока нет листов')).not.toBeInTheDocument();
  expect(screen.getAllByRole('alert').some(el => el.textContent.includes('Нет соединения'))).toBe(true);
});

test('late previous period response cannot replace the newly selected month', async () => {
  let resolveSeptember;
  apiClient.get.mockImplementation(url => url.endsWith('month=9') ? new Promise(resolve => { resolveSeptember = resolve; }) : Promise.resolve(ok(url === '/departments' ? { items: [] } : url.includes('/sheets?') ? { items: [sheet] } : record)));
  await setup();
  await click(screen.getByRole('tab', { name: /Август 2026/ }));
  await act(async () => { resolveSeptember(ok({ items: [{ ...sheet, id: 99, department_name: 'Устаревшие данные' }] })); });
  expect(screen.queryByText('Устаревшие данные')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Основной Август 2026 Прибыль/ })).toBeInTheDocument();
});

test('new sheet defaults to the selected month and sends the unchanged API contract', async () => {
  await setup('/accounting?month=2026-08');
  await click(screen.getByRole('button', { name: 'Создать лист' }));
  const form = within(screen.getByRole('dialog', { name: 'Новый денежный лист' }));
  expect(form.getByRole('button', { name: /Месяц/ })).toHaveTextContent('Август');
  expect(form.getByLabelText('Год')).toHaveValue(2026);
  await click(form.getByRole('button', { name: /Отдел/ }));
  await click(form.getByRole('option', { name: 'Основной' }));
  await click(form.getByRole('button', { name: 'Создать лист' }));
  expect(apiClient.post).toHaveBeenCalledWith('/accounting/sheets', { year: 2026, month: 8, department_id: 2 });
});

test('journal shows one transfer, filters by both parties and keeps totals independent', async () => {
  await setup('/accounting?month=2026-08&sheet=1');
  await screen.findByRole('region', { name: 'Журнал операций' });
  expect(screen.getAllByRole('button', { name: /^Перевод:/ })).toHaveLength(1);
  await click(screen.getByRole('button', { name: 'Переводы 1' }));
  expect(screen.queryByRole('button', { name: /^Поступление:/ })).not.toBeInTheDocument();
  await choose('Владелец', 'Александр');
  expect(screen.getByRole('button', { name: /^Перевод:/ })).toHaveTextContent(/\+2\s000/);
  expect(screen.getByText(money(record.summary.profit), { normalizer: value => value })).toBeInTheDocument();
  change('Поиск операций', 'несуществующее');
  expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
});

test('delete asks within the detail modal and retains the record when API rejects deletion', async () => {
  apiClient.delete.mockRejectedValue(new Error('Не удалось удалить'));
  await setup('/accounting?month=2026-08&sheet=1');
  await click(await screen.findByRole('button', { name: /^Перевод:/ }));
  await click(screen.getByRole('button', { name: 'Удалить', exact: true }));
  expect(apiClient.delete).not.toHaveBeenCalled();
  await click(screen.getByRole('button', { name: 'Оставить запись' }));
  await click(screen.getByRole('button', { name: 'Удалить', exact: true }));
  await click(screen.getByRole('button', { name: 'Удалить операцию' }));
  expect(apiClient.delete).toHaveBeenCalledWith('/accounting/transfers/1');
  expect(screen.getByRole('dialog', { name: 'Перевод' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Не удалось удалить');
});

test('income form previews deductions and sends the same tax and referral fields', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  await act(async () => { render(<OperationModal type="income" sheetData={record} onClose={jest.fn()} onSave={save} />); });
  await choose(/Филиал/, 'Академия'); await choose(/Кому зачислено/, 'Николай');
  change('Сумма, ₽', '10000.25');
  await click(screen.getByRole('button', { name: /Налог и рефералка/ }));
  change('Налог, %', '6'); change('Рефералка, %', '10');
  await click(screen.getByRole('checkbox', { name: 'Рефералка после вычета налога' }));
  await click(screen.getByRole('button', { name: 'Добавить операцию' }));
  expect(save).toHaveBeenCalledWith({ owner_id: 1, branch_id: 8, amount: 10000.25, tax_amount: 600.015, referral_percent: 10, referral_from_net: 1, referral_comment: undefined });
});

test.each(['salary', 'expense', 'transfer'])('%s form preserves its payload', async type => {
  const save = jest.fn().mockResolvedValue(undefined);
  await act(async () => { render(<OperationModal type={type} sheetData={record} onClose={jest.fn()} onSave={save} />); });
  await choose(type === 'transfer' ? /От кого/ : /Кто платит/, 'Николай');
  if (type === 'salary') await choose(/Преподаватель/, 'Анна');
  if (type === 'expense') change('На что потрачено', 'Конструкторы');
  if (type === 'transfer') { await click(screen.getByRole('button', { name: /Кому/ })); expect(screen.queryByRole('option', { name: 'Николай' })).not.toBeInTheDocument(); await click(screen.getByRole('option', { name: 'Александр' })); }
  change('Сумма, ₽', '1234.56');
  await click(screen.getByRole('button', { name: 'Добавить операцию' }));
  expect(save).toHaveBeenCalledWith(type === 'salary' ? { owner_id: 1, teacher_id: 3, period_type: 'full', amount: 1234.56 } : type === 'expense' ? { owner_id: 1, name: 'Конструкторы', amount: 1234.56 } : { from_owner_id: 1, to_owner_id: 2, amount: 1234.56 });
});

test('transfer normalization does not duplicate records or lose kopecks', () => {
  const rows = ledger(record);
  expect(rows).toHaveLength(3);
  const op = rows.find(r => r.type === 'transfer');
  expect(amountSign(op)).toBe(''); expect(amountSign(op, '1')).toBe('−'); expect(amountSign(op, '2')).toBe('+');
  expect(filterLedger(rows, { owner: '2' })).toHaveLength(2);
  expect(money(10000.25)).toContain('000,25');
});

test('journal paginates records and resets to the first page when filtering', async () => {
  const many = { ...record, expenses: Array.from({ length: 25 }, (_, i) => ({ id: i + 10, name: `Набор ${i + 1}`, amount: i + 1, owner_id: 1, owner_name: 'Николай' })) };
  apiClient.get.mockImplementation(async url => ok(url === '/departments' ? { items: [] } : url.includes('/sheets?') ? { items: [sheet] } : many));
  await setup('/accounting?month=2026-08&sheet=1');
  const journal = within(await screen.findByRole('region', { name: 'Журнал операций' }));
  expect(journal.getByText('1–20 из 28')).toBeInTheDocument();
  await click(journal.getByRole('button', { name: 'Следующая страница операций' }));
  expect(journal.getByText('21–28 из 28')).toBeInTheDocument();
  change('Поиск операций', 'Набор 25');
  expect(journal.getByText('1–1 из 1')).toBeInTheDocument();
  expect(journal.getByRole('button', { name: 'Следующая страница операций' })).toBeDisabled();
});

test('a late report response does not overwrite a manually changed amount', async () => {
  let resolveReport;
  apiClient.get.mockImplementation(() => new Promise(resolve => { resolveReport = resolve; }));
  await act(async () => { render(<OperationModal type="income" sheetData={record} onClose={jest.fn()} onSave={jest.fn()} />); });
  await choose(/Филиал/, 'Академия');
  await click(screen.getByRole('button', { name: 'Из отчёта' }));
  expect(apiClient.get.mock.calls[0][0]).toBe('/reports/branch/8/summary?month=2026-08');
  change('Сумма, ₽', '750.25');
  await act(async () => { resolveReport(ok({ kpi: { revenue_sum: 12000 } })); });
  expect(screen.getByLabelText('Сумма, ₽')).toHaveValue(750.25);
});

test('missing report data retains the manual amount, while an actual zero is accepted', async () => {
  apiClient.get.mockResolvedValueOnce(ok({ kpi: {} })).mockResolvedValueOnce(ok({ kpi: { revenue_sum: 0 } }));
  await act(async () => { render(<OperationModal type="income" sheetData={record} onClose={jest.fn()} onSave={jest.fn()} />); });
  await choose(/Филиал/, 'Академия'); change('Сумма, ₽', '500');
  await click(screen.getByRole('button', { name: 'Из отчёта' }));
  expect(screen.getByRole('alert')).toHaveTextContent('нет данных');
  expect(screen.getByLabelText('Сумма, ₽')).toHaveValue(500);
  await click(screen.getByRole('button', { name: 'Из отчёта' }));
  expect(screen.getByLabelText('Сумма, ₽')).toHaveValue(0);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('salary report uses the selected half of the month and preserves kopecks', async () => {
  apiClient.get.mockResolvedValue(ok({ by_department: [{ department_id: 99, teachers: [{ teacher_id: 3, salary_16_end: 1 }] }, { department_id: 2, teachers: [{ teacher_id: 3, salary_16_end: 2500.75, salary_sum: 5000 }] }] }));
  await act(async () => { render(<OperationModal type="salary" sheetData={record} onClose={jest.fn()} onSave={jest.fn()} />); });
  await choose(/Преподаватель/, 'Анна'); await choose(/Период выплаты/, '16–конец месяца');
  await click(screen.getByRole('button', { name: 'Из отчёта' }));
  expect(apiClient.get.mock.calls[0][0]).toBe('/salary/owner-by-department?month=2026-08');
  expect(screen.getByLabelText('Сумма, ₽')).toHaveValue(2500.75);
});
