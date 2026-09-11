import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Layout from '../../components/Layout/Layout';
import Modal from '../../components/Modal/Modal';
import { IconLessons, IconPeople, IconBranches, IconTeachers } from '../../components/Icons/SidebarIcons';
import { formatCurrency, formatNumber, getCurrentMonth } from '../../utils/format';
import useMediaQuery from '../../hooks/useMediaQuery';
import { chartSeries, countLabel, itemsFrom, lessonRevenue, loadDashboardData, monthLabel, number, periodLabel, summarizeLessons } from './dashboardData';
import { FiltersControl, Hint, PeriodControl } from './DashboardControls';
import DashIcon from './DashboardIcons';
import './OwnerDashboard.css';

const EMPTY = [];
const MONEY_SERIES = [
  { key: 'revenue', label: 'Выручка', color: 'var(--color-primary)' },
  { key: 'profit', label: 'Прибыль', color: 'var(--color-secondary)' },
  { key: 'salary', label: 'Зарплаты', color: 'var(--color-chart-3)' },
];
const shortDate = value => new Date(value.length === 7 ? `${value}-01T12:00:00` : `${value}T12:00:00`).toLocaleDateString('ru-RU', value.length === 7 ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' });
const lessonDate = value => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
const lessonTime = value => new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const compactMoney = value => Math.abs(value) >= 1000000 ? `${(value / 1000000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн` : Math.abs(value) >= 1000 ? `${(value / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} тыс.` : value;
const instruction = lesson => lesson.is_creative ? 'Творческое занятие' : lesson.instruction_title || lesson.instruction_name || 'Тема не указана';

function FinancialTooltip({ active, payload, label, cumulative }) {
  if (!active || !payload?.length) return null;
  return <div className="od-chart-tooltip"><header>{shortDate(label)}<span>{cumulative ? 'Накопительно' : 'За период'}</span></header>{payload.map(item => <div key={item.dataKey}><span><i style={{ background: item.color }} />{item.name}</span><strong>{formatCurrency(item.value)}</strong></div>)}</div>;
}
function Metric({ title, value, children, icon, help, accent = false }) {
  return <div className={`od-metric ${accent ? 'od-metric-accent' : ''}`}><div className="od-metric-label">{icon}<span>{title}</span>{help && <Hint label={`Как считается: ${title.toLowerCase()}`}>{help}</Hint>}</div><strong className="od-metric-value">{value}</strong><div className="od-metric-caption">{children}</div></div>;
}
function EmptyState({ children }) { return <div className="od-empty"><IconLessons /><p>{children || 'За этот период занятий пока нет'}</p></div>; }

function DetailPanel({ detail, period, onClose }) {
  const [page, setPage] = useState(0), [query, setQuery] = useState('');
  const lessons = useMemo(() => [...detail.lessons].sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at)), [detail.lessons]);
  const filtered = lessons.filter(lesson => `${lesson.branch_name} ${lesson.teacher_name} ${instruction(lesson)}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
  const revenue = lessons.reduce((sum, lesson) => sum + lessonRevenue(lesson), 0);
  const salary = lessons.reduce((sum, lesson) => sum + number(lesson.teacher_salary), 0);
  return <Modal isOpen onClose={onClose} title={detail.title} size="dashboard">
    <div className="od-detail">
      <p className="od-detail-period">{periodLabel(period)} · {countLabel(lessons.length, ['занятие', 'занятия', 'занятий'])}</p>
      <div className="od-detail-totals"><div><span>Выручка</span><strong>{formatCurrency(revenue)}</strong></div><div><span>Зарплаты</span><strong>{formatCurrency(salary)}</strong></div><div><span>Прибыль</span><strong className={revenue - salary < 0 ? 'od-negative' : ''}>{formatCurrency(revenue - salary)}</strong></div></div>
      {lessons.length > 5 && <label className="od-search"><DashIcon name="search" /><input aria-label="Поиск занятий" placeholder="Филиал, преподаватель или тема…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>}
      <div className="od-detail-lessons">{filtered.slice(page * 10, page * 10 + 10).map(lesson => <details className="od-lesson-detail" key={lesson.id} open={lessons.length === 1 ? true : undefined}>
        <summary><span className="od-detail-date">{lessonDate(lesson.starts_at)}<small>{lessonTime(lesson.starts_at)}</small></span><span className="od-detail-name">{lesson.branch_name}<small>{lesson.teacher_name}</small></span><strong>{formatCurrency(lessonRevenue(lesson))}</strong><DashIcon name="chevron" /></summary>
        <div className="od-lesson-expanded"><p>{instruction(lesson)}</p><dl><div><dt>Платные посещения</dt><dd>{number(lesson.paid_children)}</dd></div><div><dt>Пробные посещения</dt><dd>{number(lesson.trial_children)}</dd></div><div><dt>Зарплата</dt><dd>{formatCurrency(lesson.teacher_salary)}</dd></div><div><dt>Прибыль</dt><dd>{formatCurrency(lessonRevenue(lesson) - number(lesson.teacher_salary))}</dd></div></dl></div>
      </details>)}</div>
      {!filtered.length && <EmptyState>Занятия не найдены</EmptyState>}
      {filtered.length > 10 && <div className="od-pagination"><span>{page * 10 + 1}–{Math.min(filtered.length, page * 10 + 10)} из {filtered.length}</span><div><button className="od-icon-btn" disabled={page === 0} aria-label="Предыдущая страница" onClick={() => setPage(p => p - 1)}><DashIcon name="arrow" style={{ transform: 'rotate(180deg)' }} /></button><button className="od-icon-btn" disabled={(page + 1) * 10 >= filtered.length} aria-label="Следующая страница" onClick={() => setPage(p => p + 1)}><DashIcon name="arrow" /></button></div></div>}
    </div>
  </Modal>;
}

export default function OwnerDashboard() {
  const [period, setPeriod] = useState(() => ({ start: getCurrentMonth(), end: getCurrentMonth() }));
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0);
  const [options, setOptions] = useState({}), [optionsLoading, setOptionsLoading] = useState(true), [optionsError, setOptionsError] = useState(false), [optionsReload, setOptionsReload] = useState(0);
  const [cumulative, setCumulative] = useState(true), [visibleSeries, setVisibleSeries] = useState(['revenue', 'profit']);
  const [rankType, setRankType] = useState('branches'), [rankExpanded, setRankExpanded] = useState(false), [tableMode, setTableMode] = useState('lessons'), [detail, setDetail] = useState(null);
  const mobile = useMediaQuery('(max-width: 600px)');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setDetail(null);
    loadDashboardData(period, filters, controller.signal).then(result => {
      if (!controller.signal.aborted) setData({ ...result, period });
    }).catch(() => {
      if (!controller.signal.aborted) setError('Не удалось обновить дашборд.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period, filters, reload]);
  useEffect(() => {
    const controller = new AbortController();
    setOptionsLoading(true); setOptionsError(false);
    Promise.all([API_ENDPOINTS.BRANCHES, API_ENDPOINTS.DEPARTMENTS, API_ENDPOINTS.TEACHERS].map(url => apiClient.get(`${url}?limit=500`, { signal: controller.signal }))).then(responses => {
      if (controller.signal.aborted) return;
      const [branches, departments, teachers] = responses.map(itemsFrom);
      const option = (item, name) => ({ value: String(item.id), label: name || `№ ${item.id}` });
      setOptions({ branch_id: branches.map(b => option(b, b.name)), department_id: departments.map(d => option(d, d.name)), teacher_id: teachers.map(t => option(t, t.full_name)) });
    }).catch(() => { if (!controller.signal.aborted) setOptionsError(true); }).finally(() => { if (!controller.signal.aborted) setOptionsLoading(false); });
    return () => controller.abort();
  }, [optionsReload]);

  const lessons = data?.lessons || EMPTY;
  const summary = useMemo(() => summarizeLessons(lessons), [lessons]);
  const monthly = summary.days.length > 62;
  const chart = useMemo(() => chartSeries(monthly ? summary.months : summary.days, cumulative), [summary, monthly, cumulative]);
  const ranked = useMemo(() => [...summary[rankType]].sort((a, b) => rankType === 'branches' ? b.revenue - a.revenue : b.count - a.count), [summary, rankType]);
  const recent = useMemo(() => [...lessons].sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at)).slice(0, 5), [lessons]);
  const kpi = data?.kpi || {};
  const revenue = number(kpi.revenue_sum), profit = revenue - summary.salary;
  const paid = number(kpi.paid_sum), trial = number(kpi.trial_sum), visits = paid + trial;
  const paidPercent = visits ? paid / visits * 100 : 0;
  const lessonCount = number(kpi.lessons_count);
  const average = lessonCount ? visits / lessonCount : 0;
  const rankMax = Math.max(1, ...ranked.map(row => rankType === 'branches' ? row.revenue : row.count));
  const activeFilters = Object.entries(filters).filter(([, value]) => value);
  const showGroup = group => setDetail({ title: group.name, lessons: group.lessons });
  const toggleSeries = key => setVisibleSeries(prev => prev.includes(key) ? prev.length > 1 ? prev.filter(value => value !== key) : prev : [...prev, key]);

  return <Layout dashboard>
    <div className="owner-overview">
      <h1 className="od-mobile-title">Обзор клуба</h1>
      <div className="od-toolbar"><PeriodControl value={period} onChange={setPeriod} /><span className="od-toolbar-divider" /><FiltersControl value={filters} onChange={setFilters} options={options} loading={optionsLoading} error={optionsError} onRetry={() => setOptionsReload(n => n + 1)} /><div className="od-toolbar-end"><button className={`od-icon-btn ${loading ? 'is-loading' : ''}`} aria-label="Обновить дашборд" title="Обновить данные" disabled={loading} onClick={() => setReload(n => n + 1)}><DashIcon name="refresh" /></button><Link className="od-control od-journal-link" to="/lessons"><IconLessons /><span>Журнал занятий</span><DashIcon name="arrow" /></Link></div></div>
      {activeFilters.length > 0 && <div className="od-applied-filters">{activeFilters.map(([key, value]) => { const name = options[key]?.find(option => option.value === value)?.label || 'Выбран фильтр'; return <button key={key} onClick={() => setFilters(prev => ({ ...prev, [key]: '' }))} aria-label={`Убрать фильтр: ${name}`}>{name}<DashIcon name="close" /></button>; })}<button className="od-reset" onClick={() => setFilters({})}>Сбросить</button></div>}
      <div className="od-live-status" role="status">{loading ? 'Обновляем данные…' : error ? '' : 'Данные обновлены'}</div>
      {error && <div className="od-error" role="alert"><span>{error}{data && ` Показаны последние загруженные данные за ${periodLabel(data.period)}.`}</span><button className="od-text-btn" onClick={() => setReload(n => n + 1)}>Повторить</button></div>}
      {!data && loading ? <div className="od-loading" aria-label="Загрузка дашборда"><div /><div /><div /></div> : data && <div className={`od-results ${loading ? 'od-refreshing' : ''}`} aria-busy={loading}>
        <section className="od-metrics" aria-label="Главные показатели">
          <Metric title="Выручка" value={formatCurrency(revenue)} accent icon={<DashIcon name="ruble" />} help="Выручка по занятиям за выбранный период. Это начисления, а не фактическое поступление денег.">{lessonCount ? `${formatCurrency(revenue / lessonCount)} на занятие` : 'Нет начислений за период'}</Metric>
          <Metric title="Прибыль" value={<span className={profit < 0 ? 'od-negative' : ''}>{formatCurrency(profit)}</span>} icon={<DashIcon name="trend" />} help="Выручка минус зарплаты преподавателей. Прочие расходы здесь не учитываются.">Зарплаты <span>{formatCurrency(summary.salary)}</span></Metric>
          <Metric title="Занятия" value={formatNumber(lessonCount)} icon={<IconLessons />}>{countLabel(summary.branches.length, ['филиал', 'филиала', 'филиалов'])} <span className="od-caption-separator">/</span> {countLabel(summary.teachers.length, ['преподаватель', 'преподавателя', 'преподавателей'])}</Metric>
          <Metric title="Посещения" value={formatNumber(visits)} icon={<IconPeople />} help="Сумма посещений всех занятий. Один ребёнок может учитываться несколько раз, если посетил несколько занятий."><span>{paid} платных</span><span className="od-caption-separator">/</span>{trial} пробных</Metric>
        </section>
        <div className="od-primary-grid">
          <section className="od-panel od-finance" aria-labelledby="od-finance-title">
            <header className="od-panel-heading"><div><h2 id="od-finance-title">Финансовая динамика</h2><p>{cumulative ? 'Нарастающим итогом' : monthly ? 'По месяцам' : 'В дни занятий'}</p></div><div className="od-segment"><button aria-pressed={cumulative} onClick={() => setCumulative(true)}>Накопительно</button><button aria-pressed={!cumulative} onClick={() => setCumulative(false)}>{monthly ? 'По месяцам' : 'По дням'}</button></div></header>
            <div className="od-chart-legend">{MONEY_SERIES.map(item => <button key={item.key} aria-pressed={visibleSeries.includes(item.key)} onClick={() => toggleSeries(item.key)}><i style={{ background: item.color }} />{item.label}</button>)}<Hint label="Как читать график">Нажмите на название показателя, чтобы скрыть или показать его. Наведите на график для точных сумм. На телефоне — коснитесь точки.</Hint></div>
            {chart.length ? <div className="od-chart" role="img" aria-label={`Финансовая динамика за ${periodLabel(data.period)}. Выручка ${formatCurrency(revenue)}, прибыль ${formatCurrency(profit)}.`}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
              <defs><linearGradient id="od-revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--color-border)" />
              <XAxis dataKey="id" tickFormatter={shortDate} axisLine={false} tickLine={false} tickMargin={10} minTickGap={mobile ? 42 : 36} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis width={64} tickFormatter={compactMoney} axisLine={false} tickLine={false} tickMargin={8} tickCount={4} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <Tooltip content={<FinancialTooltip cumulative={cumulative} />} cursor={{ stroke: 'var(--color-text-muted)', strokeDasharray: '3 4' }} wrapperStyle={{ outline: 'none', zIndex: 5 }} />
              {visibleSeries.includes('revenue') && (cumulative ? <Area dataKey="revenue" name="Выручка" type="linear" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#od-revenue-fill)" dot={chart.length === 1 ? { r: 4 } : false} activeDot={{ r: 4, stroke: 'var(--color-bg-surface)', strokeWidth: 3 }} isAnimationActive={false} /> : <Bar dataKey="revenue" name="Выручка" fill="var(--color-primary)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />)}
              {visibleSeries.includes('profit') && <Line dataKey="profit" name="Прибыль" type="linear" stroke="var(--color-secondary)" strokeWidth={2} dot={chart.length === 1 ? { r: 4 } : false} activeDot={{ r: 4 }} isAnimationActive={false} />}
              {visibleSeries.includes('salary') && <Line dataKey="salary" name="Зарплаты" type="linear" stroke="var(--color-chart-3)" strokeWidth={1.5} strokeDasharray="4 4" dot={chart.length === 1 ? { r: 4 } : false} isAnimationActive={false} />}
            </ComposedChart></ResponsiveContainer></div> : <EmptyState />}
            <footer className="od-finance-footer"><span>После зарплат <strong>{revenue > 0 ? `${Math.round(profit / revenue * 100)}% выручки` : '—'}</strong></span><button className="od-text-btn" onClick={() => { setTableMode('months'); document.getElementById('od-period-details')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }}>По месяцам <DashIcon name="arrow" /></button></footer>
          </section>
          <section className="od-panel od-ranking" aria-label="Результаты филиалов и преподавателей">
            <header className="od-panel-heading"><div className="od-tabs"><button aria-pressed={rankType === 'branches'} onClick={() => { setRankType('branches'); setRankExpanded(false); }}><IconBranches />Филиалы</button><button aria-pressed={rankType === 'teachers'} onClick={() => { setRankType('teachers'); setRankExpanded(false); }}><IconTeachers />Преподаватели</button></div></header>
            <div className="od-ranking-caption"><span>{rankType === 'branches' ? 'По выручке' : 'По количеству занятий'}</span><span>{countLabel(ranked.length, rankType === 'branches' ? ['филиал', 'филиала', 'филиалов'] : ['преподаватель', 'преподавателя', 'преподавателей'])}</span></div>
            {ranked.length ? <div className={`od-rank-list ${rankExpanded ? 'is-expanded' : ''}`}>{ranked.slice(0, rankExpanded ? undefined : 5).map((row, index) => <button className="od-rank-row" key={row.id} onClick={() => showGroup(row)} aria-label={`Подробнее: ${row.name}`}><span className="od-rank-number">{String(index + 1).padStart(2, '0')}</span><span className="od-rank-name"><span>{row.name}</span><span className="od-rank-track"><i style={{ width: `${Math.max(0, (rankType === 'branches' ? row.revenue : row.count) / rankMax * 100)}%` }} /></span></span><span className="od-rank-value">{rankType === 'branches' ? formatCurrency(row.revenue) : row.count}<small>{rankType === 'branches' ? `${row.count} зан.` : formatCurrency(row.revenue)}</small></span><DashIcon name="chevron" /></button>)}</div> : <EmptyState />}
            <footer className="od-rank-footer">{ranked.length > 5 ? <button className="od-text-btn" onClick={() => setRankExpanded(v => !v)}>{rankExpanded ? 'Свернуть список' : `Показать все · ${ranked.length}`}<DashIcon name="arrow" /></button> : <span>Нажмите на строку для деталей</span>}</footer>
          </section>
        </div>
        <div className="od-secondary-grid">
          <section className="od-panel od-recent" id="od-period-details">
            <header className="od-panel-heading"><div className="od-tabs"><button aria-pressed={tableMode === 'lessons'} onClick={() => setTableMode('lessons')}>Последние занятия</button><button aria-pressed={tableMode === 'months'} onClick={() => setTableMode('months')}>По месяцам</button></div>{lessons.length > 0 && <button className="od-text-btn" onClick={() => setDetail({ title: 'Занятия за период', lessons })}>Все {lessons.length}<DashIcon name="arrow" /></button>}</header>
            {tableMode === 'lessons' ? recent.length ? <div className="od-recent-list"><div className="od-recent-labels"><span>Дата</span><span>Филиал / преподаватель</span><span>Посещения</span><span>Выручка</span><span /></div>{recent.map(lesson => <button className="od-recent-row" key={lesson.id} onClick={() => setDetail({ title: 'Детали занятия', lessons: [lesson] })}><span className="od-recent-date">{lessonDate(lesson.starts_at)}<small>{lessonTime(lesson.starts_at)}</small></span><span className="od-recent-name">{lesson.branch_name}<small>{lesson.teacher_name}</small></span><span className="od-recent-visits">{number(lesson.paid_children) + number(lesson.trial_children)}<small>{number(lesson.trial_children) ? `${lesson.trial_children} проб.` : 'платные'}</small></span><strong>{formatCurrency(lessonRevenue(lesson))}</strong><DashIcon name="chevron" /></button>)}</div> : <EmptyState /> : summary.months.length ? <div className="od-month-table"><div className="od-month-row od-month-labels"><span>Месяц</span><span>Занятия</span><span>Выручка</span><span>Прибыль</span></div>{summary.months.map(row => <button className="od-month-row" key={row.id} onClick={() => setDetail({ title: monthLabel(row.id), lessons: row.lessons })}><span>{monthLabel(row.id, true)}</span><span>{row.count}</span><strong>{formatCurrency(row.revenue)}</strong><strong className={row.profit < 0 ? 'od-negative' : ''}>{formatCurrency(row.profit)}</strong></button>)}</div> : <EmptyState />}
          </section>
          <section className="od-panel od-attendance" aria-labelledby="od-attendance-title"><header className="od-panel-heading"><h2 id="od-attendance-title">Посещаемость</h2><Hint label="О посещаемости">Платные и пробные посещения за выбранный период. Доля пробных посещений не равна конверсии в оплату.</Hint></header><div className="od-attendance-body"><div className="od-attendance-total"><strong>{formatNumber(visits)}</strong><span>посещений за период</span></div><div className="od-attendance-bar" aria-hidden="true"><span style={{ width: `${paidPercent}%` }} /><span style={{ width: `${visits ? 100 - paidPercent : 0}%` }} /></div><div className="od-attendance-legend"><div><span><i />Платные</span><strong>{paid}<small>{visits ? Math.round(paidPercent) : 0}%</small></strong></div><div><span><i />Пробные</span><strong>{trial}<small>{visits ? Math.round(100 - paidPercent) : 0}%</small></strong></div></div><div className="od-average"><IconPeople /><span>В среднем на занятии</span><strong>{average.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}</strong></div></div></section>
        </div>
      </div>}
      {detail && <DetailPanel key={detail.title} detail={detail} period={data.period} onClose={() => setDetail(null)} />}
    </div>
  </Layout>;
}
