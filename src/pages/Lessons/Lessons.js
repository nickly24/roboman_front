import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { formatCurrency, getCurrentMonth } from '../../utils/format';
import Layout from '../../components/Layout/Layout';
import Modal from '../../components/Modal/Modal';
import InvoiceModal from '../../components/InvoiceModal/InvoiceModal';
import { IconSchedule, IconLessons, IconPeople, IconTeachers, IconBranches, IconChevronLeft, IconChevronRight } from '../../components/Icons/SidebarIcons';
import { FiltersControl, Hint, PeriodControl } from '../Dashboard/DashboardControls';
import DashIcon from '../Dashboard/DashboardIcons';
import { countLabel, itemsFrom } from '../Dashboard/dashboardData';
import useMediaQuery from '../../hooks/useMediaQuery';
import LessonForm from './LessonForm';
import { addDays, fetchCalendarLessons, inPeriod, lessonTopic, localDateKey, monthBounds, monthOf, startOfWeek, teacherColor, totalsFor, weekLabel, weeksOfMonth } from './lessonCalendarData';
import '../Dashboard/OwnerDashboard.css';
import './Lessons.css';
import './LessonWorkspace.css';

const Plus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
const Edit = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12H4v-5L16 3Zm-3 3 5 5" /></svg>;
const Trash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg>;
const FILTER_FIELDS = [{ key: 'branch_id', label: 'Филиалы', all: 'Все филиалы' }, { key: 'department_id', label: 'Отделы', all: 'Все отделы' }, { key: 'teacher_id', label: 'Преподаватели', all: 'Все преподаватели' }];
const timeLabel = value => new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dayLabel = value => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
const fullDayLabel = value => new Date(value).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const modeNames = { PLAN: 'По учебному плану', REPEAT: 'Повтор', OFF_PLAN_REPLACE: 'Вне плана · замена', OFF_PLAN_PAUSE: 'Вне плана · без продвижения' };

function LessonEvent({ lesson, isOwner, onOpen }) {
  const paid = Number(lesson.paid_children) || 0, trial = Number(lesson.trial_children) || 0;
  return <button className="lc-event" style={{ '--teacher-color': teacherColor(lesson) }} onClick={() => onOpen(lesson)} aria-label={`${timeLabel(lesson.starts_at)}, ${lesson.branch_name}, ${lesson.teacher_name || 'занятие'}`}>
    <span className="lc-event-top"><strong>{timeLabel(lesson.starts_at)}</strong><DashIcon name="chevron" /></span>
    <span className="lc-event-branch">{lesson.branch_name}</span>
    {isOwner && <span className="lc-event-teacher"><i />{lesson.teacher_name || 'Преподаватель'}</span>}
    <span className="lc-event-topic">{lessonTopic(lesson)}</span>
    <span className="lc-event-bottom"><span><IconPeople />{paid + trial}{trial > 0 && <small>· {trial} проб.</small>}</span><strong>{formatCurrency(isOwner ? lesson.revenue : lesson.teacher_salary)}</strong></span>
    {!!lesson.is_salary_free && <span className="lc-no-salary">Без начисления зарплаты</span>}
  </button>;
}

