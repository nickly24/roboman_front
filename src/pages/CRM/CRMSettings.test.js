import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CRMSettings from './CRMSettings';
import apiClient from '../../services/api';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
}));
jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));
jest.mock('../../hooks/useMediaQuery', () => () => false);

test('CRM keeps client management and search settings after removing messaging', async () => {
  apiClient.get.mockResolvedValue({ data: { ok: true, data: { aitunnel_configured: true } } });
  apiClient.put.mockResolvedValue({ data: { ok: true, data: { aitunnel_configured: true } } });

  render(
    <MemoryRouter initialEntries={['/crm/settings']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CRMSettings />
    </MemoryRouter>
  );

  expect(await screen.findByRole('heading', { name: 'Настройки CRM' })).toBeInTheDocument();
  const menu = within(screen.getByRole('navigation'));
  expect(menu.getAllByRole('link').map(link => link.textContent)).toEqual([
    'Филиалы в CRM', 'Поиск', 'Лиды', 'Холодная база', 'Настройки CRM',
  ]);
  expect(screen.queryByText(/Telegram|Токен PROD|Токен DEV/i)).not.toBeInTheDocument();
  expect(document.querySelectorAll('input')).toHaveLength(1);
  fireEvent.change(screen.getByPlaceholderText('sk-aitunnel-xxx'), { target: { value: 'search-key' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/crm/settings', { aitunnel_api_key: 'search-key' }));
  await waitFor(() => expect(screen.getByPlaceholderText('sk-aitunnel-xxx')).toHaveValue(''));
});
