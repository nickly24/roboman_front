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

const progress = {
  enabled: true, plan_name: 'Робототехника', closed_lessons: 0, total_lessons: 3,
  current_lesson: { id: 11, name: 'Робот', module_name: 'Первый модуль', images: [] },
  next_lesson: { id: 12, name: 'Мотоцикл', module_name: 'Второй модуль', images: [] },
};
const mockProgress = value => apiClient.get.mockImplementation(async url => ({ data: { ok: true, data: url.includes('curriculum') ? value : { items: [{ id: 1, name: 'Сад' }, { id: 2, full_name: 'Преподаватель', status: 'working' }] } } }));

test.each([true, false])('help creation for owner=%s has no attendance, materials or curriculum payload', async isOwner => {
  useAuth.mockReturnValue({ isOwner, user: { profile: { id: 2 } } });
  mockProgress(progress);
  const onSuccess = jest.fn();
  render(<LessonForm initialValues={{ branch_id: 1, teacher_id: 2 }} onSuccess={onSuccess} />);
  await screen.findByText('Робототехника');
  fireEvent.change(screen.getByLabelText(/Платные дети/), { target: { value: '8' } });
  fireEvent.change(screen.getByLabelText(/Тип записи/), { target: { value: 'HELP' } });
  fireEvent.change(screen.getByLabelText(/^Дата/), { target: { value: '2026-09-22' } });
  expect(screen.queryByLabelText(/Платные дети/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Пробные дети/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Инструкция')).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Как отметить занятие/)).not.toBeInTheDocument();
  expect(screen.queryByText('Занятие от 10 чел.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Создать' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(apiClient.post).toHaveBeenCalledWith('/lessons', {
    lesson_type: 'HELP', branch_id: 1, starts_at: '2026-09-22T00:00', ...(isOwner ? { teacher_id: 2 } : {}),
  });
});

test.each([true, false])('help editing for owner=%s preserves the type and snapshotted rate', async isOwner => {
  useAuth.mockReturnValue({ isOwner, user: { profile: { id: 2 } } });
  const onSuccess = jest.fn();
  render(<LessonForm lesson={{ id: 8, lesson_type: 'HELP', branch_id: 1, teacher_id: 2, starts_at: '2026-09-22T00:00:00', help_rate_snapshot: 500 }} onSuccess={onSuccess} />);
  expect(screen.getByLabelText(/Тип записи/)).toBeDisabled();
  expect(screen.getByText(/Стоимость помощи при создании: 500/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Пересчитать цену' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Дата/), { target: { value: '2026-09-23' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(apiClient.put).toHaveBeenCalledWith('/lessons/8', { starts_at: '2026-09-23T00:00', ...(isOwner ? { teacher_id: 2 } : {}) });
});

test('skip to next previews the actual lesson and guards against stale curriculum progress', async () => {
  useAuth.mockReturnValue({ isOwner: true, user: { profile: { id: 2 } } });
  mockProgress(progress);
  const onSuccess = jest.fn();
  render(<LessonForm initialValues={{ branch_id: 1, teacher_id: 2, starts_at: '2026-09-22T10:00' }} onSuccess={onSuccess} />);
  await screen.findByText('Робототехника');
  fireEvent.change(screen.getByLabelText(/Как отметить занятие/), { target: { value: 'SKIP_TO_NEXT' } });
  expect(screen.getByRole('heading', { name: 'Мотоцикл' })).toBeInTheDocument();
  expect(screen.getByText(/Урок «Робот» будет пропущен/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Создать' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(apiClient.post).toHaveBeenCalledWith('/lessons', expect.objectContaining({ curriculum_mode: 'SKIP_TO_NEXT', curriculum_lesson_id: 12, curriculum_expected_lesson_id: 11 }));
});

test('last curriculum lesson does not offer a jump without a next lesson', async () => {
  useAuth.mockReturnValue({ isOwner: true, user: { profile: { id: 2 } } });
  mockProgress({ ...progress, next_lesson: null });
  render(<LessonForm initialValues={{ branch_id: 1 }} />);
  await screen.findByText('Робототехника');
  expect(screen.queryByRole('option', { name: 'Пропустить текущий и провести следующий урок' })).not.toBeInTheDocument();
});

test('switching back from help reloads progress and blocks submission until the plan is ready', async () => {
  useAuth.mockReturnValue({ isOwner: true, user: { profile: { id: 2 } } });
  let resolveProgress;
  apiClient.get.mockImplementation(url => url.includes('curriculum')
    ? new Promise(resolve => { resolveProgress = resolve; })
    : Promise.resolve({ data: { ok: true, data: { items: [] } } }));
  render(<LessonForm initialValues={{ lesson_type: 'HELP', branch_id: 1, teacher_id: 2, starts_at: '2026-09-22T10:00' }} />);
  expect(screen.getByRole('button', { name: 'Создать' })).toBeEnabled();
  expect(apiClient.get.mock.calls.some(([url]) => url.includes('curriculum'))).toBe(false);
  fireEvent.change(screen.getByLabelText(/Тип записи/), { target: { value: 'LESSON' } });
  expect(screen.getByRole('button', { name: 'Создать' })).toBeDisabled();
  resolveProgress({ data: { ok: true, data: progress } });
  await screen.findByText('Робототехника');
  expect(screen.getByLabelText(/Как отметить занятие/)).toHaveValue('PLAN');
  expect(screen.getByRole('button', { name: 'Создать' })).toBeEnabled();
  expect(screen.getByLabelText(/Платные дети/)).toBeInTheDocument();
});
