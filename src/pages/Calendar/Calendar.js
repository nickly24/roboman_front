import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
import Layout from '../../components/Layout/Layout';
import Modal from '../../components/Modal/Modal';
import useMediaQuery from '../../hooks/useMediaQuery';
import { FiltersControl, Hint, PeriodControl } from '../Dashboard/DashboardControls';
import DashIcon from '../Dashboard/DashboardIcons';
import CalendarEditor, { editorTitles } from './CalendarEditor';
import CalendarTeacherEditor, { teacherEditorTitles } from './CalendarTeacherEditor';
import CalIcon from './CalendarIcons';
import CalendarLearning, { LearningSummary } from './CalendarLearning';
import { addDays, dateObject, dayText, endTime, errorMessage, eventUrl, filterEvents, lessonCount, monday, monthWeeks, moscowToday, statusInfo, timeText, versionBody, weekText } from './calendarData';
import '../Dashboard/OwnerDashboard.css';
import './Calendar.css';

const FILTER_FIELDS = [{ key: 'branch_id', label: 'Сады / филиалы', all: 'Все сады' }, { key: 'department_id', label: 'Отделы', all: 'Все отделы' }, { key: 'teacher_id', label: 'Преподаватели', all: 'Все преподаватели' }];
const unpack = response => { if (!response.data?.ok) throw new Error(response.data?.error?.message || 'Не удалось загрузить календарь'); return response.data.data; };
const historyLabels = { assign: 'Изменён плановый преподаватель', series_created: 'Создано еженедельное занятие', series_changed: 'Изменено регулярное время', series_stopped: 'Завершены повторы', series_date_changed: 'Новое время по регулярному правилу', series_date_cancelled: 'Дата отменена при завершении повторов', confirmed: 'Подтверждён приход', declined: 'Отказ от занятия', move: 'Изменена эта дата', cancel: 'Занятие отменено', restore: 'Занятие восстановлено' };

function Status({ item }) {
  const status = statusInfo[item.status] || statusInfo.pending;
  return <span className={`cal-status cal-status-${item.status}`}><CalIcon name={status.icon} />{item.status === 'pending' && item.is_past ? 'Нет подтверждения' : status.label}{item.is_replacement && item.status === 'confirmed' && <span className="cal-replacement-tag">· замена</span>}</span>;
}

function EventCard({ item, isOwner, onOpen, onRespond, saving }) {
  return <article className={`cal-event cal-event-${item.status} ${item.is_ghost ? 'cal-event-ghost' : ''} ${item.is_past ? 'cal-event-past' : ''}`}>
    <button className="cal-event-main" onClick={() => onOpen(item)} aria-label={`${item.branch_name}, ${timeText(item.starts_at)}, ${statusInfo[item.status]?.label}`}>
      <span className="cal-event-time"><strong>{timeText(item.is_ghost ? item.scheduled_starts_at : item.starts_at)}</strong>{item.is_journal_only ? <span>по журналу</span> : !!item.duration_minutes && <span>{item.duration_minutes} мин</span>}<CalIcon name={item.is_journal_only ? 'history' : item.is_override ? 'move' : 'repeat'} /></span>
      <strong className="cal-event-branch">{item.branch_name}</strong>
      <span className="cal-event-teacher"><CalIcon name="people" /><span>{item.learning?.kind === 'actual' ? item.learning.teacher_name || 'Преподаватель не указан' : item.confirmed_teacher_name || item.planned_teacher_name || 'Кто сможет провести?'}</span></span>
      {!item.is_ghost && <LearningSummary learning={item.learning} />}
      {item.is_ghost ? <span className="cal-move-note"><CalIcon name="move" />{dayText(item.starts_at, { month: 'short' })} · {timeText(item.starts_at)}</span> : <Status item={item} />}
      {!item.is_ghost && item.confirmed_response?.actor_role === 'OWNER' && <span className="cal-event-admin">Подтвердил администратор</span>}
      {!item.is_ghost && item.is_external_replacement && <span className="cal-event-open-replacement"><CalIcon name="people" />Открытая замена</span>}
      {!item.is_ghost && item.is_external_replacement && item.address && <span className="cal-event-address">{item.address}</span>}
      {!item.is_ghost && !!item.is_override && <span className="cal-event-exception">Изменена эта дата</span>}
    </button>
    {!isOwner && !item.is_ghost && item.can_confirm && !item.confirmed_teacher_id && <button className={`cal-quick-confirm ${item.status === 'replacement' ? 'cal-take-replacement' : ''}`} disabled={saving} onClick={() => onRespond(item)}><CalIcon name={item.status === 'replacement' ? 'replace' : 'check'} />{item.status === 'replacement' ? 'Взять замену' : 'Я приду'}</button>}
  </article>;
}

