import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Analytics from './Analytics';
import apiClient from '../../services/api';

jest.mock('../../services/api', () => ({ get: jest.fn() }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/DepartmentSelector/DepartmentSelector', () => () => null);
jest.mock('../../hooks/useMediaQuery', () => () => false);
jest.mock('recharts', () => ({ ResponsiveContainer: () => null }));

test('analytics deducts help pay and keeps attendance averages based on teaching lessons', async () => {
  const lessons = [
    { id: 1, starts_at: '2026-09-22T10:00:00', branch_id: 1, teacher_id: 2, revenue: 3000, paid_children: 5, total_children: 5, teacher_salary: 1200, price_snapshot: 600 },
    { id: 2, lesson_type: 'HELP', starts_at: '2026-09-22T00:00:00', branch_id: 1, teacher_id: 2, teacher_salary: 500, help_rate_snapshot: 500 },
  ];
  apiClient.get.mockImplementation(async url => ({ data: { ok: true, data: url.startsWith('/dashboard') ? { kpi: {} } : { items: url.startsWith('/lessons?') ? lessons : [] } } }));
  render(<Analytics />);
  expect((await screen.findByText('Прибыль')).parentElement).toHaveTextContent('1 300 ₽');
  fireEvent.click(screen.getByRole('button', { name: 'Коэффициенты' }));
  expect(screen.getByText('Среднее детей/занятие (общее)').parentElement).toHaveTextContent('5.0');
  expect(screen.getByText('Выручка на занятие').parentElement).toHaveTextContent('3 000 ₽');
});
