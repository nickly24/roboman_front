import React, { useMemo, useRef, useState } from 'react';
import { Choice } from '../Calendar/CalendarFields';
import { DashboardPopover, Hint } from '../Dashboard/DashboardControls';
import apiClient from '../../services/api';
import { API_ENDPOINTS as API } from '../../config/api';
import OperationModal from './OperationModal';
import OperationDetailModal from './OperationDetailModal';
import Icon from './AccountingIcons';
import { amountSign, filterLedger, ledger, money, operationTypes, periodName, sheetPeriod, unpack } from './accountingData';

export function SheetSummary({ summary }) {
  return <div className="ac-summary">{[
    ['revenue', 'Поступления', 'income', 'Оплаты, внесённые в денежные листы'],
    ['costs', 'Налог и рефералка', 'sheet', summary ? `Налог ${money(summary.costs_tax)} · рефералка ${money(summary.costs_referral)}` : 'Удержания с поступлений'],
    ['expenses', 'Расходы', 'expense', summary ? `Зарплата ${money(summary.expenses_salaries)} · прочие ${money(summary.expenses_other)}` : 'Зарплата и прочие расходы'],
    ['profit', 'Прибыль', 'wallet', 'Поступления за вычетом налога, рефералки, зарплаты и прочих расходов. Переводы между владельцами не меняют прибыль.'],
  ].map(([key, title, icon, hint]) => <div className={`ac-stat ac-stat-${key}`} key={key}><div><span>{title}</span><Hint label={`О показателе «${title}»`}>{hint}</Hint></div><strong className={Number(summary?.[key]) < 0 ? 'ac-negative' : ''}>{summary ? money(summary[key]) : '—'}</strong><Icon name={icon} /></div>)}</div>;
}
const PAGE_SIZE = 20;
export default function AccountingSheetView({ sheetData, onReload, refreshing, sheetOptions, onSwitch }) {
  const { sheet, summary, owners = [] } = sheetData;
  const [type, setType] = useState('all'), [owner, setOwner] = useState(''), [search, setSearch] = useState(''), [sort, setSort] = useState('newest'), [page, setPage] = useState(1);
  const [adding, setAdding] = useState(null), [menu, setMenu] = useState(false), [selected, setSelected] = useState(null), [notice, setNotice] = useState('');
  const anchor = useRef(null), journal = useRef(null);
  const rows = useMemo(() => ledger(sheetData), [sheetData]);
  const filtered = useMemo(() => filterLedger(rows, { type, owner, search, sort }), [rows, type, owner, search, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), safePage = Math.min(page, pages);
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const filter = (set, value) => { set(value); setPage(1); };
  const turnPage = value => { setPage(value); journal.current?.scrollIntoView?.({ block: 'start' }); };
  const add = async (payload, kind) => {
    const endpoint = { income: API.ACCOUNTING_INCOMES, salary: API.ACCOUNTING_SALARIES, expense: API.ACCOUNTING_EXPENSES, transfer: API.ACCOUNTING_TRANSFERS }[kind];
    unpack(await apiClient.post(endpoint(sheet.id), payload));
    setAdding(null); setNotice('Операция добавлена'); onReload();
  };
  const remove = async op => {
    const endpoint = { income: API.ACCOUNTING_INCOME, salary: API.ACCOUNTING_SALARY, expense: API.ACCOUNTING_EXPENSE, transfer: API.ACCOUNTING_TRANSFER }[op.type];
    unpack(await apiClient.delete(endpoint(op.id)));
    setSelected(null); setNotice('Операция удалена'); onReload();
  };
  const reset = () => { setType('all'); setOwner(''); setSearch(''); setPage(1); };
  return <div className="ac-sheet-view">
    <div className="ac-sheet-heading"><div><h2>{sheet.department_name}</h2><p>{periodName(sheetPeriod(sheet))} <span>· {rows.length} операций{refreshing ? ' · обновляем…' : ''}</span></p></div><div className="ac-sheet-actions">{sheetOptions.length > 1 && <Choice label="Перейти в лист" required value={String(sheet.id)} options={sheetOptions} onChange={onSwitch} />}<div ref={anchor}><button className="od-primary-btn" aria-expanded={menu} aria-haspopup="dialog" onClick={() => setMenu(true)}><Icon name="plus" />Добавить операцию<Icon name="down" /></button></div></div></div>
    {menu && <DashboardPopover anchor={anchor} title="Новая операция" onClose={() => setMenu(false)} width={350}><div className="ac-action-menu">{Object.entries(operationTypes).map(([key, meta]) => <button key={key} onClick={() => { setMenu(false); setAdding(key); }}><span className={`ac-op-icon ac-type-${key}`}><Icon name={meta.icon} /></span><span><strong>{meta.single}</strong><small>{meta.description}</small></span><Icon name="right" /></button>)}</div></DashboardPopover>}
    {notice && <div className="ac-notice" role="status"><Icon name="check" /><span>{notice}</span><button className="od-icon-btn" aria-label="Закрыть сообщение" onClick={() => setNotice('')}><Icon name="close" /></button></div>}
    <SheetSummary summary={summary} />
    <section className="ac-balances"><div className="ac-section-heading"><h3>Остатки у владельцев</h3><Hint label="Как считаются остатки">Поступления после удержаний минус выплаты и расходы, с учётом переводов. Выберите владельца, чтобы увидеть его операции.</Hint>{Number(summary?.discrepancy) > 0 && <span className="ac-discrepancy">К выравниванию: {money(summary.discrepancy)}</span>}</div><div className="ac-owner-grid">{(summary?.owner_balances || []).map(b => <button className={`ac-owner-card ${String(b.owner_id) === owner ? 'selected' : ''}`} aria-pressed={String(b.owner_id) === owner} key={b.owner_id} onClick={() => filter(setOwner, owner === String(b.owner_id) ? '' : String(b.owner_id))}><span className="ac-avatar">{b.owner_name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('')}</span><span><strong>{b.owner_name}</strong><small>Получено {money(b.income_net)} · выплачено {money(Number(b.salary_paid) + Number(b.expenses_paid))}</small></span><b className={Number(b.balance) < 0 ? 'ac-negative' : ''}>{money(b.balance)}</b></button>)}</div></section>
    <section className="ac-journal" aria-label="Журнал операций" ref={journal}><div className="ac-journal-heading"><h3>Операции</h3><span>{filtered.length} из {rows.length}</span><label className="ac-search"><Icon name="search" /><input aria-label="Поиск операций" placeholder="Филиал, преподаватель, описание…" value={search} onChange={e => filter(setSearch, e.target.value)} /></label></div>
      <div className="ac-journal-filters"><div className="ac-type-tabs" aria-label="Тип операции">{[['all', 'Все'], ...Object.entries(operationTypes).map(([key, meta]) => [key, meta.label])].map(([key, label]) => <button key={key} aria-pressed={type === key} onClick={() => filter(setType, key)}>{label}<span>{key === 'all' ? rows.length : rows.filter(r => r.type === key).length}</span></button>)}</div><div className="ac-secondary-filters"><Choice label="Владелец" placeholder="Все владельцы" value={owner} options={owners.map(o => ({ value: String(o.id), label: o.full_name }))} onChange={value => filter(setOwner, value)} /><Choice label="Порядок" required value={sort} options={[{ value: 'newest', label: 'Сначала новые' }, { value: 'oldest', label: 'Сначала старые' }, { value: 'amount', label: 'По сумме' }]} onChange={value => filter(setSort, value)} />{(type !== 'all' || owner || search) && <button className="od-text-btn" onClick={reset}><Icon name="close" />Сбросить</button>}</div></div>
      <div className="ac-ledger-head" aria-hidden="true"><span>Операция</span><span>Владелец</span><span>Дата записи</span><span>Сумма</span><span /></div>
      {!shown.length ? <div className="ac-empty ac-empty-small"><Icon name={rows.length ? 'search' : 'sheet'} /><h3>{rows.length ? 'Ничего не найдено' : 'В листе пока нет операций'}</h3><p>{rows.length ? 'Измените поиск или сбросьте фильтры.' : 'Добавьте первое поступление, выплату или расход.'}</p><button className="od-control" onClick={rows.length ? reset : () => setMenu(true)}>{rows.length ? 'Сбросить фильтры' : 'Добавить операцию'}</button></div> : <div className="ac-ledger">{shown.map(op => { const sign = amountSign(op, owner); return <button key={op.key} className="ac-operation" onClick={() => setSelected(op)} aria-label={`${operationTypes[op.type].single}: ${op.title}, ${money(op.amount)}`}><span className="ac-operation-name"><span className={`ac-op-icon ac-type-${op.type}`}><Icon name={operationTypes[op.type].icon} /></span><span><strong>{op.title || operationTypes[op.type].single}</strong><small>{op.subtitle}</small></span></span><span className="ac-operation-party">{op.party}</span><time>{op.created_at ? new Date(op.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—'}</time><strong className={`ac-operation-amount ${sign === '+' ? 'ac-positive' : sign === '−' ? 'ac-negative' : 'ac-neutral'}`}>{sign}{money(op.amount)}</strong><Icon name="right" /></button>; })}</div>}
      <footer className="ac-ledger-footer"><span>{filtered.length ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} из ${filtered.length}` : '0 операций'}</span><div><button className="od-icon-btn" aria-label="Предыдущая страница операций" disabled={safePage <= 1} onClick={() => turnPage(safePage - 1)}><Icon name="left" /></button><span>{safePage} / {pages}</span><button className="od-icon-btn" aria-label="Следующая страница операций" disabled={safePage >= pages} onClick={() => turnPage(safePage + 1)}><Icon name="right" /></button></div></footer>
    </section>
    {adding && <OperationModal type={adding} sheetData={sheetData} onClose={() => setAdding(null)} onSave={payload => add(payload, adding)} />}
    {selected && <OperationDetailModal operation={selected} onClose={() => setSelected(null)} onDelete={remove} />}
  </div>;
}