function EventDetails({ item, isOwner, saving, onEdit, onRespond, onGoDate }) {
  const [tab, setTab] = useState('details');
  const adminConfirmed = item.confirmed_response?.actor_role === 'OWNER';
  const canManage = isOwner && !item.is_past && !item.is_cancelled && item.can_manage_teachers !== false;
  const ownConfirmed = item.my_response?.answer === 'confirmed' && item.my_response.teacher_id === item.confirmed_teacher_id;
  return <div className="cal-detail">
    <div className="cal-detail-heading"><Status item={item} /><span className="cal-small cal-muted">{item.is_journal_only ? 'Запись из журнала' : item.is_override ? 'Индивидуальная дата' : 'Еженедельное занятие'}</span></div>
    <div className="cal-detail-time"><strong>{timeText(item.starts_at)}{!!item.duration_minutes && <span>—{endTime(item)}</span>}</strong><p>{dayText(item.starts_at, { weekday: 'long', year: 'numeric' })}<span> · {item.is_journal_only ? 'время журнала' : 'МСК'}</span></p></div>
    <h3>{item.branch_name}</h3><p className="cal-detail-address"><CalIcon name="pin" />{item.address || item.department_name}</p>
    {item.starts_at !== item.scheduled_starts_at && <div className="cal-transfer-line"><CalIcon name="move" /><span>Было {dayText(item.scheduled_starts_at, { month: 'short' })}, {timeText(item.scheduled_starts_at)}</span><button className="od-text-btn" onClick={() => onGoDate(item.starts_at.slice(0, 10))}>К новой дате</button></div>}
    <CalendarLearning key={item.key} item={item} />
    {!item.is_journal_only && <div className="cal-detail-tabs"><button aria-pressed={tab === 'details'} onClick={() => setTab('details')}>Участники и ответы</button><button aria-pressed={tab === 'history'} onClick={() => setTab('history')}><CalIcon name="history" />История</button></div>}
    {tab === 'details' ? <>
      <div className="cal-responsibility"><div><span>{item.is_journal_only ? 'Источник' : 'Плановый преподаватель'}</span><strong>{item.is_journal_only ? 'Журнал занятий' : item.planned_teacher_name || 'Без назначения'}</strong></div><div className={item.confirmed_teacher_id || item.learning?.kind === 'actual' ? 'cal-person-confirmed' : ''}><span>{item.learning?.kind === 'actual' ? 'Провёл занятие' : item.confirmed_teacher_id ? item.is_past ? 'Подтверждал приход' : 'Придёт' : 'Подтверждение'}</span><strong>{item.learning?.kind === 'actual' ? item.learning.teacher_name || 'Не указан' : item.confirmed_teacher_name || (item.status === 'replacement' ? 'Ищем замену' : item.is_cancelled ? 'Дата отменена' : 'Пока нет ответа')}</strong>{(item.confirmed_teacher_id || item.learning?.kind === 'actual') && <CalIcon name="check" />}</div></div>
      {canManage && <div className="cal-admin-actions"><div className="cal-admin-actions-heading"><span className="cal-label">Управление преподавателями</span><span>Только эта дата</span></div><div><button className="od-control" disabled={saving} onClick={() => onEdit('assign', item)}><CalIcon name="people" />Плановый преподаватель</button><button className="od-primary-btn" disabled={saving} onClick={() => onEdit('owner_confirm', item)}><CalIcon name="check" />Подтвердить приход</button><button className="od-control cal-danger-text" disabled={saving} onClick={() => onEdit('owner_decline', item)}><CalIcon name="close" />Не придёт</button></div></div>}
      {item.note && <div className="cal-detail-note"><span>Комментарий к дате</span><p>{item.note}</p></div>}
      {!!item.responses?.length && <div className="cal-answers"><span className="cal-label">Ответы на это время</span>{item.responses.map(response => <div className="cal-answer" key={response.id}><span className={`cal-answer-icon ${response.answer}`}><CalIcon name={response.answer === 'confirmed' ? 'check' : 'close'} /></span><div><strong>{response.teacher_name}</strong><span>{response.answer === 'confirmed' ? (response.actor_role === 'OWNER' ? 'Придёт' : 'Приду') : (response.actor_role === 'OWNER' ? 'Не придёт' : 'Не смогу')}{response.reason && ` · ${response.reason}`}</span>{response.actor_role === 'OWNER' && <small className="cal-response-author">Отметил администратор · {response.actor_name}</small>}</div><time>{dayText(response.created_at, { month: 'short' })}, {timeText(response.created_at)}</time></div>)}</div>}
      {!item.responses?.length && !item.is_cancelled && item.learning?.kind !== 'actual' && <p className="cal-detail-hint"><CalIcon name="clock" />{item.response_epoch > 1 ? 'Время или назначение изменились. Прежние ответы в истории; ожидаем новое подтверждение.' : item.is_past ? 'На эту дату не было подтверждений. Факт проведения смотрите в журнале занятий.' : 'Каждую дату подтверждает преподаватель или администратор. Ответить можно заранее, до начала занятия.'}</p>}
      {!isOwner && !item.is_past && !item.is_cancelled && <div className="cal-teacher-actions">
        {item.is_external_replacement && <p className="cal-public-replacement-note">Эту замену может взять любой работающий преподаватель. После подтверждения дата останется в вашем календаре.</p>}
        {ownConfirmed ? <div className="cal-you-confirmed"><CalIcon name="check" />{adminConfirmed ? 'Приход подтвердил администратор' : 'Вы подтвердили приход'}</div> : item.can_confirm ? <button className="od-primary-btn" disabled={saving} onClick={() => onRespond(item)}><CalIcon name={item.status === 'replacement' ? 'replace' : 'check'} />{item.status === 'replacement' ? 'Взять замену' : 'Я приду'}</button> : <p className="cal-muted cal-small">{item.confirmed_teacher_name ? `Занятие уже взял(а) ${item.confirmed_teacher_name}` : 'Подтверждение доступно работающим преподавателям'}</p>}
        {item.can_respond && <button className="od-control" disabled={saving} onClick={() => onEdit('decline', item)}><CalIcon name="close" />Не смогу</button>}
      </div>}
      {isOwner && !item.is_journal_only && <div className="cal-owner-actions">
        {!item.is_past && <div className="cal-action-scope"><span className="cal-label">Только эта дата</span><div>{!item.is_cancelled ? <><button className="od-control" onClick={() => onEdit('move', item)}><CalIcon name="move" />Перенести / изменить</button><button className="od-text-btn cal-danger-text" onClick={() => onEdit('cancel', item)}>Отменить дату</button></> : <button className="od-control" onClick={() => onEdit('restore', item)}><CalIcon name="repeat" />Восстановить дату</button>}</div></div>}
        <div className="cal-action-scope"><span className="cal-label">Регулярное правило</span><div><button className="od-control" onClick={() => onEdit('rule', item)}><CalIcon name="repeat" />Эта и следующие недели</button><button className="od-text-btn cal-danger-text" onClick={() => onEdit('stop', item)}>Завершить повторы</button></div></div>
      </div>}
      {item.is_past && <p className="cal-archive-note"><CalIcon name="history" />Прошедшая дата сохранена в истории</p>}
    </> : <div className="cal-history">{item.history?.length ? item.history.map(entry => <div className="cal-history-item" key={entry.id}><i /><div><strong>{historyLabels[entry.action] || entry.action}</strong><span>{entry.details.teacher_name ? `${entry.details.teacher_name} · ${entry.details.actor_role === 'OWNER' ? `Администратор ${entry.actor_name}` : 'Сам преподаватель'}` : entry.actor_name} · {dayText(entry.created_at, { month: 'short' })}, {timeText(entry.created_at)}</span>{entry.details.effective_week && <p>Начиная с недели {dayText(entry.details.effective_week)}</p>}{entry.details.replaced_teacher_name && <p>Заменён преподаватель: {entry.details.replaced_teacher_name}</p>}{entry.action === 'assign' && <p>{entry.details.before?.planned_teacher_name || 'Без назначения'} → {entry.details.after?.planned_teacher_name || 'Без назначения'}</p>}{entry.details.before?.starts_at && entry.details.before.starts_at !== entry.details.after?.starts_at && <p>{dayText(entry.details.before.starts_at, { month: 'short' })}, {timeText(entry.details.before.starts_at)} → {dayText(entry.details.after.starts_at, { month: 'short' })}, {timeText(entry.details.after.starts_at)}</p>}{entry.details.starts_at && <p>На {dayText(entry.details.starts_at, { month: 'short' })}, {timeText(entry.details.starts_at)}</p>}{entry.details.note && <p>{entry.details.note}</p>}</div></div>) : <div className="cal-empty-history"><CalIcon name="history" /><p>Пока нет изменений и ответов</p><span>Занятие создано из регулярного правила.</span></div>}</div>}
  </div>;
}

