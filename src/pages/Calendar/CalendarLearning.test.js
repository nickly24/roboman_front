import React from 'react';
import { render, screen } from '@testing-library/react';
import CalendarLearning, { LearningSummary } from './CalendarLearning';
jest.mock('../Curriculum/CurriculumMaterials', () => ({ InstructionPane: () => null }));
jest.mock('../../services/api', () => ({ get: jest.fn() }));

test('an actual jump displays the next lesson with its progression explanation', () => {
  render(<CalendarLearning item={{ starts_at: '2026-09-22T10:00:00', learning: { kind: 'actual', title: 'Мотоцикл', curriculum_mode: 'SKIP_TO_NEXT', teacher_name: 'Анна' } }} />);
  expect(screen.getByRole('heading', { name: 'Мотоцикл' })).toBeInTheDocument();
  expect(screen.getByText('Предыдущий урок пропущен. Проведён следующий урок плана.')).toBeInTheDocument();
});

test('a help calendar entry has no instruction or curriculum card', () => {
  const learning = { kind: 'actual', lesson_type: 'HELP', title: 'Помощь', teacher_name: 'Анна' };
  render(<><LearningSummary learning={learning} /><CalendarLearning item={{ starts_at: '2026-09-22T00:00:00', learning }} /></>);
  expect(screen.getByRole('heading', { name: 'Помощь' })).toBeInTheDocument();
  expect(screen.queryByText('Без инструкции')).not.toBeInTheDocument();
  expect(screen.queryByText('Инструкция не прикреплена')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Карточка занятия' })).not.toBeInTheDocument();
});
