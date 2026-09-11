import React, { useState } from 'react';
import Modal from '../../components/Modal/Modal';
import { InstructionPane } from '../Curriculum/CurriculumMaterials';
import { Icon } from '../Curriculum/CurriculumUI';
import { dayText } from './calendarData';
import '../Curriculum/CurriculumPlans.css';

const emptyText = {
  no_plan: 'Учебный план не назначен',
  complete: 'Все занятия плана распределены',
  unrecorded: 'Нет записи в журнале',
};
export function LearningSummary({ learning }) {
  if (!learning || learning.kind === 'cancelled') return null;
  if (!['forecast', 'actual'].includes(learning.kind)) return <span className="cal-learning-empty">{emptyText[learning.kind]}</span>;
  return <span className={`cal-learning-summary cal-learning-${learning.kind}`}><small>{learning.kind === 'forecast' ? 'По плану · прогноз' : 'Провели'}</small><strong>{learning.title}</strong><span><Icon name="file" />{learning.instruction_name || 'Без инструкции'}</span></span>;
}
export default function CalendarLearning({ item }) {
  const [preview, setPreview] = useState(false);
  const learning = item.learning;
  if (!learning || learning.kind === 'cancelled') return null;
  if (!['forecast', 'actual'].includes(learning.kind)) return <div className="cal-learning-state"><Icon name={item.is_past ? 'history' : 'book'} /><div><strong>{emptyText[learning.kind]}</strong><p>{learning.kind === 'complete' ? 'К этой дате текущий план закончится, если предыдущие занятия пройдут по прогнозу.' : learning.kind === 'no_plan' ? 'Прогноз появится, когда к саду будет подключён учебный план.' : 'Дата прошла, но проведённое занятие ещё не найдено. Подтверждение прихода не означает, что занятие внесено в журнал.'}</p></div></div>;
  const actual = learning.kind === 'actual';
  return <section className={`cal-learning-detail ${actual ? 'is-actual' : ''}`}><div className="cal-learning-heading"><Icon name={actual ? 'check' : 'book'} /><span>{actual ? 'По журналу занятий' : 'Ожидаемое занятие по плану'}</span>{!actual && <small>Прогноз</small>}</div><h4>{learning.title}</h4>{learning.plan_name && <p className="cal-learning-path">{learning.plan_name}{learning.module_name && ` · ${learning.module_name}`}</p>}
    {actual && learning.curriculum_mode === 'REPEAT' && <p className="cal-learning-mode">Повтор пройденного занятия</p>}
    {actual && learning.curriculum_mode === 'OFF_PLAN_REPLACE' && <p className="cal-learning-mode">Вне плана, вместо «{learning.curriculum_lesson_name}». Шаг плана засчитан.</p>}
    {actual && learning.curriculum_mode === 'OFF_PLAN_PAUSE' && <p className="cal-learning-mode">Вне плана. Прохождение плана не продвинулось.</p>}
    {actual && !!item.is_cancelled && <p className="cal-learning-mode">В календаре дата была отменена, но в журнале есть проведённое занятие.</p>}
    <div className="cal-learning-links">{learning.instruction_id ? <button className="od-control" onClick={() => setPreview(true)}><Icon name="file" /><span>{learning.instruction_name || 'Открыть инструкцию'}</span><Icon name="external" /></button> : <span className="cal-muted cal-small">Инструкция не прикреплена</span>}{learning.plan_id && learning.curriculum_lesson_id && <a className="od-text-btn" href={`/curriculum?plan=${learning.plan_id}&lesson=${learning.curriculum_lesson_id}`}><Icon name="book" />{actual && learning.curriculum_mode === 'OFF_PLAN_REPLACE' ? 'Засчитанное занятие плана' : 'Карточка занятия'}</a>}</div>
    <p className="cal-learning-caption">{actual ? `Проведено ${dayText(item.display_date || item.starts_at, { month: 'short' })} · ${learning.teacher_name || 'Преподаватель не указан'}` : 'Рассчитано по пройденным урокам и всем предстоящим датам сада. Переносы, отмены и новые записи в журнале обновляют прогноз.'}</p>
    {preview && <Modal isOpen title={learning.instruction_name || 'Инструкция'} size="curriculum-viewer" onClose={() => setPreview(false)}><InstructionPane key={learning.instruction_id} id={learning.instruction_id} name={learning.instruction_name} /></Modal>}
  </section>;
}
