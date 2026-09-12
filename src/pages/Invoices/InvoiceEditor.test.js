import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import InvoiceEditor from './InvoiceEditor';
import service from '../../services/branchPortalService';

jest.mock('../../services/branchPortalService', () => ({ report: jest.fn(), create: jest.fn(), update: jest.fn() }));
jest.mock('../../services/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));

const branches = [{ id: 8, name: 'Ромашка', address: 'ул. Лесная, 10' }, { id: 9, name: 'Радуга', address: 'ул. Новая, 2' }];
const line = { lesson_id: 21, description: 'Робот-исследователь', lesson_date: '2026-09-10T10:00:00', teacher_name: 'Анна', quantity: 5, unit_price: 300 };
const draft = { id: 42, revision: 3, branch_id: 8, month: '2026-09', title: 'Занятия за сентябрь', items: [line], seller_details: 'Новый исполнитель', payment_details: 'Новые реквизиты', buyer_details: 'Ромашка', note: '' };
const click = async element => { fireEvent.click(element); await act(async () => { await Promise.resolve(); }); };
const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const setup = async props => {
  const onClose = jest.fn(), onSaved = jest.fn();
  render(<InvoiceEditor branches={branches} month="2026-09" branchId="8" onClose={onClose} onSaved={onSaved} {...props} />);
  await act(async () => { await Promise.resolve(); });
  return { onClose, onSaved };
};
beforeEach(() => { jest.resetAllMocks(); service.report.mockResolvedValue({ items: [line], total_amount: 1500, seller_details: 'Старый исполнитель', payment_details: 'Старый банк' }); });

test('a fresh editor opened from a branch has a prefilled buyer without a false unsaved warning', async () => {
  const { onClose } = await setup();
  expect(screen.getByLabelText('Плательщик')).toHaveValue('Ромашка\nул. Лесная, 10');
  await click(screen.getByRole('button', { name: 'Отмена', exact: true }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog', { name: 'Закрыть без сохранения?' })).not.toBeInTheDocument();
});

test('imports lesson amounts, retains current requisites, and saves an editable draft with its revision', async () => {
  const { onSaved } = await setup({ invoice: draft });
  await click(screen.getByRole('button', { name: 'Подтянуть из отчёта' }));
  expect(service.report).not.toHaveBeenCalled();
  await click(screen.getByRole('button', { name: 'Заменить из отчёта' }));
  expect(service.report).toHaveBeenCalledWith(8, '2026-09', expect.any(AbortSignal));
  expect(screen.getByLabelText('Исполнитель')).toHaveValue('Новый исполнитель');
  expect(screen.getByLabelText('Реквизиты для оплаты')).toHaveValue('Новые реквизиты');
  change('Количество строки 1', '6'); change('Цена строки 1', '350.25');
  service.update.mockResolvedValue({ ...draft, revision: 4 });
  await click(screen.getByRole('button', { name: 'Сохранить черновик' }));
  expect(service.update).toHaveBeenCalledWith(42, expect.objectContaining({ revision: 3, seller_details: 'Новый исполнитель', payment_details: 'Новые реквизиты', items: [expect.objectContaining({ lesson_id: 21, quantity: 6, unit_price: 350.25 })] }));
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ revision: 4 }));
});

test('a delayed report cannot overwrite requisites entered while it was loading', async () => {
  let resolve;
  service.report.mockImplementation(() => new Promise(done => { resolve = done; }));
  await setup();
  await click(screen.getByRole('button', { name: 'Подтянуть из отчёта' }));
  change('Исполнитель', 'Исполнитель из нового договора'); change('Реквизиты для оплаты', 'Новый банковский счёт');
  await act(async () => { resolve({ items: [line], seller_details: 'Старый исполнитель', payment_details: 'Закрытый счёт' }); });
  expect(screen.getByLabelText('Исполнитель')).toHaveValue('Исполнитель из нового договора');
  expect(screen.getByLabelText('Реквизиты для оплаты')).toHaveValue('Новый банковский счёт');
  expect(screen.getByLabelText('Наименование строки 1')).toHaveValue(line.description);
});

test('a delayed report does not replace rows the administrator changed during loading', async () => {
  let resolve;
  service.report.mockImplementation(() => new Promise(done => { resolve = done; }));
  await setup({ invoice: draft });
  await click(screen.getByRole('button', { name: 'Подтянуть из отчёта' }));
  await click(screen.getByRole('button', { name: 'Заменить из отчёта' }));
  change('Количество строки 1', '7');
  await act(async () => { resolve({ items: [{ ...line, quantity: 100 }] }); });
  expect(screen.getByLabelText('Количество строки 1')).toHaveValue(7);
  expect(screen.getByText(/Вы изменили строки во время загрузки/)).toBeInTheDocument();
});

test('close asks before discarding unsaved changes and continuing preserves the form', async () => {
  const { onClose } = await setup({ invoice: draft });
  change('Комментарий для сада', 'Согласованная корректировка');
  await click(screen.getByRole('button', { name: 'Закрыть окно' }));
  const confirmation = within(screen.getByRole('dialog', { name: 'Закрыть без сохранения?' }));
  expect(onClose).not.toHaveBeenCalled();
  await click(confirmation.getByRole('button', { name: 'Продолжить редактирование' }));
  expect(screen.getByLabelText('Комментарий для сада')).toHaveValue('Согласованная корректировка');
  await click(screen.getByRole('button', { name: 'Отмена', exact: true }));
  await click(screen.getByRole('button', { name: 'Закрыть без сохранения', exact: true }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('all inputs lock while a draft is being saved and failure preserves the form', async () => {
  let reject;
  service.update.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  const { onClose, onSaved } = await setup({ invoice: draft });
  change('Реквизиты для оплаты', 'Проверенный банк');
  await click(screen.getByRole('button', { name: 'Сохранить черновик' }));
  expect(screen.getByLabelText('Реквизиты для оплаты')).toBeDisabled();
  expect(screen.getByLabelText('Количество строки 1')).toBeDisabled();
  await click(screen.getByRole('button', { name: 'Закрыть окно' }));
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => { reject(new Error('Сеть недоступна')); });
  expect(await screen.findByRole('alert')).toHaveTextContent('Сеть недоступна');
  expect(screen.getByLabelText('Реквизиты для оплаты')).toBeEnabled();
  expect(screen.getByLabelText('Реквизиты для оплаты')).toHaveValue('Проверенный банк');
  expect(onSaved).not.toHaveBeenCalled();
});

test('changing the branch asks before clearing imported rows', async () => {
  await setup();
  await click(screen.getByRole('button', { name: 'Подтянуть из отчёта' }));
  await click(screen.getByRole('button', { name: /Филиал/ }));
  await click(screen.getByRole('option', { name: 'Радуга' }));
  expect(screen.getByLabelText('Наименование строки 1')).toHaveValue(line.description);
  await click(screen.getByRole('button', { name: 'Сменить и очистить' }));
  await waitFor(() => expect(screen.queryByLabelText('Наименование строки 1')).not.toBeInTheDocument());
  expect(screen.getByLabelText('Плательщик')).toHaveValue('Радуга\nул. Новая, 2');
});