export default function Lessons() {
  const { isOwner, user } = useAuth();
  const smallScreen = useMediaQuery('(max-width: 900px)');
  const [month, setMonth] = useState(getCurrentMonth());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => localDateKey(new Date()));
  const [viewMode, setViewMode] = useState('calendar');
  const [filters, setFilters] = useState({});
  const [records, setRecords] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0);
  const [options, setOptions] = useState({}), [optionsLoading, setOptionsLoading] = useState(true), [optionsError, setOptionsError] = useState(false), [optionsReload, setOptionsReload] = useState(0);
  const [form, setForm] = useState(null), [preview, setPreview] = useState(null), [confirmation, setConfirmation] = useState(null), [saving, setSaving] = useState(false), [actionError, setActionError] = useState('');
  const [showInvoices, setShowInvoices] = useState(false), [invoiceData, setInvoiceData] = useState(null);
  const swipe = useRef(null), calendarRef = useRef(null);
  const today = localDateKey(new Date());
  const title = isOwner ? 'Журнал занятий' : 'Мои занятия';

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchCalendarLessons(month, weekStart, filters, controller.signal).then(data => { if (!controller.signal.aborted) setRecords(data); }).catch(() => { if (!controller.signal.aborted) { setRecords([]); setError('Не удалось загрузить занятия. Попробуйте ещё раз.'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, weekStart, filters, reload]);
  useEffect(() => {
    const controller = new AbortController();
    setOptionsLoading(true); setOptionsError(false);
    const urls = isOwner ? [API_ENDPOINTS.BRANCHES, API_ENDPOINTS.DEPARTMENTS, API_ENDPOINTS.TEACHERS] : user?.profile?.id ? [API_ENDPOINTS.TEACHER_BRANCHES(user.profile.id)] : [];
    Promise.all(urls.map(url => apiClient.get(`${url}?limit=500`, { signal: controller.signal }))).then(responses => {
      if (controller.signal.aborted) return;
      const [branches = [], departments = [], teachers = []] = responses.map(itemsFrom);
      const option = (id, name) => ({ value: String(id), label: name || `№ ${id}` });
      const teacherDepartments = [...new Map(branches.filter(b => b.department_id != null).map(b => [String(b.department_id), option(b.department_id, b.department_name)])).values()];
      setOptions({ branch_id: branches.map(b => option(b.id ?? b.branch_id, b.name || b.branch_name)), department_id: isOwner ? departments.map(d => option(d.id, d.name)) : teacherDepartments, teacher_id: teachers.map(t => option(t.id, t.full_name)) });
    }).catch(() => { if (!controller.signal.aborted) setOptionsError(true); }).finally(() => { if (!controller.signal.aborted) setOptionsLoading(false); });
    return () => controller.abort();
  }, [isOwner, user?.profile?.id, optionsReload]);

  const bounds = useMemo(() => monthBounds(month), [month]);
  const monthLessons = useMemo(() => records.filter(lesson => inPeriod(lesson, bounds.start, bounds.end)), [records, bounds]);
  const monthTotals = useMemo(() => totalsFor(monthLessons), [monthLessons]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => { const date = addDays(weekStart, index); return { date, key: localDateKey(date) }; }), [weekStart]);
  const byDay = useMemo(() => { const map = new Map(); records.forEach(lesson => { const key = localDateKey(lesson.starts_at); if (!map.has(key)) map.set(key, []); map.get(key).push(lesson); }); return map; }, [records]);
  const weekLessons = useMemo(() => records.filter(lesson => inPeriod(lesson, weekStart, addDays(weekStart, 7))), [records, weekStart]);
  const weekTotals = useMemo(() => totalsFor(weekLessons), [weekLessons]);
  const weeks = useMemo(() => weeksOfMonth(month).map(date => ({ date, key: localDateKey(date), totals: totalsFor(monthLessons.filter(lesson => inPeriod(lesson, date, addDays(date, 7)))) })), [month, monthLessons]);
  const groups = useMemo(() => {
    const map = new Map(); monthLessons.forEach(lesson => { const key = String(lesson.branch_id); if (!map.has(key)) map.set(key, { id: lesson.branch_id, name: lesson.branch_name, lessons: [] }); map.get(key).lessons.push(lesson); });
    return [...map.values()].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
  }, [monthLessons]);

  const chooseMonth = value => {
    const date = value === getCurrentMonth() ? new Date() : monthBounds(value).start;
    setMonth(value); setWeekStart(startOfWeek(date)); setSelectedDay(localDateKey(date));
  };
  const chooseWeek = date => { setWeekStart(date); setSelectedDay(today >= localDateKey(date) && today <= localDateKey(addDays(date, 6)) ? today : localDateKey(date)); };
  const shiftWeek = direction => { const date = addDays(weekStart, direction * 7); setMonth(monthOf(addDays(date, 3))); chooseWeek(date); };
  const goToday = () => { setMonth(getCurrentMonth()); chooseWeek(startOfWeek(new Date())); setSelectedDay(today); };
  const createLesson = date => setForm({ lesson: null, initialValues: { branch_id: filters.branch_id || '', teacher_id: isOwner ? filters.teacher_id || '' : user?.profile?.id, starts_at: `${date || (month === getCurrentMonth() ? today : localDateKey(bounds.start))}T10:00` } });
  const editLesson = lesson => { setPreview(null); setForm({ lesson }); };
  const openConfirmation = (type, lesson) => { setActionError(''); setConfirmation({ type, lesson }); };
  const confirmAction = async () => {
    setSaving(true); setActionError('');
    try {
      if (confirmation.type === 'delete') await apiClient.delete(API_ENDPOINTS.LESSON(confirmation.lesson.id));
      else await apiClient.put(confirmation.lesson.is_salary_free ? API_ENDPOINTS.LESSON_SALARY_PAID(confirmation.lesson.id) : API_ENDPOINTS.LESSON_SALARY_FREE(confirmation.lesson.id));
      setConfirmation(null); setPreview(null); setReload(n => n + 1);
    } catch (err) { setActionError(err.response?.data?.error?.message || 'Не удалось выполнить действие. Попробуйте ещё раз.'); }
    finally { setSaving(false); }
  };
  const selectAdjacentDay = direction => {
    const next = addDays(new Date(`${selectedDay}T12:00:00`), direction);
    const nextWeek = startOfWeek(next);
    if (localDateKey(nextWeek) !== localDateKey(weekStart)) { setMonth(monthOf(addDays(nextWeek, 3))); setWeekStart(nextWeek); }
    setSelectedDay(localDateKey(next));
  };
  const currentDayLessons = byDay.get(selectedDay) || [];

  return <Layout headerTitle={title} className="layout-lessons-workspace">
    <div className="lesson-workspace">
      <h1 className="od-mobile-title">{title}</h1>
      <div className="lc-toolbar"><PeriodControl value={{ start: month, end: month }} onChange={value => chooseMonth(value.start)} allowRange={false} showArrows={false} title="Месяц занятий" /><FiltersControl value={filters} onChange={setFilters} options={options} loading={optionsLoading} error={optionsError} onRetry={() => setOptionsReload(n => n + 1)} title="Фильтры занятий" fields={isOwner ? FILTER_FIELDS : FILTER_FIELDS.slice(0, 2)} /><div className="lc-toolbar-actions"><div className="lc-view-switch" aria-label="Вид занятий"><button aria-label="Календарь" aria-pressed={viewMode === 'calendar'} onClick={() => setViewMode('calendar')}><IconSchedule /><span>Календарь</span></button><button aria-label="Список" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}><IconLessons /><span>Список</span></button></div><button aria-label="Добавить занятие" className="od-primary-btn lc-create" onClick={() => createLesson()}><Plus /><span>Добавить занятие</span></button></div></div>
      {Object.values(filters).some(Boolean) && <div className="od-applied-filters">{Object.entries(filters).filter(([, value]) => value).map(([key, value]) => { const name = options[key]?.find(item => item.value === value)?.label || 'Выбран фильтр'; return <button key={key} aria-label={`Убрать фильтр: ${name}`} onClick={() => setFilters(previous => ({ ...previous, [key]: '' }))}>{name}<DashIcon name="close" /></button>; })}<button className="od-reset" onClick={() => setFilters({})}>Сбросить</button></div>}
      <div className="lc-month-summary"><span className="lc-summary-period">За месяц</span><span><IconLessons /><strong>{loading ? '…' : monthTotals.count}</strong> занятий</span><span><IconPeople /><strong>{loading ? '…' : monthTotals.paid + monthTotals.trial}</strong> посещений</span>{isOwner && <span className="lc-month-revenue">Выручка <strong>{loading ? '…' : formatCurrency(monthTotals.revenue)}</strong></span>}<span className="lc-month-salary">Зарплата <strong>{loading ? '…' : formatCurrency(monthTotals.salary)}</strong></span>{isOwner && <button className="od-text-btn lc-invoice-action" disabled={loading || !groups.length} onClick={() => setShowInvoices(true)}><IconLessons />Выставить счета<DashIcon name="arrow" /></button>}</div>
      {error && <div className="od-error" role="alert"><span>{error}</span><button className="od-text-btn" onClick={() => setReload(n => n + 1)}>Повторить</button></div>}
      <div className="od-live-status" role="status">{loading ? 'Загрузка занятий…' : `${countLabel(weekTotals.count, ['занятие', 'занятия', 'занятий'])} за неделю`}</div>
      {viewMode === 'calendar' ? <section className={`lc-calendar ${loading ? 'lc-refreshing' : ''}`} aria-busy={loading} ref={calendarRef}>
        <header className="lc-calendar-header"><div className="lc-week-navigation"><button className="od-icon-btn" aria-label="Предыдущая неделя" onClick={() => shiftWeek(-1)}><IconChevronLeft /></button><button className="od-icon-btn" aria-label="Следующая неделя" onClick={() => shiftWeek(1)}><IconChevronRight /></button><h2>{weekLabel(weekStart)}</h2><button className="od-control lc-today" onClick={goToday}>Сегодня</button></div><span className="lc-week-count">{loading ? 'Обновляем…' : countLabel(weekTotals.count, ['занятие', 'занятия', 'занятий'])}<Hint label="Работа с календарём">Нажмите на занятие для подробностей и редактирования. Кнопка + добавит занятие на выбранный день. Стрелки переключают недели, включая соседние месяцы.</Hint></span></header>
        {smallScreen ? <div className="lc-mobile-calendar"><div className="lc-day-strip" aria-label="Дни недели">{weekDays.map(day => <button key={day.key} aria-pressed={selectedDay === day.key} aria-label={fullDayLabel(day.date)} className={`${selectedDay === day.key ? 'selected' : ''} ${day.key === today ? 'today' : ''}`} onClick={() => setSelectedDay(day.key)}><span>{day.date.toLocaleDateString('ru-RU', { weekday: 'short' })}</span><strong>{day.date.getDate()}</strong><i className={(byDay.get(day.key) || []).length ? 'has-lessons' : ''} /></button>)}</div><div className="lc-mobile-day" onTouchStart={event => { swipe.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={event => { if (!swipe.current) return; const dx = event.changedTouches[0].clientX - swipe.current.x, dy = event.changedTouches[0].clientY - swipe.current.y; if (Math.abs(dx) > 70 && Math.abs(dy) < 45) selectAdjacentDay(dx < 0 ? 1 : -1); swipe.current = null; }}><div className="lc-mobile-day-title"><h3>{fullDayLabel(`${selectedDay}T12:00:00`)}</h3><button className="od-icon-btn" aria-label={`Добавить занятие на ${dayLabel(`${selectedDay}T12:00:00`)}`} onClick={() => createLesson(selectedDay)}><Plus /></button></div>{loading ? <div className="lc-day-loading">Загружаем занятия…</div> : currentDayLessons.length ? currentDayLessons.map(lesson => <LessonEvent key={lesson.id} lesson={lesson} isOwner={isOwner} onOpen={setPreview} />) : <div className="lc-empty-day"><IconSchedule /><p>На этот день занятий нет</p><button className="od-text-btn" onClick={() => createLesson(selectedDay)}><Plus />Добавить занятие</button></div>}</div></div> : <div className="lc-week-grid">{weekDays.map(day => {
          const dayLessons = byDay.get(day.key) || [], total = totalsFor(dayLessons);
          return <section key={day.key} className={`lc-day ${day.key === today ? 'lc-day-today' : ''} ${monthOf(day.date) !== month ? 'lc-day-adjacent' : ''}`}><header className="lc-day-header"><div><span>{day.date.toLocaleDateString('ru-RU', { weekday: 'short' })}</span><strong>{day.date.getDate()}</strong>{monthOf(day.date) !== month && <small>{day.date.toLocaleDateString('ru-RU', { month: 'short' })}</small>}</div><button className="od-icon-btn lc-day-add" aria-label={`Добавить занятие на ${dayLabel(day.date)}`} onClick={() => createLesson(day.key)}><Plus /></button></header><div className="lc-day-events">{loading ? <div className="lc-event-skeleton" /> : dayLessons.length ? dayLessons.map(lesson => <LessonEvent key={lesson.id} lesson={lesson} isOwner={isOwner} onOpen={setPreview} />) : <button className="lc-empty-slot" onClick={() => createLesson(day.key)} aria-label={`Добавить занятие на ${dayLabel(day.date)}`}><Plus /><span>Нет занятий</span></button>}</div>{!loading && dayLessons.length > 0 && <footer className="lc-day-total"><span>{total.paid + total.trial} посещ.</span><strong>{formatCurrency(isOwner ? total.revenue : total.salary)}</strong></footer>}</section>;
        })}</div>}
        <footer className="lc-week-total"><span>За неделю</span><span>Платные <strong>{loading ? '…' : weekTotals.paid}</strong></span><span>Пробные <strong>{loading ? '…' : weekTotals.trial}</strong></span>{isOwner && <span className="lc-total-revenue">Выручка <strong>{loading ? '…' : formatCurrency(weekTotals.revenue)}</strong></span>}<span>Зарплаты <strong>{loading ? '…' : formatCurrency(weekTotals.salary)}</strong></span>{isOwner && <span>Прибыль <strong className={weekTotals.revenue - weekTotals.salary < 0 ? 'od-negative' : ''}>{loading ? '…' : formatCurrency(weekTotals.revenue - weekTotals.salary)}</strong></span>}</footer>
      </section> : <section className="lc-list" aria-label="Занятия по филиалам" aria-busy={loading}>{loading ? <div className="lc-list-empty">Загружаем занятия…</div> : groups.length ? groups.map((group, index) => <details className="lc-list-group" key={group.id} open={index === 0 ? true : undefined}><summary><IconBranches /><strong>{group.name}</strong><span>{countLabel(group.lessons.length, ['занятие', 'занятия', 'занятий'])}</span><DashIcon name="chevron" /></summary><div className="lc-list-items">{group.lessons.map(lesson => <button className="lc-list-row" key={lesson.id} onClick={() => setPreview(lesson)}><span className="lc-list-date">{dayLabel(lesson.starts_at)}<small>{timeLabel(lesson.starts_at)}</small></span><span className="lc-list-topic">{lessonTopic(lesson)}<small>{isOwner ? lesson.teacher_name : modeNames[lesson.curriculum_mode] || ''}</small></span><span className="lc-list-visits"><IconPeople />{(Number(lesson.paid_children) || 0) + (Number(lesson.trial_children) || 0)}</span><strong>{formatCurrency(isOwner ? lesson.revenue : lesson.teacher_salary)}</strong><DashIcon name="chevron" /></button>)}</div></details>) : <div className="lc-list-empty"><IconLessons /><p>За выбранный месяц занятий нет</p><button className="od-text-btn" onClick={() => createLesson()}>Добавить занятие</button></div>}</section>}
      {viewMode === 'calendar' && <section className="lc-week-overview" aria-label="Быстрый переход по неделям месяца"><div className="lc-week-overview-label">Недели месяца<span>{isOwner ? 'Выручка' : 'Зарплата'}</span></div><div className="lc-week-pills">{weeks.map(week => <button key={week.key} className={week.key === localDateKey(weekStart) ? 'selected' : ''} aria-pressed={week.key === localDateKey(weekStart)} onClick={() => chooseWeek(week.date)} title={`Зарплаты: ${formatCurrency(week.totals.salary)}${isOwner ? ` · Прибыль: ${formatCurrency(week.totals.revenue - week.totals.salary)}` : ''}`}><span>{weekLabel(week.date)}</span><strong>{loading ? '…' : formatCurrency(isOwner ? week.totals.revenue : week.totals.salary)}</strong><small>{loading ? '…' : countLabel(week.totals.count, ['занятие', 'занятия', 'занятий'])}</small><i style={{ width: `${loading ? 0 : Math.max(0, (isOwner ? week.totals.revenue : week.totals.salary) / Math.max(1, ...weeks.map(w => isOwner ? w.totals.revenue : w.totals.salary)) * 100)}%` }} /></button>)}</div></section>}
      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title="Занятие" size="lesson-preview">{preview && <div className="lc-preview"><div className="lc-preview-date"><IconSchedule /><span>{fullDayLabel(preview.starts_at)} · {timeLabel(preview.starts_at)}</span></div><h3>{preview.branch_name}</h3>{isOwner && <p className="lc-preview-teacher"><IconTeachers /><i style={{ background: teacherColor(preview) }} />{preview.teacher_name}</p>}<div className="lc-preview-topic"><IconLessons /><div><strong>{lessonTopic(preview)}</strong>{preview.curriculum_mode && <><span>{modeNames[preview.curriculum_mode] || preview.curriculum_mode}</span><small>{[preview.curriculum_plan_name, preview.curriculum_module_name, preview.curriculum_lesson_name].filter(Boolean).join(' · ')}</small></>}</div></div><div className="lc-preview-visits"><div><span>Платные</span><strong>{preview.paid_children ?? 0}</strong></div><div><span>Пробные</span><strong>{preview.trial_children ?? 0}</strong></div><div><span>Всего</span><strong>{(Number(preview.paid_children) || 0) + (Number(preview.trial_children) || 0)}</strong></div></div><dl className="lc-preview-finance">{isOwner && <div><dt>Выручка</dt><dd>{formatCurrency(preview.revenue)}</dd></div>}<div><dt>Зарплата преподавателя</dt><dd>{formatCurrency(preview.teacher_salary)}</dd></div>{isOwner && <div><dt>Прибыль</dt><dd className={Number(preview.revenue) - Number(preview.teacher_salary) < 0 ? 'od-negative' : ''}>{formatCurrency(Number(preview.revenue) - Number(preview.teacher_salary))}</dd></div>}</dl>{!!preview.is_salary_free && <p className="lc-no-salary">За это занятие зарплата не начисляется</p>}<footer className="lc-preview-actions"><button className="od-primary-btn" onClick={() => editLesson(preview)}><Edit />Редактировать</button>{isOwner && <><button className="od-control" onClick={() => openConfirmation('salary', preview)}>{preview.is_salary_free ? 'Начислять зарплату' : 'Без зарплаты'}</button><button className="od-icon-btn lc-delete" aria-label="Удалить занятие" title="Удалить занятие" onClick={() => openConfirmation('delete', preview)}><Trash /></button></>}</footer></div>}</Modal>
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.lesson ? 'Редактировать занятие' : 'Добавить занятие'} size="medium">{form && <LessonForm lesson={form.lesson} initialValues={form.initialValues} onSuccess={() => { setForm(null); setReload(n => n + 1); }} onCancel={() => setForm(null)} />}</Modal>
      <Modal isOpen={!!confirmation} onClose={() => { if (!saving) setConfirmation(null); }} title={confirmation?.type === 'delete' ? 'Удалить занятие?' : 'Изменить начисление зарплаты?'} size="small">{confirmation && <div className="lc-confirm"><p>{dayLabel(confirmation.lesson.starts_at)} · {timeLabel(confirmation.lesson.starts_at)}<br /><strong>{confirmation.lesson.branch_name}</strong></p><p>{confirmation.type === 'delete' ? 'Занятие будет удалено из журнала и расчётов.' : confirmation.lesson.is_salary_free ? 'За занятие снова будет начисляться зарплата преподавателю.' : 'Занятие останется в журнале, зарплата за него начисляться не будет.'}</p>{actionError && <p className="form-error" role="alert">{actionError}</p>}<div><button className="od-control" disabled={saving} onClick={() => setConfirmation(null)}>Отмена</button><button className={`od-primary-btn ${confirmation.type === 'delete' ? 'lc-danger-btn' : ''}`} disabled={saving} onClick={confirmAction}>{saving ? 'Сохраняем…' : confirmation.type === 'delete' ? 'Удалить занятие' : 'Подтвердить'}</button></div></div>}</Modal>
      <Modal isOpen={showInvoices} onClose={() => setShowInvoices(false)} title="Счета по филиалам" size="medium"><div className="lc-invoices"><p>По занятиям за {new Date(`${month}-01T12:00:00`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}{Object.values(filters).some(Boolean) ? ', с учётом выбранных фильтров' : ''}.</p>{groups.map(group => <button key={group.id} onClick={() => { setShowInvoices(false); setInvoiceData({ branchName: group.name, lessons: group.lessons, month }); }}><span><strong>{group.name}</strong><small>{countLabel(group.lessons.length, ['занятие', 'занятия', 'занятий'])}</small></span><strong>{formatCurrency(totalsFor(group.lessons).revenue)}</strong><DashIcon name="arrow" /></button>)}</div></Modal>
      {invoiceData && <InvoiceModal isOpen onClose={() => setInvoiceData(null)} branchName={invoiceData.branchName} lessons={invoiceData.lessons} month={invoiceData.month} />}
    </div>
  </Layout>;
}
