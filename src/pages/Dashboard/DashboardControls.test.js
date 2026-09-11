import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FiltersControl, PeriodControl } from './DashboardControls';
jest.mock('../../services/api', () => ({ get: jest.fn() }));

test('a reversed range is normalized and applied only on confirmation', () => {
  const onChange = jest.fn();
  render(<PeriodControl value={{ start: '2026-09', end: '2026-09' }} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'сентябрь 2026' }));
  fireEvent.click(screen.getByRole('button', { name: 'Диапазон' }));
  const panel = within(screen.getByRole('dialog'));
  fireEvent.click(panel.getByRole('button', { name: 'ноябрь 2026' }));
  expect(screen.getByRole('button', { name: 'Применить период' })).toBeDisabled();
  fireEvent.click(panel.getByRole('button', { name: 'август 2026' }));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Применить период' }));
  expect(onChange).toHaveBeenCalledWith({ start: '2026-08', end: '2026-11' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('filter drafts can be searched and dismissed without changing the report', () => {
  const onChange = jest.fn();
  render(<FiltersControl value={{}} onChange={onChange} options={{ branch_id: [{ value: '1', label: 'Академия Старт' }, { value: '2', label: 'Другой филиал' }] }} />);
  const trigger = screen.getByRole('button', { name: 'Все филиалы' });
  trigger.focus(); fireEvent.click(trigger);
  fireEvent.change(screen.getByRole('textbox', { name: 'Поиск: филиалы' }), { target: { value: 'Старт' } });
  expect(screen.queryByRole('option', { name: 'Другой филиал' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('option', { name: 'Академия Старт' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onChange).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  expect(screen.getByRole('option', { name: 'Все филиалы' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('option', { name: 'Академия Старт' }));
  fireEvent.click(screen.getByRole('button', { name: 'Показать результаты' }));
  expect(onChange).toHaveBeenCalledWith({ branch_id: '1' });
});
