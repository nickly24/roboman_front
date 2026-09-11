import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../services/api';
import { API_ENDPOINTS as API } from '../../config/api';
import Layout from '../../components/Layout/Layout';
import { Choice } from '../Calendar/CalendarFields';
import { PeriodControl } from '../Dashboard/DashboardControls';
import CreateSheetModal from './CreateSheetModal';
import AccountingSheetView, { SheetSummary } from './AccountingSheetView';
import Icon from './AccountingIcons';
import { currentPeriod, errorText, money, operationCount, periodName, sheetPeriod, shiftMonth, unpack, validPeriod } from './accountingData';
import '../Dashboard/OwnerDashboard.css';
import '../Calendar/Calendar.css';
import './Accounting.css';

export default function Accounting() {
  const [params, setParams] = useSearchParams();
  const current = currentPeriod(), previous = shiftMonth(current, -1);
  const period = validPeriod(params.get('month')) ? params.get('month') : current;
  const sheetId = /^\d+$/.test(params.get('sheet') || '') ? params.get('sheet') : '';
  const [sheets, setSheets] = useState([]), [records, setRecords] = useState({}), [recordErrors, setRecordErrors] = useState({});
  const [departments, setDepartments] = useState([]), [department, setDepartment] = useState(''), [departmentError, setDepartmentError] = useState('');
  const [loading, setLoading] = useState(true), [listError, setListError] = useState(''), [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState(null), [detailLoading, setDetailLoading] = useState(false), [detailError, setDetailError] = useState(''), [detailRefresh, setDetailRefresh] = useState(0);
  const [creating, setCreating] = useState(false);
  const goMonth = month => setParams({ month });
  const openSheet = id => setParams({ month: period, sheet: String(id) });
  useEffect(() => {
    const abort = new AbortController(); setDepartmentError('');
    apiClient.get(API.DEPARTMENTS, { signal: abort.signal }).then(unpack).then(data => { if (!abort.signal.aborted) setDepartments(data.items || (Array.isArray(data) ? data : [])); }).catch(e => { if (!abort.signal.aborted) setDepartmentError(errorText(e)); });
    return () => abort.abort();
  }, [refresh]);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setListError(''); setSheets([]); setRecords({}); setRecordErrors({});
    (async () => {
      try {
        const data = unpack(await apiClient.get(`${API.ACCOUNTING_SHEETS}?year=${period.slice(0, 4)}&month=${Number(period.slice(5))}`, { signal: abort.signal }));
        if (abort.signal.aborted) return;
        const items = data.items || []; setSheets(items); setLoading(false);
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(3, items.length) }, async () => {
          while (next < items.length && !abort.signal.aborted) {
            const item = items[next++];
            try {
              const record = unpack(await apiClient.get(API.ACCOUNTING_SHEET(item.id), { signal: abort.signal }));
              if (!abort.signal.aborted) { setRecords(old => ({ ...old, [item.id]: record })); }
            } catch (e) { if (!abort.signal.aborted) setRecordErrors(old => ({ ...old, [item.id]: errorText(e) })); }
          }
        }));
      } catch (e) { if (!abort.signal.aborted) { setListError(errorText(e)); setLoading(false); } }
    })();
    return () => abort.abort();
  }, [period, refresh]);
  useEffect(() => {
    if (!sheetId) { setDetail(null); setDetailError(''); return; }
    const abort = new AbortController(); setDetailLoading(true); setDetailError(''); setDetail(old => String(old?.sheet.id) === sheetId ? old : null);
    apiClient.get(API.ACCOUNTING_SHEET(sheetId), { signal: abort.signal }).then(unpack).then(data => {
      if (abort.signal.aborted) return;
      setDetail(data); setRecords(old => ({ ...old, [sheetId]: data }));
      if (sheetPeriod(data.sheet) !== period) setParams({ month: sheetPeriod(data.sheet), sheet: sheetId }, { replace: true });
    }).catch(e => { if (!abort.signal.aborted) setDetailError(errorText(e)); }).finally(() => { if (!abort.signal.aborted) setDetailLoading(false); });
    return () => abort.abort();
  }, [sheetId, detailRefresh, period, setParams]);
  const visible = sheets.filter(s => !department || String(s.department_id) === department);
  const complete = !loading && !listError && visible.length > 0 && visible.every(s => records[s.id]);
  const summary = complete ? visible.reduce((sum, s) => { for (const key of ['revenue', 'costs', 'expenses', 'profit', 'costs_tax', 'costs_referral', 'expenses_salaries', 'expenses_other']) sum[key] = (sum[key] || 0) + Number(records[s.id].summary?.[key] || 0); return sum; }, {}) : null;
  const tabs = [current, previous, ...(![current, previous].includes(period) ? [period] : [])];
  const create = async payload => {
    const data = unpack(await apiClient.post(API.ACCOUNTING_SHEETS, payload));
    setCreating(false); setRefresh(n => n + 1); setParams({ month: sheetPeriod(payload), sheet: String(data.id) });
  };
  return <Layout headerTitle="Бухгалтерия" className="layout-accounting"><div className="accounting-page">
    <div className="ac-period-bar"><div className="ac-month-tabs" role="tablist" aria-label="Месяц бухгалтерии">{tabs.map(m => <button role="tab" aria-selected={m === period} key={m} onClick={() => goMonth(m)}><span>{periodName(m)}</span><small>{m === current ? 'Текущий месяц' : m === previous ? 'Предыдущий месяц' : 'Выбранный период'}</small></button>)}</div><PeriodControl value={{ start: period, end: period }} onChange={p => goMonth(p.start)} allowRange={false} showArrows={false} title="Выбрать месяц бухгалтерии" triggerLabel="Другой месяц" /></div>
    {sheetId ? <>
      <div className="ac-sheet-nav"><button className="od-text-btn" onClick={() => setParams({ month: period })}><Icon name="left" />Листы месяца</button><span>/</span><strong>{detail?.sheet.department_name || 'Денежный лист'}</strong><button className="od-icon-btn" aria-label="Обновить лист" disabled={detailLoading} onClick={() => setDetailRefresh(n => n + 1)}><Icon name="repeat" /></button></div>
      {detailError && <div className="ac-error" role="alert"><span>{detailError}</span><button className="od-control" onClick={() => setDetailRefresh(n => n + 1)}>Повторить</button></div>}
      {detail ? <AccountingSheetView key={detail.sheet.id} sheetData={detail} refreshing={detailLoading} onReload={() => setDetailRefresh(n => n + 1)} sheetOptions={sheets.map(s => ({ value: String(s.id), label: s.department_name }))} onSwitch={openSheet} /> : detailLoading && <div className="ac-loading" role="status">Загружаем лист…</div>}
    </> : <>
      <div className="ac-list-heading"><div><h2>Денежные листы</h2><p>{loading ? 'Загружаем…' : `${visible.length} ${visible.length % 100 >= 11 && visible.length % 100 <= 14 ? 'листов' : visible.length % 10 === 1 ? 'лист' : visible.length % 10 >= 2 && visible.length % 10 <= 4 ? 'листа' : 'листов'} за ${periodName(period).toLowerCase()}`}</p></div><div className="ac-list-actions"><Choice label="Отдел" value={department} onChange={setDepartment} placeholder="Все отделы" options={departments.map(d => ({ value: String(d.id), label: d.name }))} /><button className="od-icon-btn" aria-label="Обновить листы" disabled={loading} onClick={() => setRefresh(n => n + 1)}><Icon name="repeat" /></button><button className="od-primary-btn" onClick={() => setCreating(true)}><Icon name="plus" />Создать лист</button></div></div>
      {departmentError && <div className="ac-error" role="alert"><span>Не удалось загрузить отделы: {departmentError}</span><button className="od-control" onClick={() => setRefresh(n => n + 1)}>Повторить</button></div>}
      {listError ? <div className="ac-error" role="alert"><span>{listError}</span><button className="od-control" onClick={() => setRefresh(n => n + 1)}>Повторить</button></div> : loading ? <div className="ac-loading" role="status">Загружаем денежные листы…</div> : !visible.length ? <div className="ac-empty"><span className="ac-empty-icon"><Icon name="sheet" /></span><h3>За этот месяц пока нет листов</h3><p>{department ? 'В выбранном отделе ещё не создан денежный лист.' : 'Создайте лист для отдела, чтобы записывать поступления и выплаты.'}</p><div><button className="od-primary-btn" onClick={() => setCreating(true)}><Icon name="plus" />Создать лист</button>{period === current && <button className="od-control" onClick={() => goMonth(previous)}>Посмотреть предыдущий месяц</button>}</div></div> : <>
        <SheetSummary summary={summary} />
        <div className="ac-sheet-grid">{visible.map((s, index) => { const data = records[s.id]; return <button key={s.id} className="ac-sheet-card" onClick={() => openSheet(s.id)}><div className="ac-card-heading"><span className={`ac-file-icon ac-file-${index % 3}`}><Icon name="sheet" /></span><div><h3>{s.department_name}</h3><span>{periodName(sheetPeriod(s))}</span></div><Icon name="right" /></div><div className="ac-card-profit"><span>Прибыль</span><strong className={Number(data?.summary.profit) < 0 ? 'ac-negative' : ''}>{data ? money(data.summary.profit) : '—'}</strong></div><div className="ac-card-totals"><span>Поступления<strong>{data ? money(data.summary.revenue) : '—'}</strong></span><span>Расходы<strong>{data ? money(data.summary.expenses) : '—'}</strong></span></div><footer><span>{data ? `${operationCount(data)} операций · ${data.owners.length} ${data.owners.length === 1 ? 'владелец' : data.owners.length < 5 ? 'владельца' : 'владельцев'}` : recordErrors[s.id] ? 'Итоги недоступны · открыть и повторить' : 'Загружаем итоги…'}</span><b>Открыть лист <Icon name="right" /></b></footer></button>; })}</div>
      </>}
    </>}
    {creating && <CreateSheetModal isOpen onClose={() => setCreating(false)} onSuccess={create} departments={departments} initialPeriod={period} initialDepartment={department} />}
  </div></Layout>;
}
