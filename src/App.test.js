import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

jest.mock('./services/authService', () => ({
  authService: {
    getStoredUser: () => null,
    isAuthenticated: () => false,
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

test('redirects an unauthenticated user to login', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'С возвращением' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
});
