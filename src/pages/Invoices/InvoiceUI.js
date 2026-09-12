import React from 'react';
import { NavLink } from 'react-router-dom';
import CalendarIcon from '../Calendar/CalendarIcons';
import { invoiceStatuses, invoiceNumber, localDate, money, overdue, periodName } from './invoiceData';

const paths = {
  invoice: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  chart: <><path d="M4 3v17h17M8 15l4-5 4 2 5-7" /></>,
  wallet: <><path d="M20 8V5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7M20 13h-6v4h6" /></>,
  building: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-6h4v6" /></>,
  cube: <><path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 10 9-5M12 13 3 8m9 5v8M7.5 5.5l9 5" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></>,
  send: <><path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  spark: <><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3Z" /></>,
};
export function PortalIcon({ name, ...props }) {
  return paths[name] ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg> : <CalendarIcon name={name} {...props} />;
}
export function AccountingNav({ month }) {
  return <nav className="iv-section-nav" aria-label="Разделы бухгалтерии"><NavLink end to={`/accounting${month ? `?month=${month}` : ''}`}><PortalIcon name="wallet" />Денежные листы</NavLink><NavLink to={`/accounting/invoices${month ? `?month=${month}` : ''}`}><PortalIcon name="invoice" />Счета филиалам</NavLink></nav>;
}
export function Notice({ children, tone = 'success', onClose }) {
  return <div className={`iv-notice iv-notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><PortalIcon name={tone === 'success' ? 'check' : 'info'} /><span>{children}</span>{onClose && <button type="button" className="od-icon-btn" onClick={onClose} aria-label="Скрыть сообщение"><PortalIcon name="close" /></button>}</div>;
}
export function EmptyState({ icon = 'invoice', title, children, action }) {
  return <div className="iv-empty"><span className="iv-empty-icon"><PortalIcon name={icon} /></span><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>;
}
export function LoadingState({ label = 'Загружаем данные…' }) {
  return <div className="iv-loading" role="status" aria-label={label}><span className="iv-skeleton iv-skeleton-title" /><div className="iv-skeleton-grid">{[1, 2, 3, 4].map(n => <span className="iv-skeleton" key={n} />)}</div><span className="iv-skeleton iv-skeleton-block" /><span className="iv-sr-only">{label}</span></div>;
}
export function StatCard({ label, value, caption, icon, accent = false, negative = false }) {
  return <div className={`iv-stat ${accent ? 'iv-stat-accent' : ''}`}><div><span>{label}</span><PortalIcon name={icon || 'chart'} /></div><strong className={negative ? 'iv-negative' : ''}>{value}</strong><small>{caption}</small></div>;
}
export function InvoiceStatus({ invoice }) {
  const status = invoiceStatuses[invoice.status] || invoiceStatuses.draft;
  return <span className={`iv-status iv-status-${status.tone}`}><PortalIcon name={status.icon} />{status.label}</span>;
}
export function InvoiceList({ items, admin = false, onOpen }) {
  return <div className={`iv-invoice-list ${admin ? 'iv-invoice-list-admin' : ''}`}>
    <div className="iv-invoice-tablehead" aria-hidden="true"><span>Счёт / период</span>{admin && <span>Филиал</span>}<span>Статус</span><span>Оплатить до</span><span>Сумма</span><span /></div>
    {items.map(invoice => <button type="button" className="iv-invoice-row" key={invoice.id} onClick={() => onOpen(invoice.id)} aria-label={`${invoiceNumber(invoice)}, ${admin ? `${invoice.branch_name}, ` : ''}${money(invoice.total_amount)}, ${invoiceStatuses[invoice.status]?.label || invoice.status}`}>
      <span className="iv-invoice-name"><span className="iv-file-icon"><PortalIcon name="invoice" /></span><span><strong>{invoiceNumber(invoice)}</strong><small>{periodName(invoice.month)}</small></span></span>
      {admin && <span className="iv-invoice-branch">{invoice.branch_name}</span>}
      <span><InvoiceStatus invoice={invoice} /></span><span className={`iv-invoice-due ${overdue(invoice) ? 'iv-negative' : ''}`}>{localDate(invoice.due_date)}{overdue(invoice) && <small>Срок прошёл</small>}</span>
      <strong className="iv-invoice-amount">{money(invoice.total_amount)}</strong><PortalIcon name="right" />
    </button>)}
  </div>;
}
