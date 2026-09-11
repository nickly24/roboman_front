import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import CalIcon from './CalendarIcons';
import { addDays, dateObject, dayText, monday, moscowToday, pad } from './calendarData';

function useDismiss(open, onClose, ref) {
  useEffect(() => {
    if (!open) return;
    const outside = e => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onClose, ref]);
}
function useMenuPosition(open, ref, menuWidth) {
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const bounds = ref.current?.querySelector('button')?.getBoundingClientRect();
      const menu = ref.current?.querySelector('[data-field-menu]');
      if (!bounds || !menu) return;
      const width = Math.min(menuWidth || bounds.width, window.innerWidth - 24);
      setPosition({ position: 'fixed', width, left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)), top: Math.max(12, Math.min(bounds.bottom + 6, window.innerHeight - menu.offsetHeight - 12)) });
    };
    place();
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true); };
  }, [open, ref, menuWidth]);
  return position || { visibility: 'hidden' };
}

export function Choice({ label, value, options, onChange, placeholder = 'Не назначен', emptyLabel = placeholder, required = false, disabled = false }) {
  const id = useId(), ref = useRef(null), input = useRef(null);
  const [open, setOpen] = useState(false), [search, setSearch] = useState('');
  useDismiss(open, () => setOpen(false), ref);
  const position = useMenuPosition(open, ref);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  const selected = options.find(o => String(o.value) === String(value));
  const visible = [...(!required ? [{ value: '', label: emptyLabel }] : []), ...options].filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  return <div className="cal-field cal-choice" ref={ref} onKeyDown={e => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); ref.current.querySelector('button').focus(); } }}>
    <label id={id}>{label}{required && <span> *</span>}</label>
    <button type="button" className="cal-field-trigger" aria-labelledby={id} aria-expanded={open} aria-haspopup="listbox" disabled={disabled} onClick={() => { setSearch(''); setOpen(!open); }}><span className={!selected ? 'cal-muted' : ''}>{selected?.label || placeholder}</span><CalIcon name="down" /></button>
    {open && <div className="cal-choice-menu" data-field-menu style={position}><label className="cal-choice-search"><CalIcon name="search" /><input ref={input} value={search} placeholder="Найти…" aria-label={`Найти: ${label}`} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); ref.current.querySelector('[role="option"]')?.focus(); } }} /></label><div role="listbox" aria-labelledby={id} onKeyDown={e => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault(); const els = Array.from(e.currentTarget.querySelectorAll('button')); const i = els.indexOf(document.activeElement); const next = e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length; els[next]?.focus();
    }}>{visible.map(o => <button type="button" role="option" aria-selected={String(o.value) === String(value)} key={o.value} onClick={() => { onChange(String(o.value)); setOpen(false); ref.current.querySelector('button').focus(); }}><span>{o.label}</span>{String(o.value) === String(value) && <CalIcon name="check" />}</button>)}{!visible.length && <p>Ничего не найдено</p>}</div></div>}
  </div>;
}

export function DateField({ label, value, onChange, weekOnly = false, min }) {
  const id = useId(), ref = useRef(null);
  const [open, setOpen] = useState(false), [month, setMonth] = useState((value || moscowToday()).slice(0, 7));
  useDismiss(open, () => setOpen(false), ref);
  const position = useMenuPosition(open, ref, 286);
  const first = monday(`${month}-01`);
  const step = n => { const d = dateObject(`${month}-01`); d.setMonth(d.getMonth() + n); setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); };
  return <div className="cal-field cal-date-field" ref={ref} onKeyDown={e => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); ref.current.querySelector('button').focus(); } }}>
    <label id={id}>{label}</label><button type="button" className="cal-field-trigger" aria-labelledby={id} aria-expanded={open} aria-haspopup="dialog" onClick={() => { setMonth((value || moscowToday()).slice(0, 7)); setOpen(!open); }}><CalIcon name="calendar" /><span>{value ? `${weekOnly ? 'С ' : ''}${dayText(value, { year: 'numeric' })}` : 'Выбрать дату'}</span><CalIcon name="down" /></button>
    {open && <div className="cal-date-menu" data-field-menu style={position} role="dialog" aria-label={label}><div className="cal-date-month"><button type="button" className="od-icon-btn" aria-label="Предыдущий месяц" onClick={() => step(-1)}><CalIcon name="left" /></button><strong>{dateObject(`${month}-01`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</strong><button type="button" className="od-icon-btn" aria-label="Следующий месяц" onClick={() => step(1)}><CalIcon name="right" /></button></div><div className="cal-date-grid">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <small key={d}>{d}</small>)}{Array.from({ length: 42 }, (_, i) => {
      const key = addDays(first, i), pick = weekOnly ? monday(key) : key, selected = weekOnly ? monday(key) === value : key === value;
      return <button type="button" key={key} aria-label={dayText(key, { year: 'numeric' })} aria-pressed={selected} disabled={min && pick < min} className={`${key.slice(0, 7) !== month ? 'cal-other-month' : ''} ${selected ? 'selected' : ''}`} onClick={() => { onChange(pick); setOpen(false); ref.current.querySelector('button').focus(); }}>{dateObject(key).getDate()}</button>;
    })}</div>{weekOnly && <p>Изменения начнутся с выбранного понедельника</p>}</div>}
  </div>;
}
