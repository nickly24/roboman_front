import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Calendar from './Calendar';
import apiClient from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useMediaQuery from '../../hooks/useMediaQuery';

jest.mock('../../services/api', () => ({ get: jest.fn(), put: jest.fn(), post: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('../../hooks/useMediaQuery', () => jest.fn());
jest.mock('../Curriculum/CurriculumMaterials', () => ({ InstructionPane: ({ id }) => <div>Просмотр инструкции {id}</div> }));
const ok = data => ({ data: { ok: true, data } });
const item = { key: '1:2026-09-07', series_id: 1, week_start: '2026-09-07', version_id: 1, revision: 0, series_revision: 1, branch_id: 1, branch_name: 'Академия Старт', address: 'Москва', department_id: 1, department_name: 'Центр', starts_at: '2026-09-11T15:00:00', scheduled_starts_at: '2026-09-11T15:00:00', display_date: '2026-09-11', duration_minutes: 60, planned_teacher_id: 2, planned_teacher_name: 'Анна', confirmed_teacher_id: null, status: 'pending', responses: [], history: [], response_epoch: 1, can_respond: true, can_confirm: true, is_past: false, rule: { weekday: 5, starts_at: '15:00', teacher_id: 2, duration_minutes: 60 } };
const context = { branches: [{ id: 1, name: 'Академия Старт', address: 'Москва', department_id: 1, department_name: 'Центр', is_active: 1 }], teachers: [{ id: 2, branch_id: 1, full_name: 'Анна', status: 'working' }, { id: 3, branch_id: 1, full_name: 'Борис', status: 'working' }, { id: 4, branch_id: 1, full_name: 'В отпуске', status: 'vacation' }, { id: 5, branch_id: 2, full_name: 'Другой сад', status: 'working' }], today: '2026-09-11' };
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-11T09:00:00Z'));
  useAuth.mockReturnValue({ isOwner: true }); useMediaQuery.mockReturnValue(false);
  apiClient.get.mockImplementation(async url => ok(url === '/calendar/context' ? context : url.startsWith('/calendar/week') ? { items: [item], today: '2026-09-11' } : item));
  apiClient.put.mockResolvedValue(ok(item)); apiClient.post.mockResolvedValue(ok(item));
});
afterEach(async () => { await act(async () => {}); jest.useRealTimers(); jest.clearAllMocks(); });

const click = async element => { await act(async () => { fireEvent.click(element); }); };

async function openEvent() {
  await click(await screen.findByRole('button', { name: 'Академия Старт, 15:00, Ждём ответа' }));
  return screen.findByRole('button', { name: 'Перенести / изменить' });
}

test('owner sees a weekly calendar, switches weeks and opens distinct single-date and series forms', async () => {
  await act(async () => { render(<Calendar />); });
  await openEvent();
  await click(screen.getByRole('button', { name: 'Перенести / изменить' }));
  const move = within(screen.getByRole('dialog', { name: 'Перенести эту дату' }));
  expect(move.getByText(/Изменится только эта дата/)).toBeInTheDocument();
  expect(move.getByLabelText(/Начало/)).toHaveValue('15:00');
  await click(move.getByRole('button', { name: 'Отмена' }));
  await click(await screen.findByRole('button', { name: 'Эта и следующие недели' }));
  expect(screen.getByRole('button', { name: 'Начиная с недели' })).toBeInTheDocument();
  expect(screen.getByText(/Индивидуальные переносы и отмены сохранятся/)).toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Отмена' }));
  await click(await screen.findByRole('button', { name: 'Закрыть окно' }));
  await click(screen.getByRole('button', { name: 'Следующая неделя' }));
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/calendar/week?start=2026-09-14', expect.anything()));
  expect(apiClient.post).not.toHaveBeenCalled(); expect(apiClient.put).not.toHaveBeenCalled();
});

test('teacher can confirm this occurrence, cannot edit rules, and decline opens a comment form', async () => {
  useAuth.mockReturnValue({ isOwner: false });
  await act(async () => { render(<Calendar />); });
  await click(await screen.findByRole('button', { name: 'Я приду' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/calendar/occurrences/1/2026-09-07/response', { revision: 0, version_id: 1, answer: 'confirmed' }));
  expect(screen.queryByRole('button', { name: 'Регулярное занятие' })).not.toBeInTheDocument();
  await click(await screen.findByRole('button', { name: 'Академия Старт, 15:00, Ждём ответа' }));
  expect(screen.queryByRole('button', { name: 'Плановый преподаватель' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Подтвердить приход' })).not.toBeInTheDocument();
  await click(await screen.findByRole('button', { name: 'Не смогу' }));
  expect(screen.getByLabelText('Комментарий для команды')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Эта и следующие недели' })).not.toBeInTheDocument();
});

test('stale update returns to refreshed details and displays the conflict', async () => {
  apiClient.put.mockRejectedValue({ response: { status: 409, data: { error: { message: 'Занятие уже изменилось' } } } });
  await act(async () => { render(<Calendar />); });
  await openEvent();
  await click(screen.getByRole('button', { name: 'Перенести / изменить' }));
  await click(screen.getByRole('button', { name: 'Сохранить эту дату' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Перенести эту дату' })).not.toBeInTheDocument());
  expect(screen.getByRole('alert')).toHaveTextContent('Занятие уже изменилось');
  await screen.findByRole('button', { name: 'Перенести / изменить' });
});

test('mobile displays selected-day agenda and status filters do not mutate data', async () => {
  useMediaQuery.mockReturnValue(true);
  await act(async () => { render(<Calendar />); });
  await screen.findByRole('button', { name: 'Академия Старт, 15:00, Ждём ответа' });
  await click(screen.getByRole('button', { name: /Нужна замена 0/ }));
  expect(screen.getByText('Нет занятий с этими фильтрами')).toBeInTheDocument();
  await click(screen.getByRole('button', { name: /Все 1/ }));
  await click(screen.getByRole('button', { name: 'четверг, 10 сентября' }));
  expect(screen.getByText('На этот день занятий нет')).toBeInTheDocument();
  expect(apiClient.post).not.toHaveBeenCalled(); expect(apiClient.put).not.toHaveBeenCalled();
});

test('week picker closes independently and series save sends an explicit effective week', async () => {
  apiClient.put.mockResolvedValue(ok({ week_start: '2026-09-14' }));
  await act(async () => { render(<Calendar />); });
  await openEvent();
  await click(screen.getByRole('button', { name: 'Эта и следующие недели' }));
  await click(screen.getByRole('button', { name: 'Начиная с недели' }));
  fireEvent.keyDown(screen.getByRole('dialog', { name: 'Начиная с недели' }), { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Начиная с недели' })).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Изменить будущие недели' })).toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Начиная с недели' }));
  await click(screen.getByRole('button', { name: '14 сентября 2026 г.' }));
  await click(screen.getByRole('button', { name: 'Применить с выбранной недели' }));
  expect(apiClient.put).toHaveBeenCalledWith('/calendar/series/1', expect.objectContaining({ effective_week: '2026-09-14', starts_at: '2026-09-18T15:00', revision: 1 }));
});

test('owner confirms any working teacher, including another garden', async () => {
  await act(async () => { render(<Calendar />); });
  await openEvent();
  await click(screen.getByRole('button', { name: 'Подтвердить приход' }));
  const form = within(screen.getByRole('dialog', { name: 'Подтвердить приход преподавателя' }));
  await click(form.getByRole('button', { name: /Преподаватель/ }));
  expect(form.queryByRole('option', { name: /В отпуске/ })).not.toBeInTheDocument();
  await click(form.getByRole('option', { name: 'Другой сад' }));
  fireEvent.change(form.getByLabelText('Комментарий для команды'), { target: { value: 'Созвонились' } });
  await click(form.getByRole('button', { name: 'Подтвердить приход' }));
  expect(apiClient.post).toHaveBeenCalledWith('/calendar/occurrences/1/2026-09-07/response', { revision: 0, version_id: 1, answer: 'confirmed', teacher_id: 5, note: 'Созвонились', replace_confirmed_teacher_id: null });
  expect(apiClient.put).not.toHaveBeenCalled();
});

test('planned teacher editor changes only the selected date and can clear assignment', async () => {
  await act(async () => { render(<Calendar />); });
  await openEvent();
  await click(screen.getByRole('button', { name: 'Плановый преподаватель' }));
  const form = within(screen.getByRole('dialog', { name: 'Плановый преподаватель на эту дату' }));
  expect(form.queryByLabelText(/Начало/)).not.toBeInTheDocument();
  expect(form.getByText(/Для следующих недель останется регулярное правило/)).toBeInTheDocument();
  await click(form.getByRole('button', { name: 'Плановый преподаватель' }));
  await click(form.getByRole('option', { name: 'Без назначения' }));
  await click(form.getByRole('button', { name: 'Сохранить назначение' }));
  expect(apiClient.put).toHaveBeenCalledWith('/calendar/occurrences/1/2026-09-07', { revision: 0, version_id: 1, action: 'assign', teacher_id: null, note: '' });
  expect(apiClient.post).not.toHaveBeenCalled();
});

test('owner decline targets a selected teacher and includes their reason', async () => {
  await act(async () => { render(<Calendar />); });
  await openEvent();
  await click(screen.getByRole('button', { name: 'Не придёт' }));
  const form = within(screen.getByRole('dialog', { name: 'Отметить, что преподаватель не придёт' }));
  await click(form.getByRole('button', { name: /Преподаватель/ }));
  expect(form.getByRole('option', { name: /В отпуске/ })).toBeInTheDocument();
  await click(form.getByRole('option', { name: 'Анна' }));
  fireEvent.change(form.getByLabelText('Причина / комментарий'), { target: { value: 'Заболела' } });
  await click(form.getByRole('button', { name: 'Отметить отказ' }));
  expect(apiClient.post).toHaveBeenCalledWith('/calendar/occurrences/1/2026-09-07/response', { revision: 0, version_id: 1, answer: 'declined', teacher_id: 2, note: 'Заболела' });
});

test('replacement preview names previous teacher and sends an explicit replacement target', async () => {
  const confirmed = { ...item, status: 'confirmed', confirmed_teacher_id: 2, confirmed_teacher_name: 'Анна', revision: 3 };
  apiClient.get.mockImplementation(async url => ok(url === '/calendar/context' ? context : url.startsWith('/calendar/week') ? { items: [confirmed], today: '2026-09-11' } : confirmed));
  await act(async () => { render(<Calendar />); });
  await click(await screen.findByRole('button', { name: 'Академия Старт, 15:00, Подтверждено' }));
  await click(await screen.findByRole('button', { name: 'Подтвердить приход' }));
  const form = within(screen.getByRole('dialog', { name: 'Подтвердить приход преподавателя' }));
  await click(form.getByRole('button', { name: /Преподаватель/ }));
  await click(form.getByRole('option', { name: 'Борис' }));
  expect(form.getByText('Анна → Борис')).toBeInTheDocument();
  expect(form.getByText(/Прежнее подтверждение останется в истории/)).toBeInTheDocument();
  expect(apiClient.post).not.toHaveBeenCalled();
  await click(form.getByRole('button', { name: 'Подтвердить замену' }));
  expect(apiClient.post).toHaveBeenCalledWith('/calendar/occurrences/1/2026-09-07/response', { revision: 3, version_id: 1, answer: 'confirmed', teacher_id: 3, note: '', replace_confirmed_teacher_id: 2 });
});

test('teacher sees administrator attribution and can still decline their appointment', async () => {
  useAuth.mockReturnValue({ isOwner: false });
  const answer = { id: 1, teacher_id: 2, teacher_name: 'Анна', answer: 'confirmed', actor_role: 'OWNER', actor_name: 'Николай', created_at: '2026-09-11T10:00:00' };
  const confirmed = { ...item, status: 'confirmed', confirmed_teacher_id: 2, confirmed_teacher_name: 'Анна', confirmed_response: answer, my_response: answer, responses: [answer], history: [{ id: 1, action: 'confirmed', actor_name: 'Николай', created_at: answer.created_at, details: { teacher_name: 'Анна', actor_role: 'OWNER' } }] };
  apiClient.get.mockImplementation(async url => ok(url === '/calendar/context' ? context : url.startsWith('/calendar/week') ? { items: [confirmed], today: '2026-09-11' } : confirmed));
  await act(async () => { render(<Calendar />); });
  expect(await screen.findByText('Подтвердил администратор')).toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Академия Старт, 15:00, Подтверждено' }));
  expect(await screen.findByText('Приход подтвердил администратор')).toBeInTheDocument();
  expect(screen.getByText('Отметил администратор · Николай')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Не смогу' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Плановый преподаватель' })).not.toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'История' }));
  expect(screen.getByText(/Анна · Администратор Николай/)).toBeInTheDocument();
});

test.each([
  ['Перенести / изменить', 'Сохранить эту дату', '/calendar/occurrences/1/2026-09-07', 'put'],
  ['Эта и следующие недели', 'Применить с выбранной недели', '/calendar/series/1', 'put'],
  ['Регулярное занятие', 'Создать повторение', '/calendar/series', 'post'],
])('global teacher choice is available in %s', async (action, save, url, method) => {
  await act(async () => { render(<Calendar />); });
  if (method !== 'post') await openEvent();
  await click(await screen.findByRole('button', { name: action }));
  if (method === 'post') {
    await click(screen.getByRole('button', { name: /Сад \/ филиал/ }));
    await click(screen.getByRole('option', { name: 'Академия Старт' }));
    fireEvent.change(screen.getByLabelText(/Начало/), { target: { value: '17:00' } });
  }
  await click(screen.getByRole('button', { name: 'Плановый преподаватель' }));
  expect(screen.queryByRole('option', { name: /В отпуске/ })).not.toBeInTheDocument();
  await click(screen.getByRole('option', { name: 'Другой сад' }));
  await click(screen.getByRole('button', { name: save }));
  expect(apiClient[method]).toHaveBeenCalledWith(url, expect.objectContaining({ teacher_id: '5' }));
});

test('teacher can discover a foreign replacement in filters and claim it on mobile', async () => {
  useAuth.mockReturnValue({ isOwner: false }); useMediaQuery.mockReturnValue(true);
  const open = { ...item, key: '8:2026-09-07', series_id: 8, branch_id: 8, branch_name: 'Новый сад', address: 'Новая улица, 12', department_id: 8, department_name: 'Другой отдел', status: 'replacement', is_external_replacement: true, is_personal: false, can_confirm: true, can_respond: false };
  const response = { id: 8, teacher_id: 9, teacher_name: 'Замещающий', answer: 'confirmed', actor_role: 'TEACHER', created_at: '2026-09-11T12:00:00' };
  const taken = { ...open, status: 'confirmed', is_external_replacement: false, is_personal: true, confirmed_teacher_id: 9, confirmed_teacher_name: 'Замещающий', confirmed_response: response, my_response: response, responses: [response], can_respond: true };
  let claimed = false;
  apiClient.get.mockImplementation(async url => ok(url === '/calendar/context' ? context : url.startsWith('/calendar/week') ? { items: [item, claimed ? taken : open], today: '2026-09-11' } : claimed ? taken : open));
  apiClient.post.mockImplementation(async () => { claimed = true; return ok(taken); });
  await act(async () => { render(<Calendar />); });
  expect(await screen.findByText('Открытая замена')).toBeInTheDocument();
  expect(screen.getByText('Новая улица, 12')).toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Все филиалы' }));
  await click(screen.getByRole('option', { name: 'Новый сад' }));
  await click(screen.getByRole('button', { name: 'Показать результаты' }));
  expect(screen.queryByRole('button', { name: 'Академия Старт, 15:00, Ждём ответа' })).not.toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Новый сад, 15:00, Нужна замена' }));
  const detail = within(await screen.findByRole('dialog', { name: 'Занятие в календаре' }));
  expect(detail.queryByRole('button', { name: 'Не смогу' })).not.toBeInTheDocument();
  expect(detail.getByText(/Эту замену может взять любой работающий преподаватель/)).toBeInTheDocument();
  await click(detail.getByRole('button', { name: 'Взять замену' }));
  expect(apiClient.post).toHaveBeenCalledWith('/calendar/occurrences/8/2026-09-07/response', { revision: 0, version_id: 1, answer: 'confirmed' });
  expect(await screen.findByText('Вы подтвердили приход')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Не смогу' })).toBeInTheDocument();
  expect(screen.queryByText('Открытая замена')).not.toBeInTheDocument();
});

test.each([true, false])('forecast and instruction are available without saving, owner=%s', async isOwner => {
  useAuth.mockReturnValue({ isOwner });
  const projected = { ...item, learning: { kind: 'forecast', title: 'Робот-художник', instruction_id: 20, instruction_name: 'Схема сборки художника', plan_id: 5, plan_name: 'Робототехника', module_name: 'Механизмы', curriculum_lesson_id: 12 } };
  apiClient.get.mockImplementation(async url => ok(url === '/calendar/context' ? context : url.startsWith('/calendar/week') ? { items: [projected], today: context.today } : projected));
  await act(async () => { render(<Calendar />); });
  expect(await screen.findByText('По плану · прогноз')).toBeInTheDocument();
  expect(screen.getByText('Робот-художник')).toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Академия Старт, 15:00, Ждём ответа' }));
  const detail = within(await screen.findByRole('dialog', { name: 'Занятие в календаре' }));
  expect(await detail.findByText('Ожидаемое занятие по плану')).toBeInTheDocument();
  expect(detail.getByRole('link', { name: 'Карточка занятия' })).toHaveAttribute('href', '/curriculum?plan=5&lesson=12');
  await click(detail.getByRole('button', { name: 'Схема сборки художника' }));
  const preview = within(screen.getByRole('dialog', { name: 'Схема сборки художника' }));
  expect(preview.getByText('Просмотр инструкции 20')).toBeInTheDocument();
  await click(preview.getByRole('button', { name: 'Закрыть окно' }));
  expect(screen.getByRole('dialog', { name: 'Занятие в календаре' })).toBeInTheDocument();
  expect(apiClient.post).not.toHaveBeenCalled(); expect(apiClient.put).not.toHaveBeenCalled();
});

test('recorded history shows actual teacher and lesson on mobile without scheduling actions', async () => {
  useMediaQuery.mockReturnValue(true);
  const actual = { ...item, key: 'lesson:67', is_journal_only: true, journal_lesson_id: 67, duration_minutes: null, is_cancelled: 0, is_past: true, can_confirm: false, status: 'recorded', learning: { kind: 'actual', title: 'Карусель', starts_at: item.starts_at, teacher_id: 98, teacher_name: 'Бывший преподаватель', instruction_id: 15, instruction_name: 'Сборка карусели', match: 'journal' } };
  apiClient.get.mockImplementation(async url => ok(url === '/calendar/context' ? context : url.startsWith('/calendar/week') ? { items: [actual], today: context.today } : actual));
  await act(async () => { render(<Calendar />); });
  const card = await screen.findByRole('button', { name: 'Академия Старт, 15:00, Проведено' });
  expect(within(card).getByText('Бывший преподаватель')).toBeInTheDocument();
  expect(within(card).queryByText('Анна')).not.toBeInTheDocument();
  expect(within(card).getByText('Карусель')).toBeInTheDocument();
  expect(screen.getByText('1 проведено по журналу')).toBeInTheDocument();
  await click(card);
  const detail = within(await screen.findByRole('dialog', { name: 'Занятие в календаре' }));
  await detail.findByText('По журналу занятий');
  expect(apiClient.get).toHaveBeenCalledWith('/calendar/recorded-lessons/67', expect.anything());
  expect(detail.getByText('Провёл занятие')).toBeInTheDocument();
  expect(detail.queryByText('0', { exact: true })).not.toBeInTheDocument();
  expect(detail.queryByRole('button', { name: 'Эта и следующие недели' })).not.toBeInTheDocument();
  expect(detail.queryByRole('button', { name: 'Подтвердить приход' })).not.toBeInTheDocument();
  expect(detail.queryByText('Нет подтверждения')).not.toBeInTheDocument();
  expect(apiClient.post).not.toHaveBeenCalled(); expect(apiClient.put).not.toHaveBeenCalled();
});
