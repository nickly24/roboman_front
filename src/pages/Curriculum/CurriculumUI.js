import React, { useRef, useState } from 'react';
import CalIcon from '../Calendar/CalendarIcons';
import { DashboardPopover } from '../Dashboard/DashboardControls';
import Modal from '../../components/Modal/Modal';
import { errorText } from './curriculumData';

const paths = {
  book: <><path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z" /></>,
  file: <><path d="M14 3H5v18h14V8Z M14 3v5h5M8 12h8M8 16h6" /></>,
  layers: <><path d="m3 7 9-4 9 4-9 4ZM3 12l9 4 9-4M3 17l9 4 9-4" /></>,
  message: <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-5 3V6a2 2 0 0 1 2-2Z" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 16 5-5 5 5 3-3 5 5" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
  up: <path d="m7 14 5-5 5 5" />,
  external: <><path d="M14 3h7v7M21 3 10 14M10 3H3v18h18v-7" /></>,
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
};
export function Icon({ name, ...props }) { return paths[name] ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg> : <CalIcon name={name} {...props} />; }
export function ErrorNotice({ children, onRetry }) { return <div className="cp-error" role="alert"><span>{children}</span>{onRetry && <button type="button" className="od-control" onClick={onRetry}>Повторить</button>}</div>; }
export function Empty({ title, children, icon = 'book' }) { return <div className="cp-empty"><Icon name={icon} /><h3>{title}</h3>{children}</div>; }
export function Tabs({ label, items, value, onChange }) { return <div className="cp-tabs" role="tablist" aria-label={label}>{items.map((item, index) => <button type="button" role="tab" key={item.value} aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} onClick={() => onChange(item.value)} onKeyDown={e => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return; e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length; onChange(items[next].value); e.currentTarget.parentElement.children[next].focus(); }}>{item.icon && <Icon name={item.icon} />}{item.label}{item.count > 0 && <span>{item.count}</span>}</button>)}</div>; }
export function ActionMenu({ label, items, disabled }) {
  const anchor = useRef(null), [open, setOpen] = useState(false);
  return <><button type="button" ref={anchor} className="od-icon-btn cp-more" title={label} aria-label={label} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={() => setOpen(true)}><Icon name="more" /></button>{open && <DashboardPopover anchor={anchor} title={label} width={290} onClose={() => setOpen(false)}><div className="cp-action-menu">{items.map(item => <button type="button" key={item.label} disabled={item.disabled} title={item.hint} className={item.danger ? 'cp-danger-text' : ''} onClick={() => { setOpen(false); item.onClick(); }}><Icon name={item.icon} /><span>{item.label}</span></button>)}</div></DashboardPopover>}</>;
}
export function ConfirmDialog({ title, children, onConfirm, onClose, action = 'Удалить' }) {
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), busy = useRef(false);
  const run = async () => { if (busy.current) return; busy.current = true; setSaving(true); setError(''); try { await onConfirm(); onClose(); } catch (e) { setError(errorText(e)); } finally { busy.current = false; setSaving(false); } };
  return <Modal isOpen title={title} size="small" onClose={() => { if (!busy.current) onClose(); }}><div className="cp-confirm"><div>{children}</div>{error && <ErrorNotice>{error}</ErrorNotice>}<footer className="cp-form-footer"><button type="button" className="od-control" disabled={saving} onClick={onClose}>Отмена</button><button type="button" className="cp-danger-btn" disabled={saving} onClick={run}>{saving ? 'Подождите…' : action}</button></footer></div></Modal>;
}
