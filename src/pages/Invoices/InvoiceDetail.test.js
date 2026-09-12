jest.mock('../../services/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import InvoiceDetail from './InvoiceDetail';
import service from '../../services/branchPortalService';

jest.mock('../../services/branchPortalService', () => ({ invoice: jest.fn(), action: jest.fn(), document: jest.fn() }));

const base = {
  id: 42, number: 'СЧ-202609-00042', branch_id: 8, branch_name: 'Ромашка', month: '2026-09', title: 'Занятия за сентябрь',
  status: 'issued', revision: 2, total_amount: 3000, due_date: '2099-09-30',
  seller_details: 'ООО Робоклуб', buyer_details: 'Сад Ромашка', payment_details: 'Реквизиты для оплаты',
  items: [{ id: 1, description: 'Робот', quantity: 10, unit_price: 300, amount: 3000 }], events: [],
};
const click = element => act(async () => { fireEvent.click(element); });
const setup = async (invoice = base, props = {}) => {
  service.invoice.mockResolvedValueOnce(invoice);
  render(<InvoiceDetail id={42} onClose={jest.fn()} {...props} />);
  await screen.findByRole('heading', { name: invoice.title });
  return within(screen.getByRole('dialog'));
};

beforeEach(() => { jest.resetAllMocks(); });

test('a branch can report an issued invoice but cannot edit, issue, cancel or confirm money received', async () => {
  const dialog = await setup();
  expect(service.invoice).toHaveBeenCalledWith(false, 42, expect.any(AbortSignal));
  expect(dialog.getByRole('button', { name: 'Я оплатил' })).toBeInTheDocument();
  ['Редактировать', 'Выставить счёт', 'Подтвердить оплату', 'Отменить счёт', 'Оплата не найдена'].forEach(name => {
    expect(dialog.queryByRole('button', { name })).not.toBeInTheDocument();
  });
  expect(dialog.getByRole('button', { name: 'Печать / PDF' })).toBeInTheDocument();
});

test('an owner can review and edit a draft and issue it only through the explicit confirmation panel', async () => {
  const onEdit = jest.fn();
  const draft = { ...base, status: 'draft', revision: 1 };
  const dialog = await setup(draft, { admin: true, onEdit });
  await click(dialog.getByRole('button', { name: 'Редактировать' }));
  expect(onEdit).toHaveBeenCalledWith(draft);
  await click(dialog.getByRole('button', { name: 'Выставить счёт' }));
  expect(service.action).not.toHaveBeenCalled();
  expect(dialog.getByRole('button', { name: 'Выставить в кабинет' })).toBeInTheDocument();
  expect(dialog.queryByRole('button', { name: 'Я оплатил' })).not.toBeInTheDocument();
});

test('payment reported remains pending in a branch cabinet and cannot be reported again', async () => {
  const dialog = await setup({ ...base, status: 'payment_reported', revision: 3, payment_note: 'Перевели по поручению 42', payment_date: '2026-09-11' });
  expect(dialog.getByText('Проверка оплаты', { exact: true })).toBeInTheDocument();
  expect(dialog.getByText(/Вы сообщили об оплате. Ожидаем подтверждения администратора/)).toBeInTheDocument();
  expect(dialog.getByText('Перевели по поручению 42')).toBeInTheDocument();
  expect(dialog.queryByText('Оплачен', { exact: true })).not.toBeInTheDocument();
  expect(dialog.queryByRole('button', { name: 'Я оплатил' })).not.toBeInTheDocument();
});

test('an owner reviews reported money and must enter a reason to reject the claim', async () => {
  const dialog = await setup({ ...base, status: 'payment_reported', revision: 3 }, { admin: true });
  expect(dialog.getByRole('button', { name: 'Подтвердить оплату' })).toBeInTheDocument();
  await click(dialog.getByRole('button', { name: 'Оплата не найдена' }));
  expect(dialog.getByLabelText('Причина')).toBeRequired();
  expect(service.action).not.toHaveBeenCalled();
});

test.each(['paid', 'cancelled'])('%s invoices keep their document but expose no state changing buttons', async status => {
  const dialog = await setup({ ...base, status, revision: 4 }, { admin: true });
  expect(dialog.getByRole('button', { name: 'Печать / PDF' })).toBeInTheDocument();
  ['Редактировать', 'Выставить счёт', 'Я оплатил', 'Подтвердить оплату', 'Отменить счёт', 'Оплата не найдена'].forEach(name => {
    expect(dialog.queryByRole('button', { name })).not.toBeInTheDocument();
  });
});

test('a branch sends its current revision and payment note, then preserves the accepted claim if refresh fails', async () => {
  const onChanged = jest.fn();
  const dialog = await setup(base, { onChanged });
  service.invoice.mockRejectedValue(new Error('Не удалось обновить карточку'));
  service.action.mockResolvedValue({ ...base, status: 'payment_reported', revision: 3, payment_note: 'Поручение 42' });
  await click(dialog.getByRole('button', { name: 'Я оплатил' }));
  fireEvent.change(dialog.getByLabelText('Комментарий (необязательно)'), { target: { value: '  Поручение 42  ' } });
  await click(dialog.getByRole('button', { name: 'Я оплатил' }));
  expect(service.action).toHaveBeenCalledWith(false, 42, 'report-payment', expect.objectContaining({ revision: 2, note: 'Поручение 42', payment_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
  await screen.findByText(/Не удалось обновить карточку/);
  await waitFor(() => expect(dialog.getByText('Проверка оплаты', { exact: true })).toBeInTheDocument());
  expect(onChanged).toHaveBeenCalledTimes(1);
  expect(dialog.queryByRole('button', { name: 'Я оплатил' })).not.toBeInTheDocument();
  expect(dialog.queryByText('Оплачен', { exact: true })).not.toBeInTheDocument();
});

test('confirmed payment stays paid when the subsequent detail read cannot load', async () => {
  const dialog = await setup({ ...base, status: 'payment_reported', revision: 3 }, { admin: true });
  service.invoice.mockRejectedValue(new Error('Нет сети'));
  service.action.mockResolvedValue({ ...base, status: 'paid', revision: 4, paid_at: '2026-09-12T12:00:00' });
  await click(dialog.getByRole('button', { name: 'Подтвердить оплату' }));
  await click(dialog.getByRole('button', { name: 'Подтвердить поступление' }));
  await screen.findByText(/Нет сети/);
  await waitFor(() => expect(dialog.getByText('Оплачен', { exact: true })).toBeInTheDocument());
  expect(service.action).toHaveBeenCalledWith(true, 42, 'confirm-payment', expect.objectContaining({ revision: 3 }));
  expect(dialog.queryByRole('button', { name: 'Подтвердить оплату' })).not.toBeInTheDocument();
  expect(dialog.queryByRole('button', { name: 'Отменить счёт' })).not.toBeInTheDocument();
});

test('pending writes cannot be submitted twice or dismissed before the server answers', async () => {
  const onClose = jest.fn();
  const dialog = await setup(base, { onClose });
  let finish;
  service.action.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await click(dialog.getByRole('button', { name: 'Я оплатил' }));
  await click(dialog.getByRole('button', { name: 'Я оплатил' }));
  expect(dialog.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled();
  await click(dialog.getByRole('button', { name: 'Сохраняем…' }));
  await click(dialog.getByRole('button', { name: 'Закрыть окно' }));
  expect(onClose).not.toHaveBeenCalled();
  expect(service.action).toHaveBeenCalledTimes(1);
  service.invoice.mockResolvedValue({ ...base, status: 'payment_reported', revision: 3 });
  await act(async () => { finish({ ...base, status: 'payment_reported', revision: 3 }); });
});


test('a stale revision offers an explicit refresh and loads the server status before another attempt', async () => {
  const dialog = await setup(base);
  service.action.mockRejectedValue({ response: { status: 409, data: { error: { message: 'Счёт изменён' } } } });
  await click(dialog.getByRole('button', { name: 'Я оплатил' }));
  await click(dialog.getByRole('button', { name: 'Я оплатил' }));
  expect(dialog.getByRole('alert')).toHaveTextContent('Счёт уже изменён');
  expect(dialog.queryByLabelText('Комментарий (необязательно)')).not.toBeInTheDocument();
  service.invoice.mockResolvedValue({ ...base, status: 'paid', revision: 4 });
  await click(dialog.getByRole('button', { name: 'Обновить счёт' }));
  expect(dialog.getByText('Оплачен', { exact: true })).toBeInTheDocument();
  expect(dialog.queryByRole('button', { name: 'Я оплатил' })).not.toBeInTheDocument();
  expect(service.action).toHaveBeenCalledTimes(1);
});
