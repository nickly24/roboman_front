import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import TeacherAccounts from './TeacherAccounts';
import TeacherAccountForm from './TeacherAccountForm';
import apiClient from '../../services/api';

jest.mock('../../services/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <main>{children}</main>);
jest.mock('../../hooks/useMediaQuery', () => () => false);
const teacher = { teacher_id: 5, full_name: 'Анна', status: 'working', user_id: 15, login: 'anna', password: 'must-never-be-rendered' };
const ok = data => ({ data: { ok: true, data } });
const click = element => act(async () => { fireEvent.click(element); });
const setup = async () => { render(<TeacherAccounts />); await screen.findByText('Анна'); };

beforeEach(() => {
  jest.resetAllMocks();
  apiClient.get.mockResolvedValue(ok({ items: [teacher] }));
  apiClient.put.mockResolvedValue(ok({ id: 15 }));
  apiClient.post.mockResolvedValue(ok({ user_id: 16 }));
});

test('existing passwords are neither displayed nor copied into the invitation', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await setup();
  expect(screen.queryByText(teacher.password)).not.toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'Пароль', exact: true })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Копировать пароль' })).not.toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Копировать приглашение' }));
  const invitation = writeText.mock.calls[0][0];
  expect(invitation).toContain('/login');
  expect(invitation).toContain('Логин: anna');
  expect(invitation).toContain('Пароль администратор передаст отдельно');
  expect(invitation).not.toContain(teacher.password);
  expect(invitation).not.toContain('null');
});

test('password reset validates, calls the existing user endpoint, and clears its input when reopened', async () => {
  await setup();
  await click(screen.getByRole('button', { name: 'Изменить пароль: Анна' }));
  let dialog = within(screen.getByRole('dialog'));
  const input = dialog.getByLabelText(/Новый пароль/);
  expect(input).toHaveValue('');
  expect(input).toHaveAttribute('minLength', '8');
  expect(input).toHaveAttribute('maxLength', '256');
  fireEvent.change(input, { target: { value: 'short' } });
  fireEvent.submit(dialog.getByRole('form'));
  expect(dialog.getByRole('alert')).toHaveTextContent('от 8 до 256');
  expect(apiClient.put).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'new-demo-password' } });
  await click(dialog.getByRole('button', { name: 'Изменить пароль', exact: true }));
  expect(apiClient.put).toHaveBeenCalledWith('/users/15', { password: 'new-demo-password' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Пароль изменён');
  await click(screen.getByRole('button', { name: 'Изменить пароль: Анна' }));
  dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByLabelText(/Новый пароль/)).toHaveValue('');
});

test('reset errors stay inline and closing discards the typed replacement password', async () => {
  apiClient.put.mockRejectedValue({ response: { data: { error: { message: 'Сервис недоступен' } } } });
  await setup();
  await click(screen.getByRole('button', { name: 'Изменить пароль: Анна' }));
  let dialog = within(screen.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText(/Новый пароль/), { target: { value: 'unsaved-new-password' } });
  await click(dialog.getByRole('button', { name: 'Изменить пароль', exact: true }));
  expect(dialog.getByRole('alert')).toHaveTextContent('Сервис недоступен');
  expect(dialog.getByLabelText(/Новый пароль/)).toHaveValue('unsaved-new-password');
  await click(dialog.getByRole('button', { name: 'Отмена' }));
  await click(screen.getByRole('button', { name: 'Изменить пароль: Анна' }));
  dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByLabelText(/Новый пароль/)).toHaveValue('');
  expect(dialog.queryByRole('alert')).not.toBeInTheDocument();
});

test('creation enforces the hashed-password minimum and explains that the saved password is not retrievable', async () => {
  const onSuccess = jest.fn();
  render(<TeacherAccountForm teachers={[{ ...teacher, user_id: null }]} initialTeacher={teacher} onSuccess={onSuccess} onCancel={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/Логин/), { target: { value: '  next-anna  ' } });
  fireEvent.change(screen.getByLabelText(/Пароль/), { target: { value: 'short' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(screen.getByRole('alert')).toHaveTextContent('от 8 до 256');
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(screen.getByText(/Сохраните введённый пароль до закрытия окна/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Пароль/), { target: { value: 'new-demo-password' } });
  await click(screen.getByRole('button', { name: 'Создать учетку' }));
  expect(apiClient.post).toHaveBeenCalledWith('/teacher-accounts', { teacher_id: 5, login: 'next-anna', password: 'new-demo-password', is_active: true });
  expect(onSuccess).toHaveBeenCalledTimes(1);
});
