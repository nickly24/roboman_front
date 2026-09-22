import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Settings from './Settings';
import apiClient from '../../services/api';

jest.mock('../../services/api', () => ({ get: jest.fn(), put: jest.fn() }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <div>{children}</div>);
beforeEach(() => {
  window.alert = jest.fn();
  apiClient.put.mockResolvedValue({ data: { ok: true } });
});
afterEach(() => jest.clearAllMocks());

test('the owner can save a help rate of zero without restoring salary defaults', async () => {
  apiClient.get.mockResolvedValue({ data: { ok: true, data: { items: [{ key: 'teacher_base_rate', value_int: 0 }, { key: 'teacher_threshold_children', value_int: 0 }, { key: 'teacher_bonus_per_child', value_int: 0 }, { key: 'teacher_help_rate', value_int: 700 }] } } });
  render(<Settings />);
  const rate = await screen.findByLabelText('Стоимость помощи (₽)');
  expect(rate).toHaveValue(700);
  fireEvent.change(rate, { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/settings/salary', { teacher_base_rate: 0, teacher_threshold_children: 0, teacher_bonus_per_child: 0, teacher_help_rate: 0 }));
});

test('an unset help rate remains unset when saving other settings', async () => {
  apiClient.get.mockResolvedValue({ data: { ok: true, data: { items: [{ key: 'teacher_help_rate', value_int: null }] } } });
  render(<Settings />);
  expect(await screen.findByLabelText('Стоимость помощи (₽)')).toHaveValue(null);
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
  expect(apiClient.put.mock.calls[0][1]).not.toHaveProperty('teacher_help_rate');
});
