import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import App from './App';
import { authService } from './services/authService';
import certificateService from './services/certificateService';

jest.mock('./services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock('./services/authService', () => ({ authService: { isAuthenticated: jest.fn(), getCurrentUser: jest.fn(), login: jest.fn(), logout: jest.fn() } }));
jest.mock('./services/certificateService', () => ({ __esModule: true, default: { public: jest.fn(), mine: jest.fn(), list: jest.fn(), teachers: jest.fn(), media: jest.fn() } }));
jest.mock('./pages/Dashboard/TeacherDashboard', () => () => <h1>Кабинет преподавателя</h1>);
jest.mock('./pages/Dashboard/OwnerDashboard', () => () => <h1>Кабинет владельца</h1>);
jest.mock('./pages/BranchPortal/BranchPortal', () => () => <h1>Кабинет сада</h1>);

const certificate = { number: 'ITC-0001', teacher_name: 'Анна Сергеева', status: 'published', description: 'Преподаватель робототехники', has_photo: false, branches: [], public_url: 'http://localhost/certificates/token' };
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear();
  authService.isAuthenticated.mockReturnValue(false);
  certificateService.public.mockResolvedValue(certificate);
  certificateService.media.mockResolvedValue(new Blob(['image']));
  URL.createObjectURL = jest.fn(() => 'blob:certificate-image');
  URL.revokeObjectURL = jest.fn();
});
afterEach(() => { cleanup(); localStorage.clear(); window.history.replaceState({}, '', '/'); });

test('a direct public URL bypasses AuthProvider bootstrap even with an expired saved token', async () => {
  window.history.replaceState({}, '', '/certificates/token');
  localStorage.setItem('auth_token', 'expired-token');
  localStorage.setItem('user_data', JSON.stringify({ role: 'TEACHER' }));
  authService.isAuthenticated.mockReturnValue(true);
  authService.getCurrentUser.mockRejectedValue({ response: { status: 401 } });
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Анна Сергеева' })).toBeInTheDocument();
  expect(certificateService.public).toHaveBeenCalledWith('token', expect.any(AbortSignal));
  expect(authService.isAuthenticated).not.toHaveBeenCalled();
  expect(authService.getCurrentUser).not.toHaveBeenCalled();
  expect(localStorage.getItem('auth_token')).toBe('expired-token');
  expect(screen.queryByRole('heading', { name: 'С возвращением' })).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

test('an unauthenticated private certificate route still redirects to login', async () => {
  window.history.replaceState({}, '', '/my-certificate');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'С возвращением' })).toBeInTheDocument();
  expect(certificateService.mine).not.toHaveBeenCalled();
});

test.each([
  ['TEACHER', '/teacher-certificates', 'Кабинет преподавателя'],
  ['OWNER', '/my-certificate', 'Кабинет владельца'],
  ['BRANCH', '/teacher-certificates', 'Кабинет сада'],
  ['BRANCH', '/my-certificate', 'Кабинет сада'],
])('%s cannot access %s', async (role, path, heading) => {
  window.history.replaceState({}, '', path);
  authService.isAuthenticated.mockReturnValue(true);
  authService.getCurrentUser.mockResolvedValue({ user: { id: 1, role, login: 'demo' }, profile: {} });
  render(<App />);
  expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  expect(certificateService.mine).not.toHaveBeenCalled();
  expect(certificateService.list).not.toHaveBeenCalled();
});
