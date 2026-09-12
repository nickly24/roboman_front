import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BranchAccounts from './BranchAccounts';
import apiClient from '../../services/api';

jest.mock('../../services/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <main>{children}</main>);
const ok = data => ({ data: { ok: true, data } });
const accounts = [
  { id: 51, branch_id: 8, branch_name: 'Солнечный сад', login: 'sunny', is_active: 1, branch_is_active: 1, password: 'never-show-existing-password' },
  { id: 52, branch_id: 9, branch_name: 'Академия', login: 'academy', is_active: 0, branch_is_active: 1 },
];
const branches = [
  { id: 8, name: 'Солнечный сад', is_active: 1, department_name: 'Центр' },
  { id: 9, name: 'Академия', is_active: 1 },
  { id: 10, name: 'Новый сад', is_active: 1 },
  { id: 11, name: 'Архивный сад', is_active: 0 },
];
const flushResponses = () => act(() => Promise.resolve());
const click = async element => { fireEvent.click(element); await flushResponses(); };
const setup = async () => { render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><BranchAccounts /></MemoryRouter>); await flushResponses(); };
beforeEach(() => {
  apiClient.get.mockImplementation(async url => ok({ items: url.startsWith('/branches?') ? branches : accounts }));
  apiClient.post.mockResolvedValue(ok({ id: 53, branch_id: 10, branch_name: 'Новый сад', login: 'new-garden', is_active: 1 }));
  apiClient.put.mockResolvedValue(ok({}));
});
afterEach(() => { jest.clearAllMocks(); });

test('creates access only for an unconnected active branch and requires a new password', async () => {
  await setup();
  expect(screen.queryByText('never-show-existing-password')).not.toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Создать кабинет', exact: true }));
  const form = within(screen.getByRole('dialog', { name: 'Создать кабинет сада' }));
  await click(form.getByRole('button', { name: /Филиал/ }));
  expect(form.getAllByRole('option')).toHaveLength(1);
  await click(form.getByRole('option', { name: 'Новый сад' }));
  fireEvent.change(form.getByLabelText('Логин'), { target: { value: '  new-garden  ' } });
  fireEvent.change(form.getByLabelText('Новый пароль'), { target: { value: 'short' } });
  fireEvent.submit(form.getByRole('form', { name: 'Создать кабинет сада' }));
  expect(form.getByRole('alert')).toHaveTextContent('от 8 до 256 символов');
  expect(apiClient.post).not.toHaveBeenCalled();
  fireEvent.change(form.getByLabelText('Новый пароль'), { target: { value: 'new-secret-123' } });
  await click(form.getByRole('button', { name: 'Создать кабинет' }));
  expect(apiClient.post).toHaveBeenCalledWith('/accounting/branch-access', { branch_id: 10, login: 'new-garden', password: 'new-secret-123', is_active: 1 });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Кабинет создан');
});

test('editing the login neither moves the account nor sends a password', async () => {
  await setup();
  await click(screen.getByRole('button', { name: 'Изменить доступ: Солнечный сад' }));
  const form = within(screen.getByRole('dialog', { name: 'Настройки доступа' }));
  expect(form.queryByRole('button', { name: /Филиал/ })).not.toBeInTheDocument();
  expect(form.queryByLabelText('Новый пароль')).not.toBeInTheDocument();
  fireEvent.change(form.getByLabelText('Логин'), { target: { value: 'new-sunny' } });
  await click(form.getByRole('button', { name: 'Сохранить' }));
  expect(apiClient.put).toHaveBeenCalledWith('/accounting/branch-access/51', { login: 'new-sunny' });
});

test('password change begins empty and keeps the form on an API rejection', async () => {
  apiClient.put.mockRejectedValue(new Error('Сервис временно недоступен'));
  await setup();
  await click(screen.getByRole('button', { name: 'Изменить пароль: Солнечный сад' }));
  const form = within(screen.getByRole('dialog', { name: 'Изменить пароль' }));
  expect(form.getByLabelText('Новый пароль')).toHaveValue('');
  fireEvent.change(form.getByLabelText('Новый пароль'), { target: { value: 'next-secret-123' } });
  await click(form.getByRole('button', { name: 'Изменить пароль', exact: true }));
  expect(apiClient.put).toHaveBeenCalledWith('/accounting/branch-access/51', { password: 'next-secret-123' });
  expect(form.getByRole('alert')).toHaveTextContent('Сервис временно недоступен');
  expect(form.getByLabelText('Новый пароль')).toHaveValue('next-secret-123');
});

test('pausing asks in a modal and prevents duplicate or interrupted writes', async () => {
  let resolveSave;
  apiClient.put.mockImplementation(() => new Promise(resolve => { resolveSave = resolve; }));
  await setup();
  await click(screen.getByRole('button', { name: 'Приостановить доступ: Солнечный сад' }));
  expect(apiClient.put).not.toHaveBeenCalled();
  const form = within(screen.getByRole('dialog', { name: 'Приостановить доступ?' }));
  await click(form.getByRole('button', { name: 'Приостановить доступ', exact: true }));
  expect(form.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled();
  await click(form.getByRole('button', { name: 'Закрыть окно' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(apiClient.put).toHaveBeenCalledTimes(1);
  expect(apiClient.put).toHaveBeenCalledWith('/accounting/branch-access/51', { is_active: 0 });
  await act(async () => { resolveSave(ok({})); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('filters by branch and status, and restores disabled access', async () => {
  await setup();
  await click(screen.getByRole('button', { name: 'Статус доступа' }));
  await click(screen.getByRole('option', { name: 'Без доступа', exact: true }));
  expect(screen.queryByText('Солнечный сад')).not.toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Включить доступ: Академия' }));
  await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Включить доступ', exact: true }));
  expect(apiClient.put).toHaveBeenCalledWith('/accounting/branch-access/52', { is_active: 1 });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'несуществующий' } });
  expect(screen.getByText('Кабинеты не найдены')).toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
  expect(screen.getByText('Солнечный сад')).toBeInTheDocument();
});

test('archive status is visible and archive accounts cannot be enabled', async () => {
  apiClient.get.mockImplementation(async url => ok({ items: url.startsWith('/branches?') ? branches : [{ ...accounts[1], branch_is_active: 0 }] }));
  await setup();
  expect(screen.getByText('Филиал в архиве')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Включить доступ: Академия' })).toBeDisabled();
});

test('loading errors are not rendered as empty accounts and creating stays disabled', async () => {
  apiClient.get.mockRejectedValue(new Error('Нет соединения'));
  await setup();
  expect(screen.getByText('Не удалось загрузить кабинеты')).toBeInTheDocument();
  expect(screen.queryByText('Откройте саду доступ к своим занятиям')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Создать кабинет', exact: true })).toBeDisabled();
});

test('copying an invitation never exposes an existing password', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await setup();
  await click(screen.getByRole('button', { name: 'Скопировать данные для входа: Солнечный сад' }));
  expect(writeText).toHaveBeenCalledTimes(1);
  expect(writeText.mock.calls[0][0]).toContain('/login');
  expect(writeText.mock.calls[0][0]).toContain('Логин: sunny');
  expect(writeText.mock.calls[0][0]).not.toContain('never-show-existing-password');
});
