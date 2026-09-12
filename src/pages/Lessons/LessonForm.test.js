import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LessonForm from './LessonForm';
import apiClient from '../../services/api';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../services/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));

beforeEach(() => {
  URL.revokeObjectURL = jest.fn();
  apiClient.get.mockImplementation(async url => ({ data: { ok: true, data: url.includes('curriculum') ? { enabled: false } : { items: [{ id: 1, name: 'Сад' }, { id: 2, full_name: 'Преподаватель', status: 'working' }] } } }));
  apiClient.post.mockResolvedValue({ data: { ok: true } });
  apiClient.put.mockResolvedValue({ data: { ok: true } });
});
afterEach(() => jest.clearAllMocks());

describe.each([true, false])('wall-clock form for owner=%s', isOwner => {
  test.each(['2026-09-12T16:00', '2026-09-01T00:30', '2026-09-30T23:45', '2026-03-08T02:30'])('create and repeated edits preserve %s', async entered => {
    useAuth.mockReturnValue({ isOwner, user: { profile: { id: 2 } } });
    const onSuccess = jest.fn();
    let view = render(<LessonForm initialValues={{ branch_id: 1, teacher_id: 2 }} onSuccess={onSuccess} />);
    await waitFor(() => expect(screen.queryByText('Загрузка учебного плана…')).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Дата и время/), { target: { value: entered } });
    fireEvent.change(screen.getByLabelText(/Платные дети/), { target: { value: '1' } });
    fireEvent.click(screen.getByLabelText('Творческое занятие'));
    fireEvent.click(screen.getByRole('button', { name: 'Создать' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith('/lessons', expect.objectContaining({ starts_at: entered }));
    view.unmount();

    let saved = { id: 7, branch_id: 1, teacher_id: 2, paid_children: 1, trial_children: 0, is_creative: true, starts_at: `${entered}:00` };
    for (let edit = 0; edit < 2; edit += 1) {
      view = render(<LessonForm lesson={saved} onSuccess={onSuccess} />);
      expect(screen.getByLabelText(/Дата и время/)).toHaveValue(entered);
      fireEvent.change(screen.getByLabelText(/Платные дети/), { target: { value: String(edit + 2) } });
      fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(edit + 2));
      const [, payload] = apiClient.put.mock.calls[edit];
      expect(payload.starts_at).toBe(entered);
      saved = { ...saved, ...payload, starts_at: `${payload.starts_at}:00` };
      view.unmount();
    }
  });
});
