import React from 'react';
import { render, screen, within } from '@testing-library/react';
import TeacherDashboard from './TeacherDashboard';
import apiClient from '../../services/api';

jest.mock('../../services/api', () => ({ get: jest.fn() }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { profile: { id: 2 } } }) }));
jest.mock('../../hooks/useMediaQuery', () => () => false);

test('teacher payroll includes help in both pay periods while showing separate counts and no children', async () => {
  const lessons = [
    { id: 1, starts_at: '2026-09-10T10:00:00', branch_name: 'Ромашка', paid_children: 5, total_children: 5, instruction_name: 'Робот', teacher_salary: 1200 },
    { id: 2, lesson_type: 'HELP', starts_at: '2026-09-15T00:00:00', branch_name: 'Ромашка', teacher_salary: 500 },
    { id: 3, lesson_type: 'HELP', starts_at: '2026-09-22T00:00:00', branch_name: 'Ромашка', teacher_salary: 700 },
  ];
  apiClient.get.mockImplementation(async url => ({ data: { ok: true, data: url.startsWith('/dashboard')
    ? { kpi: { salary_sum: 2400, lessons_count: 1, help_count: 2, total_children_sum: 5 }, total: { total_lessons_count: 1, total_help_count: 2 } }
    : url.startsWith('/salary') ? { total_salary: 2400, by_department: [] } : { items: url.startsWith('/lessons?') ? lessons : [] } } }));
  render(<TeacherDashboard />);
  const first = await screen.findByText('1 занятий · помощь: 1');
  expect(first.parentElement).toHaveTextContent('1 700 ₽');
  const second = screen.getByText('0 занятий · помощь: 1');
  expect(second.parentElement).toHaveTextContent('700 ₽');
  const helpRows = screen.getAllByRole('row', { name: /Помощь/ });
  expect(helpRows).toHaveLength(2);
  helpRows.forEach(row => expect(within(row).getAllByRole('cell', { name: '—' })).toHaveLength(3));
  helpRows.forEach(row => expect(row).not.toHaveTextContent('00:00'));
});
