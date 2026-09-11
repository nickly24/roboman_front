import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconSchedule, IconChevronLeft, IconChevronRight, IconChevronDown, IconFilter, IconBranches } from '../../components/Icons/SidebarIcons';
import { getCurrentMonth } from '../../utils/format';
import { monthLabel, periodLabel, shiftMonth } from './dashboardData';
import DashIcon from './DashboardIcons';

export function DashboardPopover({ anchor, title, onClose, children, width = 340 }) {
  const ref = useRef(null), close = useRef(onClose), id = useId();
  close.current = onClose;
  const [position, setPosition] = useState(null);
  const didFocus = useRef(false);
  useLayoutEffect(() => {
    const place = () => {
      const bounds = anchor.current?.getBoundingClientRect();
      if (!bounds) return;
      const w = Math.min(width, window.innerWidth - 24);
      const height = ref.current?.offsetHeight || 400;
      setPosition({ width: w, left: Math.max(12, Math.min(bounds.left, window.innerWidth - w - 12)), top: Math.max(12, Math.min(bounds.bottom + 8, window.innerHeight - height - 12)) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor, width]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key === 'Tab') {
        const elements = Array.from(ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length);
        const first = elements[0], last = elements[elements.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  useLayoutEffect(() => {
    if (position && !didFocus.current) {
      (ref.current?.querySelector('[data-autofocus]') || ref.current)?.focus();
      didFocus.current = true;
    }
  }, [position]);
  return createPortal(<div className="od-popover-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="od-popover" ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} style={{ ...position, visibility: position ? 'visible' : 'hidden' }}>
      <header className="od-popover-heading"><h2 id={id}>{title}</h2><button className="od-icon-btn" aria-label="Закрыть" onClick={onClose}><DashIcon name="close" /></button></header>
      {children}
    </section>
  </div>, document.body);
}

export function Hint({ children, label }) {
  const [open, setOpen] = useState(false), id = useId();
  return <span className="od-hint" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button className="od-info" aria-label={label} aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}><DashIcon name="info" /></button>
    {open && <span className="od-hint-content" role="tooltip" id={id}>{children}</span>}
  </span>;
}

const MONTHS = Array.from({ length: 12 }, (_, index) => new Date(2026, index, 1).toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''));
export function PeriodControl({ value, onChange, allowRange = true, showArrows = true, title = 'Период отчёта', triggerLabel }) {
  const anchor = useRef(null);
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(value), [range, setRange] = useState(false), [year, setYear] = useState(Number(value.start.slice(0, 4)));
  const show = () => { setDraft(value); setRange(allowRange && value.start !== value.end); setYear(Number(value.start.slice(0, 4))); setOpen(true); };
  const commit = period => { onChange(period); setOpen(false); };
  const select = month => {
    if (!range) { commit({ start: month, end: month }); return; }
    if (draft.end || !draft.start) setDraft({ start: month, end: '' });
    else setDraft({ start: month < draft.start ? month : draft.start, end: month < draft.start ? draft.start : month });
  };
  return <div className="od-period-control">
    {showArrows && <button className="od-icon-btn od-month-step" disabled={value.start !== value.end} aria-label="Предыдущий месяц" onClick={() => { const m = shiftMonth(value.start, -1); onChange({ start: m, end: m }); }}><IconChevronLeft /></button>}
    <button ref={anchor} className="od-control od-period-trigger" onClick={show} aria-expanded={open} aria-haspopup="dialog"><IconSchedule /><span>{triggerLabel || periodLabel(value)}</span><IconChevronDown /></button>
    {showArrows && <button className="od-icon-btn od-month-step" disabled={value.start !== value.end} aria-label="Следующий месяц" onClick={() => { const m = shiftMonth(value.start, 1); onChange({ start: m, end: m }); }}><IconChevronRight /></button>}
    {open && <DashboardPopover anchor={anchor} title={title} onClose={() => setOpen(false)}>
      <div className="od-period-panel">
        {allowRange && <div className="od-segment" aria-label="Режим периода"><button aria-pressed={!range} onClick={() => setRange(false)}>Месяц</button><button aria-pressed={range} onClick={() => { setRange(true); setDraft({ start: '', end: '' }); }}>Диапазон</button></div>}
        <div className="od-year"><button className="od-icon-btn" aria-label="Предыдущий год" disabled={year <= 2000} onClick={() => setYear(y => y - 1)}><IconChevronLeft /></button><strong>{year}</strong><button className="od-icon-btn" aria-label="Следующий год" disabled={year >= 2100} onClick={() => setYear(y => y + 1)}><IconChevronRight /></button></div>
        <div className="od-month-grid">{MONTHS.map((label, index) => {
          const month = `${year}-${String(index + 1).padStart(2, '0')}`;
          const edge = month === draft.start || month === draft.end;
          return <button key={month} aria-label={monthLabel(month)} aria-pressed={edge} className={`${edge ? 'selected' : ''} ${range && month > draft.start && month < draft.end ? 'in-range' : ''}`} onClick={() => select(month)}>{label}</button>;
        })}</div>
        {range && <p className="od-range-summary">{draft.start ? draft.end ? periodLabel(draft) : `${monthLabel(draft.start)} → выберите конец` : 'Выберите первый и последний месяц'}</p>}
        <div className="od-period-shortcuts">
          <button onClick={() => { const m = getCurrentMonth(); commit({ start: m, end: m }); }}>Этот месяц</button>
          <button onClick={() => { const m = shiftMonth(getCurrentMonth(), -1); commit({ start: m, end: m }); }}>Прошлый месяц</button>
          {allowRange && <button onClick={() => { const m = getCurrentMonth(); commit({ start: `${m.slice(0, 4)}-01`, end: m }); }}>С начала года</button>}
        </div>
      </div>
      {range && <footer className="od-popover-footer"><button className="od-text-btn" onClick={() => setOpen(false)}>Отмена</button><button className="od-primary-btn" disabled={!draft.start || !draft.end} onClick={() => commit(draft)}>Применить период</button></footer>}
    </DashboardPopover>}
  </div>;
}

const FIELDS = [{ key: 'branch_id', label: 'Филиалы', all: 'Все филиалы' }, { key: 'department_id', label: 'Отделы', all: 'Все отделы' }, { key: 'teacher_id', label: 'Преподаватели', all: 'Все преподаватели' }];
export function FiltersControl({ value, onChange, options, loading, error, onRetry, fields = FIELDS, title = 'Фильтры дашборда' }) {
  const anchor = useRef(null), list = useRef(null);
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(value), [category, setCategory] = useState('branch_id'), [query, setQuery] = useState('');
  const count = Object.values(value).filter(Boolean).length;
  const field = fields.find(f => f.key === category) || fields[0];
  const all = [{ value: '', label: field.all }, ...(options[category] || [])];
  const visible = all.filter(o => o.label.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
  const branch = options.branch_id?.find(o => o.value === value.branch_id)?.label;
  const show = key => { setDraft(value); setCategory(fields.some(f => f.key === key) ? key : fields[0].key); setQuery(''); setOpen(true); };
  return <div className="od-filter-control" ref={anchor}>
    <button className={`od-control od-branch-trigger ${value.branch_id ? 'is-filtered' : ''}`} onClick={() => show('branch_id')} aria-haspopup="dialog" aria-expanded={open}><IconBranches /><span>{branch || 'Все филиалы'}</span><IconChevronDown /></button>
    <button className={`od-control ${count ? 'is-filtered' : ''}`} onClick={() => show('department_id')} aria-haspopup="dialog" aria-expanded={open}><IconFilter /><span className="od-filter-label">Фильтры</span>{count > 0 && <span className="od-filter-count">{count}</span>}</button>
    {open && <DashboardPopover anchor={anchor} title={title} width={480} onClose={() => setOpen(false)}>
      <div className="od-filter-body">
        <div className="od-filter-categories">{fields.map(f => <button key={f.key} aria-pressed={category === f.key} onClick={() => { setCategory(f.key); setQuery(''); }}>{f.label}{draft[f.key] && <DashIcon name="check" />}</button>)}</div>
        <div className="od-filter-choices">
          <label className="od-search"><DashIcon name="search" /><input data-autofocus aria-label={`Поиск: ${field.label.toLowerCase()}`} placeholder="Найти…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); list.current?.querySelector('button')?.focus(); } }} /></label>
          <div className="od-options" ref={list} role="listbox" aria-label={field.label} onKeyDown={e => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || e.target.tagName !== 'BUTTON') return;
            e.preventDefault(); const buttons = Array.from(list.current.querySelectorAll('button')); const index = buttons.indexOf(e.target);
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length; buttons[next]?.focus();
          }}>
            {visible.map(option => <button key={option.value} role="option" aria-selected={(draft[category] || '') === option.value} onClick={() => setDraft(d => ({ ...d, [category]: option.value }))}><span>{option.label}</span>{(draft[category] || '') === option.value && <DashIcon name="check" />}</button>)}
            {loading && <p className="od-menu-message" role="status">Загружаем список…</p>}
            {!loading && !visible.length && <p className="od-menu-message">Ничего не найдено</p>}
          </div>
          {error && <div className="od-menu-message" role="alert">Не удалось загрузить фильтры. <button className="od-text-btn" onClick={onRetry}>Повторить</button></div>}
        </div>
      </div>
      <footer className="od-popover-footer"><button className="od-text-btn" onClick={() => setDraft({})}>Сбросить всё</button><button className="od-primary-btn" onClick={() => { onChange(draft); setOpen(false); }}>Показать результаты</button></footer>
    </DashboardPopover>}
  </div>;
}
