import React, { useRef, useState } from 'react';
import Input from '../../components/Input/Input';
import CalIcon from './CalendarIcons';
import { Choice, DateField } from './CalendarFields';
import { addDays, dayText, endTime, monday, timeText } from './calendarData';

export const editorTitles = { create: 'Регулярное занятие', move: 'Перенести эту дату', rule: 'Изменить будущие недели', stop: 'Завершить повторы', cancel: 'Отменить эту дату', restore: 'Восстановить занятие', decline: 'Не смогу прийти' };
export default function CalendarEditor({ editor, context, today, saving, error, onSubmit, onCancel }) {
  const { kind, item } = editor, rule = item?.edit_rule || item?.rule;
  const recurring = kind === 'rule' || kind === 'stop';
  const initialWeek = item?.edit_week || (item ? item.week_start < monday(today) || item.is_past ? addDays(monday(today), 7) : item.week_start : monday(editor.date || today));
  const initialDate = recurring ? addDays(initialWeek, (rule?.weekday || 1) - 1) : editor.date || item?.starts_at.slice(0, 10) || today;
  const [form, setForm] = useState({ branch_id: String(item?.branch_id || editor.branch_id || ''), date: initialDate, time: recurring ? rule?.starts_at || '10:00' : item ? timeText(item.starts_at) : '10:00', week: initialWeek, weekday: String(rule?.weekday || 1), duration_minutes: String(recurring ? rule?.duration_minutes || 60 : item?.duration_minutes || 60), teacher_id: String((recurring ? rule?.teacher_id : item?.planned_teacher_id) || ''), note: '' });
  const requestKey = useRef(window.crypto?.randomUUID?.() || `calendar-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const confirmOnly = ['cancel', 'restore', 'decline', 'stop'].includes(kind);
  const branch = context.branches.find(b => String(b.id) === form.branch_id);
  const teachers = context.teachers.filter(t => t.status === 'working').map(t => ({ value: String(t.id), label: t.full_name }));
  const submit = e => {
    e.preventDefault();
    const date = recurring ? addDays(form.week, Number(form.weekday) - 1) : form.date;
    onSubmit({ ...form, starts_at: `${date}T${form.time}`, effective_week: form.week, request_key: requestKey.current });
  };
  const description = {
    create: 'Занятие будет повторяться каждую неделю в этот день. Для каждой даты приход подтверждается отдельно — преподавателем или администратором.',
    move: 'Изменится только эта дата. Следующие недели останутся по регулярному правилу.',
    rule: 'Новое правило действует с выбранной недели. Индивидуальные переносы и отмены сохранятся.',
    stop: 'С выбранной недели занятия больше не повторяются. Отменятся и отдельные будущие переносы этих недель. Уже прошедшие даты сохранятся.',
    cancel: 'Отменится только эта дата. Все следующие занятия останутся в календаре.',
    restore: 'Дата вернётся в календарь. Понадобится новое подтверждение преподавателя или администратора.',
    decline: item?.confirmed_teacher_id || item?.planned_teacher_id ? 'Ваш ответ увидит владелец. Если занятие закреплено за вами, свободную замену смогут взять все работающие преподаватели.' : 'Занятие останется открытым для всех работающих преподавателей.',
  };
  return <form className="cal-editor" onSubmit={submit}>
    <div className={`cal-editor-intro ${kind === 'decline' || kind === 'stop' || kind === 'cancel' ? 'cal-warning' : ''}`}><CalIcon name={recurring || kind === 'create' ? 'repeat' : kind === 'decline' ? 'replace' : 'calendar'} /><p>{description[kind]}</p></div>
    {item && <div className="cal-editor-origin"><strong>{item.branch_name}</strong><span>{dayText(item.starts_at)} · {timeText(item.starts_at)}–{endTime(item)} МСК</span></div>}
    {kind === 'create' && <Choice label="Сад / филиал" required placeholder="Выберите сад" value={form.branch_id} options={context.branches.filter(b => b.is_active).map(b => ({ value: String(b.id), label: b.name }))} onChange={value => setForm(f => ({ ...f, branch_id: value, teacher_id: '' }))} />}
    {recurring && <DateField label="Начиная с недели" value={form.week} onChange={value => set('week', value)} weekOnly min={monday(today)} />}
    {!confirmOnly && <>
      <div className="cal-form-row">{recurring ? <Choice label="Каждую неделю" required value={form.weekday} options={['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'].map((label, i) => ({ value: String(i + 1), label }))} onChange={value => set('weekday', value)} /> : <DateField label={kind === 'create' ? 'Первое занятие' : 'Новая дата'} value={form.date} onChange={value => set('date', value)} min={today} />}<Input label="Начало · МСК" type="time" required value={form.time} onChange={e => set('time', e.target.value)} /></div>
      <div className="cal-form-row cal-form-assignment"><Choice label="Плановый преподаватель" value={form.teacher_id} options={teachers} onChange={value => set('teacher_id', value)} placeholder="Кто сможет провести" disabled={!form.branch_id} /><Input label="Длительность, мин" type="number" min="1" max="600" required value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} /></div>
      {branch && <p className="cal-muted cal-small">{teachers.length ? 'Можно назначить любого работающего преподавателя. Привязка к саду не требуется.' : 'Пока нет работающих преподавателей. Их можно добавить в справочнике преподавателей.'}</p>}
      {kind !== 'create' && <div className="cal-reconfirm"><CalIcon name="people" /><span>После изменения времени или преподавателя понадобится новое подтверждение.</span></div>}
    </>}
    {['move', 'cancel', 'restore', 'decline'].includes(kind) && <label className="cal-field">{kind === 'decline' ? 'Комментарий для команды' : 'Причина / комментарий'}<textarea value={form.note} maxLength={1000} rows={3} onChange={e => set('note', e.target.value)} placeholder={kind === 'decline' ? 'Например: заболел, нужна замена' : 'Необязательно'} /></label>}
    {kind === 'create' && <p className="cal-rule-preview"><CalIcon name="repeat" /><span>С {dayText(form.date)} · каждую неделю · {form.time} · {form.duration_minutes || '—'} мин</span></p>}
    {error && <div className="cal-error" role="alert">{error}</div>}
    <footer className="cal-form-footer"><button type="button" className="od-control" disabled={saving} onClick={onCancel}>Отмена</button><button type="submit" className={['cancel', 'stop', 'decline'].includes(kind) ? 'cal-danger-btn' : 'od-primary-btn'} disabled={saving || (kind === 'create' && !form.branch_id)}>{saving ? 'Сохраняем…' : ({ create: 'Создать повторение', move: 'Сохранить эту дату', rule: 'Применить с выбранной недели', stop: 'Завершить повторы', cancel: 'Отменить занятие', restore: 'Восстановить', decline: 'Сообщить, что не смогу' })[kind]}</button></footer>
  </form>;
}
