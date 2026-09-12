import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../services/authService';

jest.mock('../services/authService', () => ({ authService: {
  isAuthenticated: jest.fn(), getCurrentUser: jest.fn(), getStoredUser: jest.fn(),
} }));

function CurrentAccess() {
  const { loading, isAuthenticated, isOwner, isBranch } = useAuth();
  return <div>{loading ? 'Проверка сессии' : !isAuthenticated ? 'Требуется вход' : isBranch ? 'Кабинет сада' : isOwner ? 'Владелец' : 'Преподаватель'}</div>;
}

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

test('при восстановлении сессии используется роль сервера, а не сохраненная роль владельца', async () => {
  localStorage.setItem('auth_token', 'opaque-session');
  localStorage.setItem('user_data', JSON.stringify({ role: 'OWNER' }));
  authService.isAuthenticated.mockReturnValue(true);
  let resolve;
  authService.getCurrentUser.mockReturnValue(new Promise(done => { resolve = done; }));
  render(<AuthProvider><CurrentAccess /></AuthProvider>);
  expect(screen.getByText('Проверка сессии')).toBeInTheDocument();
  expect(screen.queryByText('Владелец')).not.toBeInTheDocument();
  resolve({ user: { id: 9, role: 'BRANCH', branch_id: 3 }, profile: { name: 'Наш сад' } });
  expect(await screen.findByText('Кабинет сада')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('user_data')).role).toBe('BRANCH');
});

test('отозванная сессия очищает сохраненную учетную запись', async () => {
  localStorage.setItem('auth_token', 'revoked-session');
  localStorage.setItem('user_data', JSON.stringify({ role: 'OWNER' }));
  authService.isAuthenticated.mockReturnValue(true);
  authService.getCurrentUser.mockRejectedValue(new Error('revoked'));
  render(<AuthProvider><CurrentAccess /></AuthProvider>);
  expect(await screen.findByText('Требуется вход')).toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem('auth_token')).toBeNull());
  expect(localStorage.getItem('user_data')).toBeNull();
});

test('без токена API сессии не вызывается', () => {
  authService.isAuthenticated.mockReturnValue(false);
  render(<AuthProvider><CurrentAccess /></AuthProvider>);
  expect(screen.getByText('Требуется вход')).toBeInTheDocument();
  expect(authService.getCurrentUser).not.toHaveBeenCalled();
});
