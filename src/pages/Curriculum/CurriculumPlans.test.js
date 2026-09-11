import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CurriculumPlans from './CurriculumPlans';
import { CurriculumEditor } from './CurriculumEditor';
import apiClient from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { canMove } from './curriculumData';
jest.mock('../../services/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../components/Layout/Layout', () => ({ children }) => <main>{children}</main>);
const ok = data => ({ data: { ok: true, data } });
const lessons = [{ id: 11, module_id: 5, name: 'Мотоцикл', format_id: 1, format_name: 'Обычный', instruction_id: 7, instruction_name: 'Сборка мотоцикла', internal_description: 'Объяснить мотор', external_description: 'Собираем мотоцикл', is_used: 1, images: [] }, { id: 12, module_id: 5, name: 'Художник', format_id: 2, format_name: 'Квест', instruction_id: null, internal_description: 'Рисуем', images: [] }];
const plan = { id: 1, name: '2026–2027', modules: [{ id: 5, name: 'Механизмы', lessons }, { id: 6, name: 'Пустой модуль', lessons: [] }] };
const formats = [{ id: 1, name: 'Обычный', is_active: 1 }, { id: 2, name: 'Квест', is_active: 1 }];
const click = async el => act(async () => { fireEvent.click(el); });
const setup = async (path = '/curriculum') => act(async () => { render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><CurriculumPlans /></MemoryRouter>); });
beforeEach(() => {
 useAuth.mockReturnValue({ isOwner: true });
 apiClient.get.mockImplementation(async url => ok(url === '/curriculum-plans' ? { items: [plan] } : url.includes('lesson-formats') ? { items: formats } : url.includes('/instructions?') ? { items: [{ id: 7, name: 'Сборка мотоцикла' }], total: 1 } : url.endsWith('/comments') ? { items: [] } : plan));
 apiClient.post.mockResolvedValue(ok({ id: 2 })); apiClient.put.mockResolvedValue(ok({})); apiClient.delete.mockResolvedValue(ok({}));
});
afterEach(() => jest.clearAllMocks());
test('browsing, module selection and lesson search never write records', async () => {
 await setup();
 expect(await screen.findByRole('button', { name: 'Открыть занятие: Мотоцикл' })).toBeInTheDocument();
 fireEvent.change(screen.getByRole('textbox', { name: 'Поиск занятий в плане' }), { target: { value: 'художник' } });
 expect(screen.queryByRole('button', { name: 'Открыть занятие: Мотоцикл' })).not.toBeInTheDocument();
 expect(screen.getByRole('button', { name: 'Открыть занятие: Художник' })).toBeInTheDocument();
 await click(screen.getByRole('button', { name: 'Сбросить', exact: true }));
 await click(screen.getByRole('button', { name: /02 Пустой модуль/ }));
 expect(screen.getByText('В модуле пока нет занятий.')).toBeInTheDocument();
 expect(apiClient.post).not.toHaveBeenCalled(); expect(apiClient.put).not.toHaveBeenCalled(); expect(apiClient.delete).not.toHaveBeenCalled();
});
test('used lessons remain read-only and cannot be displaced by moving a neighbour', async () => {
 await setup('/curriculum?plan=1&lesson=11');
 const dialog = within(await screen.findByRole('dialog', { name: 'Мотоцикл' }));
 expect(dialog.queryByRole('button', { name: 'Редактировать' })).not.toBeInTheDocument();
 expect(dialog.getByText(/содержание и порядок зафиксированы/)).toBeInTheDocument();
 expect(canMove(lessons, 1, -1)).toBe(false);
 expect(canMove(plan.modules, 1, -1, true)).toBe(false);
});
test('teacher can read plans and comments but has no editing controls', async () => {
 useAuth.mockReturnValue({ isOwner: false });
 await setup('/curriculum?plan=1&lesson=12&view=comments');
 expect(screen.queryByRole('button', { name: 'Новый план' })).not.toBeInTheDocument();
 expect(screen.queryByRole('button', { name: 'Редактировать занятие: Художник' })).not.toBeInTheDocument();
 expect(await screen.findByRole('button', { name: 'Отправить комментарий' })).toBeDisabled();
 expect(apiClient.post).not.toHaveBeenCalled();
});
test('editor keeps both descriptions, preserves inactive format and the existing API fields', async () => {
 const save = jest.fn().mockResolvedValue(undefined);
 await act(async () => { render(<CurriculumEditor kind="lesson" item={lessons[0]} plan={plan} formats={[{ ...formats[0], is_active: 0 }]} onSave={save} onClose={jest.fn()} />); });
 expect(screen.getByRole('button', { name: 'Формат *' })).toHaveTextContent('Обычный · скрыт');
 fireEvent.change(screen.getByLabelText('Внутреннее описание'), { target: { value: 'Обновлённая методика' } });
 await click(screen.getByRole('tab', { name: 'Внешнее описание' }));
 expect(screen.getByLabelText('Внешнее описание')).toHaveValue('Собираем мотоцикл');
 await click(screen.getByRole('button', { name: 'Сохранить', exact: true }));
 expect(save).toHaveBeenCalledWith({ name: 'Мотоцикл', internal_description: 'Обновлённая методика', external_description: 'Собираем мотоцикл', module_id: 5, format_id: 1, instruction_id: 7 });
});
test('closing a dirty editor asks before discarding and never saves automatically', async () => {
 const close = jest.fn(), save = jest.fn();
 await act(async () => { render(<CurriculumEditor kind="plan" item={plan} formats={formats} onSave={save} onClose={close} />); });
 fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Изменённый план' } });
 await click(screen.getByRole('button', { name: 'Отмена', exact: true }));
 expect(close).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
 await click(screen.getByRole('button', { name: 'Закрыть без сохранения' })); expect(close).toHaveBeenCalledTimes(1);
});
test('failed deletion keeps the confirmation open and records are not removed before confirmation', async () => {
 apiClient.delete.mockRejectedValue(new Error('Нет соединения'));
 await setup();
 await click(screen.getByRole('button', { name: 'Действия с занятием: Художник' }));
 await click(screen.getByRole('button', { name: 'Удалить занятие', exact: true }));
 expect(apiClient.delete).not.toHaveBeenCalled();
 await click(screen.getByRole('button', { name: 'Удалить', exact: true }));
 expect(screen.getByRole('dialog', { name: 'Удалить занятие?' })).toBeInTheDocument();
 expect(screen.getByRole('alert')).toHaveTextContent('Нет соединения');
});
