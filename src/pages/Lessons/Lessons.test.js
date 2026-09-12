import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Lessons from './Lessons';
import apiClient from '../../services/api';
import { useAuth } from '../../context/AuthContext';
jest.mock('../../services/api', () => ({ get: jest.fn(), put: jest.fn(), delete: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('../../hooks/useMediaQuery', () => () => false);
jest.mock('./LessonForm', () => ({ lesson, initialValues, onCancel }) => <div><span data-testid="form-date">{lesson?.starts_at || initialValues?.starts_at}</span><button onClick={onCancel}>Отмена формы</button></div>);
const lesson = { id: 7, starts_at: '2026-09-07T12:00:00', branch_id: 1, branch_name: 'Академия Старт', teacher_id: 2, teacher_name: 'Демьян', paid_children: 4, trial_children: 2, revenue: 3000, teacher_salary: 1000, instruction_name: 'Робот' };
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
const setup = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Lessons /><Location /></MemoryRouter>);
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-11T12:00:00'));
  useAuth.mockReturnValue({ isOwner: true, user: { profile: { id: 1 } } });
  apiClient.get.mockImplementation(async url => ({ data: { ok: true, data: { items: url.startsWith('/lessons?') ? [lesson] : [] } } }));
});
afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });

test('calendar is default, events open a preview, and adding in a day prefills its date', async () => {
  setup();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Календарь' })).toHaveAttribute('aria-pressed', 'true'));
  const event = await screen.findByRole('button', { name: '12:00, Академия Старт, Демьян' });
  fireEvent.click(event);
  expect(within(screen.getByRole('dialog', { name: 'Занятие' })).getByText('Робот')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть окно' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Добавить занятие на 9 сент.' })[0]);
  expect(screen.getByTestId('form-date')).toHaveTextContent('2026-09-09T10:00');
  fireEvent.click(screen.getByRole('button', { name: 'Отмена формы' }));
  fireEvent.click(screen.getByRole('button', { name: 'Список' }));
  expect(screen.getByRole('button', { name: 'Список' })).toHaveAttribute('aria-pressed', 'true');
  expect(apiClient.put).not.toHaveBeenCalled(); expect(apiClient.delete).not.toHaveBeenCalled();
});

test('teacher preview keeps salary but excludes owner financial actions', async () => {
  useAuth.mockReturnValue({ isOwner: false, user: { profile: { id: 2 } } });
  setup();
  fireEvent.click(await screen.findByRole('button', { name: '12:00, Академия Старт, Демьян' }));
  const preview = within(screen.getByRole('dialog', { name: 'Занятие' }));
  expect(preview.getByText('Зарплата преподавателя')).toBeInTheDocument();
  expect(preview.queryByText('Выручка')).not.toBeInTheDocument();
  expect(preview.queryByRole('button', { name: 'Удалить занятие' })).not.toBeInTheDocument();
  expect(preview.queryByRole('button', { name: 'Без зарплаты' })).not.toBeInTheDocument();
});

test('issuing an invoice opens the new accounting editor for the selected branch and month', async () => {
  setup();
  await waitFor(() => expect(screen.getByRole('button', { name: /Выставить счета/ })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: /Выставить счета/ }));
  const dialog = within(screen.getByRole('dialog', { name: 'Счета по филиалам' }));
  fireEvent.click(dialog.getByRole('button', { name: /Академия Старт/ }));
  expect(screen.getByTestId('location')).toHaveTextContent('/accounting/invoices?month=2026-09&branch_id=1&create=1');
});
