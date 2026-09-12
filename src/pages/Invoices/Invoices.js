import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import service from '../../services/branchPortalService';
import { Choice } from '../Calendar/CalendarFields';
import { PeriodControl } from '../Dashboard/DashboardControls';
import { currentPeriod, errorText, filterInvoices, invoiceStatuses, money, validPeriod } from './invoiceData';
import { AccountingNav, EmptyState, InvoiceList, LoadingState, Notice, PortalIcon, StatCard } from './InvoiceUI';
import InvoiceDetail from './InvoiceDetail';
import InvoiceEditor from './InvoiceEditor';
import '../Dashboard/OwnerDashboard.css';
import '../Calendar/Calendar.css';
import './Invoices.css';

export default function Invoices() {
  const [params, setParams] = useSearchParams();
  const month = validPeriod(params.get('month')) ? params.get('month') : currentPeriod();
  const allMonths = params.get('period') === 'all', branchId = params.get('branch_id') || '';
  const status = invoiceStatuses[params.get('status')] ? params.get('status') : '';
  const invoiceId = /^\d+$/.test(params.get('invoice') || '') ? params.get('invoice') : '';
  const [items, setItems] = useState([]), [branches, setBranches] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [branchError, setBranchError] = useState(''), [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState(''), [page, setPage] = useState(0), [notice, setNotice] = useState(''), [editing, setEditing] = useState(null);
  const updateParams = fields => { const next = new URLSearchParams(params); Object.entries(fields).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); setParams(next); };
  useEffect(() => {
    const abort = new AbortController(); setBranchError('');
    service.branches(abort.signal).then(data => { if (!abort.signal.aborted) setBranches(data.items || []); }).catch(e => { if (!abort.signal.aborted) setBranchError(errorText(e)); });
    return () => abort.abort();
  }, [refresh]);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError('');
    service.invoices(true, { ...(!allMonths ? { month } : {}), ...(branchId ? { branch_id: branchId } : {}) }, abort.signal).then(data => { if (!abort.signal.aborted) setItems(data.items || []); }).catch(e => { if (!abort.signal.aborted) setError(errorText(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [month, allMonths, branchId, refresh]);
  useEffect(() => { setPage(0); }, [month, allMonths, branchId, status, search]);
  const visible = filterInvoices(items, { search, status });
  const safePage = Math.min(page, Math.max(0, Math.ceil(visible.length / 20) - 1));
  const sum = statuses => items.filter(i => statuses.includes(i.status)).reduce((total, i) => total + Number(i.total_amount || 0), 0);
  const drafts = items.filter(i => i.status === 'draft').length, reported = items.filter(i => i.status === 'payment_reported').length;
  const closeInvoice = () => updateParams({ invoice: '' });
  const newInvoice = params.get('create') === '1';
  const startEdit = invoice => { setEditing(invoice); updateParams({ invoice: '', create: '' }); };
  const saved = invoice => { setEditing(null); updateParams({ create: '', invoice: String(invoice.id), month: invoice.month || month }); setNotice('Черновик сохранён. Проверьте счёт и выставите его в кабинет сада.'); setRefresh(n => n + 1); };
  return <Layout headerTitle="Бухгалтерия" className="layout-invoices"><div className="iv-page">
    <AccountingNav month={month} />
    <div className="iv-page-heading"><div><span className="iv-eyebrow">РАСЧЁТЫ С ПАРТНЁРАМИ</span><h1>Счета филиалам</h1><p>Отчёт о занятиях, выставление и контроль оплаты — в одном месте.</p></div><button className="od-primary-btn" onClick={() => updateParams({ create: '1', invoice: '' })}><PortalIcon name="plus" />Создать счёт</button></div>
    <div className="iv-toolbar"><PeriodControl value={{ start: month, end: month }} onChange={p => updateParams({ month: p.start, period: '' })} allowRange={false} /><button type="button" className={`od-control ${allMonths ? 'is-filtered' : ''}`} aria-pressed={allMonths} onClick={() => updateParams({ period: allMonths ? '' : 'all' })}>Все периоды</button><div className="iv-toolbar-spacer" /><Choice label="Филиал" value={branchId} options={branches.map(branch => ({ value: String(branch.id), label: branch.name }))} placeholder="Все филиалы" onChange={value => updateParams({ branch_id: value })} /><button type="button" className="od-icon-btn" aria-label="Обновить счета" disabled={loading} onClick={() => setRefresh(n => n + 1)}><PortalIcon name="repeat" /></button></div>
    {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}{branchError && <Notice tone="error">Не удалось загрузить филиалы: {branchError}<button type="button" className="od-text-btn" onClick={() => setRefresh(n => n + 1)}>Повторить</button></Notice>}
    {loading ? <LoadingState label="Загружаем счета филиалам…" /> : error ? <Notice tone="error">{error}<button type="button" className="od-control" onClick={() => setRefresh(n => n + 1)}>Повторить</button></Notice> : <>
      <div className="iv-stats"><StatCard label="Ожидаем оплату" value={money(sum(['issued', 'payment_reported']))} caption="Выставленные счета, включая проверку" icon="wallet" accent /><StatCard label="На проверке" value={money(sum(['payment_reported']))} caption={`Счетов на проверке: ${reported}`} icon="clock" /><StatCard label="Оплачено" value={money(sum(['paid']))} caption="Подтверждённые поступления" icon="check" /><StatCard label="Черновики" value={drafts} caption="Готовятся к выставлению" icon="edit" /></div>
      {reported > 0 && <button type="button" className="iv-attention-banner" onClick={() => updateParams({ status: 'payment_reported' })}><span className="iv-attention-icon"><PortalIcon name="clock" /></span><span><strong>Есть оплаты для проверки</strong><small>Подтвердите поступления, о которых сообщили сады</small></span><span>Проверить<PortalIcon name="right" /></span></button>}
      <section className="iv-panel" aria-label="Журнал счетов"><div className="iv-journal-toolbar"><div className="iv-status-tabs" aria-label="Статус счёта"><button type="button" aria-pressed={!status} onClick={() => updateParams({ status: '' })}>Все<span>{items.length}</span></button>{Object.entries(invoiceStatuses).map(([key, value]) => <button type="button" key={key} aria-pressed={status === key} onClick={() => updateParams({ status: key })}>{value.label}<span>{items.filter(i => i.status === key).length}</span></button>)}</div><label className="iv-search"><PortalIcon name="search" /><input aria-label="Поиск счетов" value={search} onChange={e => setSearch(e.target.value)} placeholder="Номер, филиал или сумма" /></label></div>
        {visible.length ? <InvoiceList items={visible.slice(safePage * 20, safePage * 20 + 20)} admin onOpen={id => updateParams({ invoice: String(id) })} /> : <EmptyState title={items.length ? 'Счета не найдены' : 'Пока нет счетов'}>{items.length ? 'Измените поиск или выберите другой статус.' : 'Создайте первый счёт и подтяните в него проведённые занятия за месяц.'}</EmptyState>}
        {!!visible.length && <footer className="iv-list-footer"><span>{safePage * 20 + 1}–{Math.min((safePage + 1) * 20, visible.length)} из {visible.length}</span><div><button type="button" className="od-icon-btn" aria-label="Предыдущая страница счетов" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><PortalIcon name="left" /></button><button type="button" className="od-icon-btn" aria-label="Следующая страница счетов" disabled={(safePage + 1) * 20 >= visible.length} onClick={() => setPage(safePage + 1)}><PortalIcon name="right" /></button></div></footer>}
      </section><p className="iv-bottom-note"><PortalIcon name="info" />Выставленные счета публикуются в кабинете сада. Подтверждение оплаты отмечает статус счёта; денежные операции ведутся в листах.</p>
    </>}
    {invoiceId && <InvoiceDetail key={invoiceId} id={invoiceId} admin onClose={closeInvoice} onEdit={startEdit} onChanged={() => { setRefresh(n => n + 1); setNotice('Статус счёта обновлён.'); }} />}
    {(newInvoice || editing) && <InvoiceEditor invoice={editing} branches={branches} month={month} branchId={branchId} onClose={() => { setEditing(null); updateParams({ create: '' }); }} onSaved={saved} />}
  </div></Layout>;
}