export default function Calendar() {
  const { isOwner } = useAuth();
  const mobile = useMediaQuery('(max-width: 900px)');
  const [today, setToday] = useState(moscowToday), [week, setWeek] = useState(() => monday(moscowToday())), [day, setDay] = useState(moscowToday);
  const [items, setItems] = useState([]), [context, setContext] = useState({ branches: [], teachers: [] });
  const [loading, setLoading] = useState(true), [contextLoading, setContextLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState(''), [contextError, setContextError] = useState('');
  const [reload, setReload] = useState(0), [contextReload, setContextReload] = useState(0), [filters, setFilters] = useState({}), [status, setStatus] = useState('all');
  const [active, setActive] = useState(null), [detail, setDetail] = useState(null), [detailError, setDetailError] = useState(''), [editor, setEditor] = useState(null), [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false), [notice, setNotice] = useState(null);
  const swipe = useRef(null), busy = useRef(false), loadedWeek = useRef(null);
  const refresh = () => setReload(n => n + 1);

  useEffect(() => {
    const abort = new AbortController(); setContextLoading(true); setContextError('');
    apiClient.get('/calendar/context', { signal: abort.signal }).then(unpack).then(data => { setContext(data); setToday(data.today); }).catch(e => { if (!abort.signal.aborted) setContextError(errorMessage(e)); }).finally(() => { if (!abort.signal.aborted) setContextLoading(false); });
    return () => abort.abort();
  }, [contextReload]);
  useEffect(() => {
    const abort = new AbortController(); setError('');
    if (loadedWeek.current !== week) { setLoading(true); setItems([]); } else setRefreshing(true);
    apiClient.get(`/calendar/week?start=${week}`, { signal: abort.signal }).then(unpack).then(data => { loadedWeek.current = week; setItems(data.items); setToday(data.today); }).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!abort.signal.aborted) { setLoading(false); setRefreshing(false); } });
    return () => abort.abort();
  }, [week, reload]);
  useEffect(() => {
    if (!active) return;
    const abort = new AbortController(); setDetail(null); setDetailError('');
    apiClient.get(eventUrl(active), { signal: abort.signal }).then(unpack).then(setDetail).catch(e => { if (!abort.signal.aborted) setDetailError(errorMessage(e)); });
    return () => abort.abort();
  }, [active, reload]);
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible' && !editor && !busy.current && !active) setReload(n => n + 1); };
    const timer = setInterval(tick, 45000);
    window.addEventListener('focus', tick);
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); };
  }, [editor, active]);

  const chooseWeek = value => { setWeek(monday(value)); setDay(value); };
  const stepWeek = n => { setWeek(w => addDays(w, n * 7)); setDay(d => addDays(d, n * 7)); };
  const goDate = value => { chooseWeek(value); setActive(null); };
  const create = value => { setFormError(''); setEditor({ kind: 'create', date: value || (week < monday(today) ? today : week === monday(today) ? today : week), branch_id: filters.branch_id }); };
  const edit = (kind, item) => { setFormError(''); setActive(null); setEditor({ kind, item }); };
  const closeEditor = () => { if (!busy.current) { const item = editor?.item; setEditor(null); if (item) setActive(item); } };
  const mutate = async (action, success, after) => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setFormError('');
    try { const result = unpack(await action()); setNotice({ text: success }); after?.(result); refresh(); }
    catch (e) {
      const message = errorMessage(e);
      if (e.response?.status === 409) { const item = editor?.item; setEditor(null); if (item) setActive(item); setNotice({ text: message, error: true }); refresh(); }
      else if (editor) setFormError(message);
      else setNotice({ text: message, error: true });
    } finally { busy.current = false; setSaving(false); }
  };
  const confirm = item => mutate(() => apiClient.post(`${eventUrl(item)}/response`, { ...versionBody(item), answer: 'confirmed' }), 'Приход подтверждён на эту дату. Следующую неделю нужно подтвердить отдельно.');
  const submit = form => {
    const { kind, item } = editor;
    const body = { starts_at: form.starts_at, duration_minutes: Number(form.duration_minutes), teacher_id: form.teacher_id || null, note: form.note };
    const actions = {
      assign: () => apiClient.put(eventUrl(item), { ...versionBody(item), action: 'assign', teacher_id: form.teacher_id || null, note: form.note }),
      owner_confirm: () => apiClient.post(`${eventUrl(item)}/response`, { ...versionBody(item), answer: 'confirmed', teacher_id: Number(form.teacher_id), note: form.note, replace_confirmed_teacher_id: item.confirmed_teacher_id || null }),
      owner_decline: () => apiClient.post(`${eventUrl(item)}/response`, { ...versionBody(item), answer: 'declined', teacher_id: Number(form.teacher_id), note: form.note }),
      create: () => apiClient.post('/calendar/series', { ...body, branch_id: Number(form.branch_id), request_key: form.request_key }),
      rule: () => apiClient.put(`/calendar/series/${item.series_id}`, { ...body, effective_week: form.effective_week, revision: item.series_revision }),
      stop: () => apiClient.put(`/calendar/series/${item.series_id}`, { action: 'stop', effective_week: form.effective_week, revision: item.series_revision }),
      decline: () => apiClient.post(`${eventUrl(item)}/response`, { ...versionBody(item), answer: 'declined', note: form.note }),
      move: () => apiClient.put(eventUrl(item), { ...body, ...versionBody(item), action: 'move' }),
      cancel: () => apiClient.put(eventUrl(item), { ...versionBody(item), action: 'cancel', note: form.note }),
      restore: () => apiClient.put(eventUrl(item), { ...versionBody(item), action: 'restore', note: form.note }),
    };
    const messages = { assign: 'Плановый преподаватель изменён только на эту дату.', owner_confirm: 'Приход преподавателя подтверждён администратором.', owner_decline: 'Отказ преподавателя отмечен администратором.', create: 'Еженедельное занятие добавлено.', rule: 'Регулярное правило обновлено. Прошлые недели и индивидуальные переносы сохранены.', stop: 'Повторы завершены с выбранной недели.', decline: 'Ваш ответ сохранён. Команда увидит его в календаре.', move: 'Изменена только эта дата.', cancel: 'Эта дата отменена.', restore: 'Занятие восстановлено. Ожидаем новое подтверждение.' };
    mutate(actions[kind], messages[kind], result => { setEditor(null); if (kind === 'create' || kind === 'rule' || kind === 'stop') chooseWeek(result.week_start); else setActive(item); });
  };
  const filterBranches = useMemo(() => Array.from(new Map([...context.branches, ...items.map(item => ({ id: item.branch_id, name: item.branch_name, department_id: item.department_id, department_name: item.department_name }))].map(branch => [branch.id, branch])).values()).sort((a, b) => a.name.localeCompare(b.name, 'ru')), [context.branches, items]);
  const options = useMemo(() => ({
    branch_id: filterBranches.map(b => ({ value: String(b.id), label: b.name })),
    department_id: Array.from(new Map(filterBranches.map(b => [b.department_id, { value: String(b.department_id), label: b.department_name }])).values()),
    teacher_id: Array.from(new Map([...context.teachers, ...items.filter(item => item.learning?.kind === 'actual' && item.learning.teacher_id).map(item => ({ id: item.learning.teacher_id, full_name: item.learning.teacher_name }))].map(t => [t.id, { value: String(t.id), label: t.full_name || 'Преподаватель не указан' }])).values()),
  }), [context.teachers, filterBranches, items]);
  const filtered = useMemo(() => filterEvents(items, filters), [items, filters]);
  const counts = useMemo(() => filtered.reduce((all, item) => { if (!item.is_ghost) { all.all++; all[item.status]++; } return all; }, { all: 0, recorded: 0, pending: 0, confirmed: 0, replacement: 0, cancelled: 0 }), [filtered]);
  const upcoming = filtered.filter(item => !item.is_ghost && !item.is_past && !item.is_cancelled);
  const coverage = { total: upcoming.length, confirmed: upcoming.filter(item => item.confirmed_teacher_id).length };
  const visible = filtered.filter(item => status === 'all' || (item.status === status && !item.is_ghost));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const byDay = key => visible.filter(item => item.display_date === key);
  const activeMonth = addDays(week, 3).slice(0, 7), weeks = monthWeeks(activeMonth);
  const renderEvents = key => byDay(key).map(item => <EventCard item={item} key={item.key} isOwner={isOwner} onOpen={setActive} onRespond={confirm} saving={saving} />);
  const nextDay = n => { const next = addDays(day, n); setDay(next); setWeek(monday(next)); };

  return <Layout headerTitle="Календарь" className="layout-planning-calendar"><div className="planning-calendar">
    <div className="cal-toolbar"><PeriodControl value={{ start: activeMonth, end: activeMonth }} onChange={p => chooseWeek(`${p.start}-01`)} allowRange={false} showArrows={false} title="Перейти к месяцу" /><FiltersControl value={filters} onChange={setFilters} options={options} fields={isOwner ? FILTER_FIELDS : FILTER_FIELDS.slice(0, 2)} title="Фильтры календаря" loading={contextLoading} error={contextError} onRetry={() => setContextReload(n => n + 1)} /><div className="cal-toolbar-end"><button className="od-icon-btn" aria-label="Обновить календарь" title="Обновить календарь" disabled={loading || refreshing} onClick={refresh}><DashIcon name="refresh" /></button>{isOwner && <button className="od-primary-btn cal-create" disabled={contextLoading || !!contextError} onClick={() => create()}><CalIcon name="plus" /><span>Регулярное занятие</span></button>}</div></div>
    <div className="cal-overview"><div className="cal-status-filters" aria-label="Статус занятий"><button aria-pressed={status === 'all'} onClick={() => setStatus('all')}><CalIcon name="calendar" /><span>Все</span><strong>{counts.all}</strong></button>{Object.entries(statusInfo).map(([key, value]) => <button key={key} className={`cal-filter-${key}`} aria-pressed={status === key} onClick={() => setStatus(key)}><CalIcon name={value.icon} /><span>{value.label}</span><strong>{counts[key]}</strong></button>)}</div><Hint label="Как работает календарь">В календаре преподавателя — занятия его садов, личные назначения и свободные замены из всех садов. Взять замену может любой работающий преподаватель. Каждая неделя подтверждается отдельно; факт проведения и начисления ведутся в разделе «Занятия».</Hint></div>
    {notice && <div className={`cal-notice ${notice.error ? 'cal-notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}><CalIcon name={notice.error ? 'replace' : 'check'} /><span>{notice.text}</span><button className="od-icon-btn" aria-label="Закрыть сообщение" onClick={() => setNotice(null)}><CalIcon name="close" /></button></div>}
    {contextError && <div className="cal-load-error" role="alert"><CalIcon name="replace" /><div><strong>Не удалось загрузить сады и преподавателей</strong><span>{contextError}</span></div><button className="od-control" onClick={() => setContextReload(n => n + 1)}>Загрузить справочники</button></div>}
    {error && <div className="cal-load-error" role="alert"><CalIcon name="replace" /><div><strong>Не удалось загрузить календарь</strong><span>{error}</span></div><button className="od-control" onClick={refresh}>Повторить</button></div>}
    <section className={`cal-board ${loading ? 'cal-board-loading' : ''}`} aria-label="Календарь недели" aria-busy={loading}>
      <header className="cal-weekbar"><div className="cal-week-navigation"><button className="od-icon-btn" aria-label="Предыдущая неделя" onClick={() => stepWeek(-1)}><CalIcon name="left" /></button><button className="od-icon-btn" aria-label="Следующая неделя" onClick={() => stepWeek(1)}><CalIcon name="right" /></button><h2>{weekText(week)}<span>{week.slice(0, 4)}</span></h2><button className="od-control cal-today" onClick={() => chooseWeek(today)}>Сегодня</button></div><div className="cal-week-meta"><span className="cal-coverage">{coverage.total ? <><i><b style={{ width: `${coverage.confirmed / coverage.total * 100}%` }} /></i>{coverage.confirmed} из {coverage.total} предстоящих подтверждено</> : `${counts.recorded} проведено по журналу`}</span><span>МСК</span></div></header>
      {mobile ? <div className="cal-mobile"><div className="cal-day-strip">{days.map(key => <button aria-label={dayText(key, { weekday: 'long' })} aria-pressed={day === key} className={`${day === key ? 'selected' : ''} ${today === key ? 'today' : ''}`} onClick={() => setDay(key)} key={key}><span>{dateObject(key).toLocaleDateString('ru-RU', { weekday: 'short' })}</span><strong>{dateObject(key).getDate()}</strong><i className={byDay(key).some(item => item.status === 'replacement') ? 'replacement' : byDay(key).length ? 'has-events' : ''} /></button>)}</div><div className="cal-mobile-day" onTouchStart={e => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => { if (!swipe.current) return; const dx = e.changedTouches[0].clientX - swipe.current.x, dy = e.changedTouches[0].clientY - swipe.current.y; if (Math.abs(dx) > 75 && Math.abs(dy) < 40) nextDay(dx < 0 ? 1 : -1); swipe.current = null; }}><div className="cal-mobile-day-heading"><h3>{dayText(day, { weekday: 'long' })}</h3>{isOwner && day >= today && <button className="od-icon-btn" aria-label="Добавить повторение на этот день" onClick={() => create(day)}><CalIcon name="plus" /></button>}</div>{loading ? <div className="cal-skeleton" /> : byDay(day).length ? renderEvents(day) : <div className="cal-empty-day"><CalIcon name="calendar" /><p>{status !== 'all' || Object.values(filters).some(Boolean) ? 'Нет занятий с этими фильтрами' : 'На этот день занятий нет'}</p>{isOwner && day >= today && <button className="od-text-btn" onClick={() => create(day)}>Добавить регулярное занятие</button>}</div>}</div></div> : <div className="cal-week-grid">{days.map(key => <div key={key} className={`cal-day ${today === key ? 'cal-day-today' : ''} ${dateObject(key).getDay() === 0 || dateObject(key).getDay() === 6 ? 'cal-weekend' : ''}`}><div className="cal-day-header"><div><span>{dateObject(key).toLocaleDateString('ru-RU', { weekday: 'short' })}</span><strong>{dateObject(key).getDate()}</strong>{today === key && <small>сегодня</small>}</div>{isOwner && key >= today && <button className="od-icon-btn cal-day-add" aria-label={`Добавить повторение: ${dayText(key)}`} onClick={() => create(key)}><CalIcon name="plus" /></button>}</div><div className="cal-day-events">{loading ? <><div className="cal-skeleton" /><div className="cal-skeleton" /></> : byDay(key).length ? renderEvents(key) : <div className="cal-empty-column"><span>{status === 'all' ? 'Нет занятий' : 'Нет совпадений'}</span>{isOwner && key >= today && <button className="od-text-btn" onClick={() => create(key)}><CalIcon name="plus" />Добавить</button>}</div>}</div><div className="cal-day-footer"><span>{lessonCount(byDay(key).filter(item => !item.is_ghost).length)}</span>{byDay(key).some(item => item.status === 'replacement') && <span className="cal-replacement-count"><CalIcon name="replace" />Нужна замена</span>}</div></div>)}</div>}
      <footer className="cal-board-footer"><span><CalIcon name="repeat" />{isOwner ? 'Регулярные занятия · ответы на конкретные даты' : 'Все занятия ваших садов · подтверждайте каждую неделю'}</span><span>{loading || refreshing ? 'Обновляем…' : 'Ответы обновляются автоматически'}</span></footer>
    </section>
    <div className="cal-week-picker"><span>Недели месяца</span><div>{weeks.map(value => <button key={value} aria-pressed={week === value} className={week === value ? 'selected' : ''} onClick={() => chooseWeek(value)}>{weekText(value)}{value === monday(today) && <i />}</button>)}</div></div>
    {!contextLoading && !contextError && !context.branches.length && <p className="cal-no-branches">{isOwner ? 'Сначала добавьте сад в справочнике филиалов.' : 'Пока нет привязанных садов. Попросите владельца добавить вас к нужным филиалам.'}</p>}
    <Modal isOpen={!!active} onClose={() => { if (!saving) setActive(null); }} title="Занятие в календаре" size="calendar-detail">{detail ? <EventDetails item={detail} isOwner={isOwner} saving={saving} onEdit={edit} onRespond={confirm} onGoDate={goDate} /> : detailError ? <div className="cal-error" role="alert">{detailError}<button className="od-control" onClick={refresh}>Повторить</button></div> : <div className="cal-detail-loading" role="status">Загружаем детали…</div>}</Modal>
    <Modal isOpen={!!editor} onClose={closeEditor} title={teacherEditorTitles[editor?.kind] || editorTitles[editor?.kind]} size="calendar-editor">{editor && (teacherEditorTitles[editor.kind] ? <CalendarTeacherEditor key={`${editor.kind}-${editor.item.key}`} editor={editor} context={context} saving={saving} error={formError} onSubmit={submit} onCancel={closeEditor} /> : <CalendarEditor key={`${editor.kind}-${editor.item?.key || editor.date}`} editor={editor} context={context} today={today} saving={saving} error={formError} onSubmit={submit} onCancel={closeEditor} />)}</Modal>
  </div></Layout>;
}
