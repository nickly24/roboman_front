import React, { useState } from 'react';
import { Choice } from './CalendarFields';
import CalIcon from './CalendarIcons';
import { dayText, endTime, timeText } from './calendarData';

export const teacherEditorTitles = {
  assign: 'Плановый преподаватель на эту дату',
  owner_confirm: 'Подтвердить приход преподавателя',
  owner_decline: 'Отметить, что преподаватель не придёт',
};
export default function CalendarTeacherEditor({ editor, context, saving, error, onSubmit, onCancel }) {
  const { kind, item } = editor;
  const isDecline = kind === 'owner_decline', isPlan = kind === 'assign';
  const [teacherId, setTeacherId] = useState(String((isPlan ? item.planned_teacher_id : item.confirmed_teacher_id || item.planned_teacher_id) || ''));
  const [note, setNote] = useState('');
  const staff = context.teachers.filter(t => isDecline || t.status === 'working');
  const options = staff.map(t => ({ value: String(t.id), label: `${t.full_name}${t.status === 'working' ? '' : t.status === 'vacation' ? ' · в отпуске' : ' · не работает'}` }));
  if (isDecline) {
    [[item.confirmed_teacher_id, item.confirmed_teacher_name], [item.planned_teacher_id, item.planned_teacher_name]].forEach(([id, name]) => {
      if (id && !options.some(t => t.value === String(id))) options.push({ value: String(id), label: `${name || 'Преподаватель'} · ранее назначен` });
    });
  }
  const selected = options.find(t => t.value === teacherId);
  const unavailable = !!teacherId && !selected;
  const replacing = kind === 'owner_confirm' && !!item.confirmed_teacher_id && teacherId && String(item.confirmed_teacher_id) !== teacherId;
  const description = isPlan
    ? 'Назначение изменится только на эту дату. Для следующих недель останется регулярное правило. При изменении планового преподавателя потребуется новое подтверждение.'
    : isDecline ? 'Вы отмечаете отказ за выбранного преподавателя. Если он назначен или уже подтвердил приход, занятие откроется для замены. Другие подтверждения сохранятся.'
      : 'Вы подтверждаете, что выбранный преподаватель придёт на эту дату. Команда увидит, что отметку поставил администратор.';
  return <form className="cal-editor" onSubmit={e => { e.preventDefault(); if (!unavailable && (isPlan || teacherId)) onSubmit({ teacher_id: teacherId || null, note }); }}>
    <div className={`cal-editor-intro ${isDecline ? 'cal-warning' : ''}`}><CalIcon name={isPlan ? 'people' : isDecline ? 'replace' : 'check'} /><p>{description}</p></div>
    <div className="cal-editor-origin"><strong>{item.branch_name}</strong><span>{dayText(item.starts_at)} · {timeText(item.starts_at)}–{endTime(item)} МСК</span></div>
    <Choice label={isPlan ? 'Плановый преподаватель' : 'Преподаватель'} value={teacherId} options={options} required={!isPlan} emptyLabel="Без назначения" placeholder={unavailable ? `${isPlan ? item.planned_teacher_name : item.confirmed_teacher_name || item.planned_teacher_name} · недоступен` : isPlan ? 'Без назначения' : 'Выберите преподавателя'} disabled={saving} onChange={setTeacherId} />
    {unavailable && <p className="cal-error">Этот преподаватель больше не доступен для назначения. Выберите работающего преподавателя{isPlan ? ' или снимите плановое назначение' : ''}.</p>}
    {!isDecline && !!options.length && <p className="cal-muted cal-small">Все работающие преподаватели. Привязка к саду не требуется.</p>}
    {!options.length && <p className="cal-muted cal-small">Нет доступных преподавателей. Добавьте сотрудника в справочнике преподавателей.</p>}
    {replacing && selected && <div className="cal-replacement-preview"><CalIcon name="replace" /><div><strong>Замена подтверждённого преподавателя</strong><p>{item.confirmed_teacher_name} → {selected.label}</p><span>Прежнее подтверждение останется в истории. Отказ от имени прежнего преподавателя не ставится.</span></div></div>}
    <label className="cal-field">{isDecline ? 'Причина / комментарий' : 'Комментарий для команды'}<textarea maxLength={1000} rows={3} value={note} disabled={saving} onChange={e => setNote(e.target.value)} placeholder={isDecline ? 'Например: заболел, нужна замена' : 'Необязательно'} /></label>
    {error && <div className="cal-error" role="alert">{error}</div>}
    <footer className="cal-form-footer"><button className="od-control" type="button" onClick={onCancel} disabled={saving}>Отмена</button><button className={isDecline ? 'cal-danger-btn' : 'od-primary-btn'} type="submit" disabled={saving || unavailable || (!isPlan && !teacherId)}>{saving ? 'Сохраняем…' : isPlan ? 'Сохранить назначение' : isDecline ? 'Отметить отказ' : replacing ? 'Подтвердить замену' : 'Подтвердить приход'}</button></footer>
  </form>;
}
