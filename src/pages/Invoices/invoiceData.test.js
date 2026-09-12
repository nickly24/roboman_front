jest.mock('../../services/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
import { filterInvoices, invoiceStatuses, lineAmount, overdue, sumLines, today } from './invoiceData';

const invoices = [
  { id: 1, number: 'СЧ-001', branch_name: 'Ромашка', title: 'Робототехника', month: '2026-09', status: 'issued', total_amount: 7500.25 },
  { id: 2, number: 'СЧ-002', branch_name: 'Ромашка', title: 'Робототехника', month: '2026-09', status: 'payment_reported', total_amount: 5000 },
  { id: 3, number: 'СЧ-003', branch_name: 'Солнышко', title: 'Робототехника', month: '2026-08', status: 'paid', total_amount: 8400 },
  { id: 4, number: 'СЧ-004', branch_name: 'Ромашка', title: 'Корректировка', month: '2026-09', status: 'cancelled', total_amount: 3000 },
];

afterEach(() => jest.useRealTimers());

test('filters branch, month and payment state together without treating a claim as a paid invoice', () => {
  expect(filterInvoices(invoices, { search: '  РОМАШКА ', month: '2026-09', status: 'issued' }).map(i => i.id)).toEqual([1]);
  expect(filterInvoices(invoices, { status: 'payment_reported' }).map(i => i.id)).toEqual([2]);
  expect(filterInvoices(invoices, { status: 'paid' }).map(i => i.id)).toEqual([3]);
  expect(invoiceStatuses.payment_reported.label).toBe('Проверка оплаты');
  expect(invoiceStatuses.paid.label).toBe('Оплачен');
  expect(invoices).toHaveLength(4);
});

test('all periods retain paid and cancelled history and search supports invoice numbers and amounts', () => {
  expect(filterInvoices(invoices, {}).map(i => i.id)).toEqual([1, 2, 3, 4]);
  expect(filterInvoices(invoices, { search: 'сч-003' }).map(i => i.id)).toEqual([3]);
  expect(filterInvoices(invoices, { search: '7500.25' }).map(i => i.id)).toEqual([1]);
  expect(filterInvoices(invoices, { month: '2026-09', status: 'paid' })).toEqual([]);
});

test('overdue switches at Moscow midnight, with the due date itself still payable on time', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-11T20:59:59Z'));
  expect(today()).toBe('2026-09-11');
  expect(overdue({ status: 'issued', due_date: '2026-09-11' })).toBe(false);
  jest.setSystemTime(new Date('2026-09-11T21:00:00Z'));
  expect(today()).toBe('2026-09-12');
  expect(overdue({ status: 'issued', due_date: '2026-09-11' })).toBe(true);
  expect(overdue({ status: 'payment_reported', due_date: '2026-09-11' })).toBe(true);
  expect(overdue({ status: 'issued', due_date: '2026-09-12' })).toBe(false);
});

test('drafts, settled invoices and cancellations never become overdue', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-12T10:00:00Z'));
  ['draft', 'paid', 'cancelled'].forEach(status => {
    expect(overdue({ status, due_date: '2026-08-01' })).toBe(false);
  });
  expect(overdue({ status: 'issued', due_date: null })).toBeFalsy();
});

test.each([
  ['1.5', '2.07', 3.11],
  ['0.5', '2.01', 1.01],
  ['0.5', '2.03', 1.02],
  ['0.49', '2.01', 0.98],
  ['0.51', '2.01', 1.03],
  ['3', '0.10', 0.30],
  ['0.15', '2.30', 0.35],
  ['10', '0', 0],
])('invoice line %s × %s rounds like backend Decimal ROUND_HALF_UP to %s', (quantity, unit_price, expected) => {
  expect(lineAmount({ quantity, unit_price })).toBe(expected);
});

test('invoice total sums individually rounded lines rather than rounding the unrounded grand total', () => {
  const items = Array.from({ length: 3 }, () => ({ quantity: '0.5', unit_price: '2.01' }));
  expect(sumLines(items)).toBe(3.03);
  expect(sumLines([{ quantity: 3, unit_price: 0.1 }, { quantity: 1, unit_price: 0.2 }])).toBe(0.5);
  expect(sumLines([])).toBe(0);
});
