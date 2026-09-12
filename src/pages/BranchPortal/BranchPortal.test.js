import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BranchPortal from './BranchPortal';
import service from '../../services/branchPortalService';

jest.mock('../../services/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('../../services/branchPortalService', () => ({ overview: jest.fn(), invoices: jest.fn(), pricing: jest.fn() }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('recharts', () => ({ ResponsiveContainer: ({ children }) => <div>{children}</div>, BarChart: ({ children }) => <div>{children}</div>, Bar: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null }));

const lesson = { id: 2, starts_at: '2026-08-20T10:00:00', teacher_name: 'Анна', instruction_name: 'Робот', paid_children: 5, trial_children: 2, total_children: 7, price_snapshot: 300, amount: 1500 };
const overview = { month: '2026-08', branch: { name: 'Ромашка', address: 'Лесная, 10' }, pricing: { retail_price_per_child: null }, summary: { lessons_count: 1, paid_children: 5, trial_children: 2, total_children: 7, accrued_amount: 1500, outstanding_amount: 0, paid_amount: 0, estimated_revenue: null, estimated_profit: null }, daily: [], lessons: [lesson], invoices: [], upcoming: [] };
const click = async element => { fireEvent.click(element); await act(async () => { await Promise.resolve(); }); };
const setup = async path => { render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/branch/:section" element={<BranchPortal />} /></Routes></MemoryRouter>); await act(async () => { await Promise.resolve(); }); };
beforeEach(() => { jest.resetAllMocks(); service.overview.mockResolvedValue(overview); service.invoices.mockResolvedValue({ items: [] }); service.pricing.mockResolvedValue({ retail_price_per_child: null }); });

test('an unset price invites the garden to configure profitability for the selected month', async () => {
  await setup('/branch/analytics?month=2026-08');
  await click(await screen.findByRole('button', { name: 'Указать свою цену' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Цена для родителей' }));
  expect(dialog.getByText('Август 2026')).toBeInTheDocument();
  fireEvent.change(dialog.getByLabelText('Цена за ребёнка за занятие, ₽'), { target: { value: '1200.50' } });
  await click(dialog.getByRole('button', { name: 'Сохранить цену' }));
  expect(service.pricing).toHaveBeenCalledWith('2026-08', { retail_price_per_child: 1200.5 });
  expect(service.overview).toHaveBeenCalledWith('2026-08', expect.any(AbortSignal));
});

test('a zero selling price remains configured and clearing it sends null instead of zero', async () => {
  service.overview.mockResolvedValue({ ...overview, pricing: { retail_price_per_child: 0 }, summary: { ...overview.summary, estimated_revenue: 0, estimated_profit: -1500 } });
  await setup('/branch/overview?month=2026-08');
  expect(screen.queryByRole('button', { name: 'Указать свою цену' })).not.toBeInTheDocument();
  await click(await screen.findByRole('button', { name: 'Изменить цену' }));
  expect(screen.getByLabelText('Цена за ребёнка за занятие, ₽')).toHaveValue(0);
  fireEvent.change(screen.getByLabelText('Цена за ребёнка за занятие, ₽'), { target: { value: '' } });
  await click(screen.getByRole('button', { name: 'Сохранить цену' }));
  expect(service.pricing).toHaveBeenCalledWith('2026-08', { retail_price_per_child: null });
});

test('the month follows section navigation and lesson details show paid and trial visits separately', async () => {
  await setup('/branch/overview?month=2026-08');
  await click(await screen.findByRole('link', { name: 'Занятия' }));
  expect(screen.getByRole('link', { name: 'Аналитика' })).toHaveAttribute('href', '/branch/analytics?month=2026-08');
  await click(screen.getByRole('button', { name: /Занятие.*Робот/ }));
  const dialog = within(screen.getByRole('dialog', { name: 'Детали занятия' }));
  expect(dialog.getByText('Платных посещений')).toBeInTheDocument();
  expect(dialog.getByText('Пробных посещений')).toBeInTheDocument();
  expect(dialog.getByText('5', { exact: true })).toBeInTheDocument();
  expect(dialog.getByText('2', { exact: true })).toBeInTheDocument();
  expect(dialog.queryByText('Ваша расчётная прибыль')).not.toBeInTheDocument();
});

test('a failed report loads as an error with retry, never as an empty successful month', async () => {
  service.overview.mockRejectedValue(new Error('Нет соединения с кабинетом'));
  await setup('/branch/overview?month=2026-08');
  expect(await screen.findByRole('alert')).toHaveTextContent('Нет соединения с кабинетом');
  expect(screen.queryByText('Месяц только начинается')).not.toBeInTheDocument();
  service.overview.mockResolvedValue(overview);
  await click(screen.getByRole('button', { name: 'Повторить' }));
  expect(await screen.findByRole('heading', { name: 'Как проходит месяц' })).toBeInTheDocument();
});
