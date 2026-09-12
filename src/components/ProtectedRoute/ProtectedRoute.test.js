import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));

function visit(path, role, requireRole) {
  useAuth.mockReturnValue({ isAuthenticated: !!role, loading: false, user: { role }, crmAccess: false });
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path={path} element={<ProtectedRoute requireRole={requireRole}><div>Защищенное содержимое</div></ProtectedRoute>} />
    {path !== '/branch/overview' && <Route path="/branch/overview" element={<div>Обзор сада</div>} />}
    <Route path="/dashboard" element={<div>Рабочий обзор</div>} />
    <Route path="/login" element={<div>Вход</div>} />
  </Routes></MemoryRouter>);
}

test.each(['/lessons', '/calendar', '/instructions', '/accounting/invoices', '/branch-accounts'])('сад не попадает в общий маршрут %s', path => {
  visit(path, 'BRANCH');
  expect(screen.getByText('Обзор сада')).toBeInTheDocument();
  expect(screen.queryByText('Защищенное содержимое')).not.toBeInTheDocument();
});

test('представитель сада открывает свой кабинет', () => {
  visit('/branch/lessons', 'BRANCH', 'BRANCH');
  expect(screen.getByText('Защищенное содержимое')).toBeInTheDocument();
});

test('преподаватель не открывает кабинет сада', () => {
  visit('/branch/lessons', 'TEACHER', 'BRANCH');
  expect(screen.getByText('Рабочий обзор')).toBeInTheDocument();
});

test('владелец открывает счета', () => {
  visit('/accounting/invoices', 'OWNER', 'OWNER');
  expect(screen.getByText('Защищенное содержимое')).toBeInTheDocument();
});
