import React, { useEffect, useRef, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import service from '../../services/branchPortalService';
import { Choice, DateField } from '../Calendar/CalendarFields';
import { PeriodControl } from '../Dashboard/DashboardControls';
import { errorText, lineAmount, money, periodName, sumLines } from './invoiceData';
import { Notice, PortalIcon } from './InvoiceUI';

const blankItem = () => ({ description: '', quantity: 1, unit_price: '', lesson_id: null, lesson_date: null, teacher_name: '' });
export default function InvoiceEditor({ invoice, branches, month: initialMonth, branchId: initialBranch, onClose, onSaved }) {
  const [branchId, setBranchId] = useState(String(invoice?.branch_id || initialBranch || '')), [month, setMonth] = useState(invoice?.month || initialMonth);
  const selected = branches.find(branch => String(branch.id) === branchId);
  const [title, setTitle] = useState(invoice?.title || 'Занятия по робототехнике'), [dueDate, setDueDate] = useState(invoice?.due_date?.slice(0, 10) || '');
  const [items, setItems] = useState(invoice?.items?.map(item => ({ ...item })) || []), [note, setNote] = useState(invoice?.note || '');
  const [seller, setSeller] = useState(invoice?.seller_details || ''), [payment, setPayment] = useState(invoice?.payment_details || ''), [buyer, setBuyer] = useState(() => invoice?.buyer_details || (!invoice && selected ? [selected.name, selected.address].filter(Boolean).join('\n') : ''));
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [pulling, setPulling] = useState(false), [replaceReport, setReplaceReport] = useState(false), [contextChange, setContextChange] = useState(null);
  const changeVersion = useRef(0), pullRequest = useRef(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const formSnapshot = JSON.stringify({ branchId, month, title, dueDate, items, note, seller, payment, buyer });
  const initialSnapshot = useRef(formSnapshot);
  const closeEditor = () => { if (busy) return; if (initialSnapshot.current !== formSnapshot) setDiscardOpen(true); else onClose(); };
  useEffect(() => () => pullRequest.current?.abort(), []);
  useEffect(() => { if (!invoice && selected) setBuyer([selected.name, selected.address].filter(Boolean).join('\n')); }, [selected, invoice]);
  const changeLine = (index, key, value) => { changeVersion.current++; setItems(old => old.map((item, i) => i === index ? { ...item, [key]: value } : item)); };
  const changeContext = (key, value) => {
    if (items.length) { setContextChange({ key, value }); return; }
    changeVersion.current++; if (key === 'month') setMonth(value); else setBranchId(value);
  };
  const applyContext = () => {
    changeVersion.current++; setItems([]); setReplaceReport(false); setNotice('');
    if (contextChange.key === 'month') setMonth(contextChange.value); else setBranchId(contextChange.value);
    setContextChange(null);
  };
  const pullReport = async () => {
    setReplaceReport(false); setPulling(true); setError(''); setNotice('');
    pullRequest.current?.abort(); const abort = new AbortController(); pullRequest.current = abort;
    const version = changeVersion.current;
    try {
      const report = await service.report(Number(branchId), month, abort.signal);
      if (abort.signal.aborted) return;
      if (version !== changeVersion.current) { setNotice('Вы изменили строки во время загрузки. Нажмите «Подтянуть из отчёта» ещё раз, чтобы применить расчёт.'); return; }
      setItems((report.items || []).map(item => ({ ...item })));
      if (report.seller_details) setSeller(current => current || report.seller_details);
      if (report.payment_details) setPayment(current => current || report.payment_details);
      setNotice(report.items?.length ? `Добавлено строк: ${report.items.length}. Проверьте детализацию и реквизиты перед выставлением.` : 'За этот месяц проведённых занятий нет. При необходимости добавьте строку вручную.');
    } catch (e) { if (!abort.signal.aborted) setError(errorText(e)); } finally { if (!abort.signal.aborted) setPulling(false); }
  };
  const save = async e => {
    e.preventDefault(); if (busy || pulling) return;
    if (!branchId) { setError('Выберите филиал.'); return; }
    if (!items.length) { setError('Подтяните занятия из отчёта или добавьте хотя бы одну строку.'); return; }
    if (items.some(item => !item.description.trim() || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0 || item.unit_price === '')) { setError('Заполните название, количество больше нуля и цену в каждой строке.'); return; }
    if (items.some(item => Number(item.quantity) > 999999.99 || Number(item.unit_price) > 99999999.99) || sumLines(items) > 999999999999.99) { setError('Сумма или количество превышает допустимый предел. Уменьшите значения в строках.'); return; }
    setBusy(true); setError('');
    const payload = { ...(invoice ? { revision: invoice.revision } : { branch_id: Number(branchId), month }), title: title.trim(), due_date: dueDate || null, note: note.trim(), seller_details: seller.trim(), payment_details: payment.trim(), buyer_details: buyer.trim(), items: items.map(item => ({ lesson_id: item.lesson_id || null, description: item.description.trim(), lesson_date: item.lesson_date || null, teacher_name: item.teacher_name || '', quantity: Number(item.quantity), unit_price: Number(item.unit_price) })) };
    try { const result = invoice ? await service.update(invoice.id, payload) : await service.create(payload); onSaved(result); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  return <><Modal isOpen title={invoice ? 'Редактировать черновик' : 'Новый счёт филиалу'} onClose={closeEditor} size="large"><form className="iv-editor" onSubmit={save}><fieldset className="iv-editor-fields" disabled={busy}>
    <div className="iv-editor-intro"><span className="iv-empty-icon"><PortalIcon name="invoice" /></span><div><h3>От занятий — к готовому счёту</h3><p>Загрузите расчёт за месяц, внесите изменения и сохраните черновик для проверки.</p></div></div>
    {error && <Notice tone="error">{error}</Notice>}{notice && <Notice tone="info" onClose={() => setNotice('')}>{notice}</Notice>}
    <div className="iv-form-grid"><Choice label="Филиал" value={branchId} options={branches.map(branch => ({ value: String(branch.id), label: branch.name }))} placeholder="Выберите филиал" required disabled={!!invoice || busy} onChange={value => changeContext('branch', value)} /><div className="iv-field"><span>Расчётный месяц</span>{invoice ? <div className="iv-static-field"><PortalIcon name="calendar" />{periodName(month)}</div> : <PeriodControl value={{ start: month, end: month }} onChange={period => changeContext('month', period.start)} allowRange={false} showArrows={false} />}</div><label className="iv-field">Название счёта<input value={title} onChange={e => setTitle(e.target.value)} maxLength={255} required /></label><DateField label="Оплатить до (необязательно)" value={dueDate} onChange={setDueDate} /></div>
    {contextChange && <Notice tone="warning"><span>При смене филиала или месяца текущие строки будут очищены.</span><span className="iv-inline-actions"><button type="button" className="od-control" onClick={() => setContextChange(null)}>Оставить</button><button type="button" className="od-control" onClick={applyContext}>Сменить и очистить</button></span></Notice>}
    <section className="iv-editor-lines"><div className="iv-section-heading"><div><h3>Детализация</h3><p>Количество — платные посещения. Пробные занятия не начисляются.</p></div><button type="button" className="od-control" disabled={!branchId || pulling || busy} onClick={() => items.length ? setReplaceReport(true) : pullReport()}><PortalIcon name="download" />{pulling ? 'Загружаем…' : 'Подтянуть из отчёта'}</button></div>
      {replaceReport && <Notice tone="warning">Строки будут заменены актуальным расчётом за {periodName(month).toLowerCase()}.<span className="iv-inline-actions"><button type="button" className="od-control" onClick={() => setReplaceReport(false)}>Оставить строки</button><button type="button" className="od-control" onClick={pullReport}>Заменить из отчёта</button></span></Notice>}
      {!items.length && <div className="iv-lines-empty"><PortalIcon name="cube" /><p>Здесь появятся занятия из отчёта</p><span>Можно добавить свою услугу или корректировку вручную.</span></div>}
      {!!items.length && <div className="iv-edit-line-head" aria-hidden="true"><span>Услуга / занятие</span><span>Кол-во</span><span>Цена, ₽</span><span>Сумма</span><span /></div>}
      {items.map((item, index) => <div className="iv-edit-line" key={index}><div><input aria-label={`Наименование строки ${index + 1}`} value={item.description} onChange={e => changeLine(index, 'description', e.target.value)} placeholder="Например, занятие по робототехнике" maxLength={1000} required />{item.teacher_name && <small>{item.teacher_name}</small>}</div><label><span>Кол-во</span><input aria-label={`Количество строки ${index + 1}`} type="number" inputMode="decimal" min="0.01" max="999999.99" step="0.01" value={item.quantity} onChange={e => changeLine(index, 'quantity', e.target.value)} required /></label><label><span>Цена, ₽</span><input aria-label={`Цена строки ${index + 1}`} type="number" inputMode="decimal" min="0" max="99999999.99" step="0.01" value={item.unit_price} onChange={e => changeLine(index, 'unit_price', e.target.value)} required /></label><strong>{money(lineAmount(item))}</strong><button type="button" className="od-icon-btn iv-remove" aria-label={`Удалить строку ${index + 1}`} onClick={() => { changeVersion.current++; setItems(old => old.filter((_, i) => i !== index)); }}><PortalIcon name="trash" /></button></div>)}
      <div className="iv-editor-total"><button type="button" className="od-text-btn" onClick={() => { changeVersion.current++; setItems(old => [...old, blankItem()]); }}><PortalIcon name="plus" />Добавить строку</button><span>Итого <strong>{money(sumLines(items))}</strong></span></div>
    </section>
    <section><div className="iv-section-heading"><div><h3>Реквизиты</h3><p>Исполнитель и реквизиты для оплаты обязательны при выставлении счёта.</p></div><PortalIcon name="shield" /></div><div className="iv-form-grid"><label className="iv-field">Исполнитель<textarea rows={3} value={seller} onChange={e => setSeller(e.target.value)} placeholder="ИП / организация, ИНН, адрес" maxLength={5000} /></label><label className="iv-field">Плательщик<textarea rows={3} value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="Название сада, юридическое лицо, адрес" maxLength={5000} /></label><label className="iv-field iv-span-full">Реквизиты для оплаты<textarea rows={3} value={payment} onChange={e => setPayment(e.target.value)} placeholder="Получатель, расчётный счёт, банк, БИК и корреспондентский счёт" maxLength={5000} /></label></div></section>
    <label className="iv-field">Комментарий для сада<textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Условия оплаты или пояснение к расчёту" maxLength={2000} /></label>
    <footer className="iv-editor-footer"><span><PortalIcon name="shield" />Черновик виден только администратору</span><div><button type="button" className="od-control" onClick={closeEditor} disabled={busy}>Отмена</button><button type="submit" className="od-primary-btn" disabled={busy || pulling}>{busy ? 'Сохраняем…' : 'Сохранить черновик'}<PortalIcon name="right" /></button></div></footer>
  </fieldset></form></Modal>{discardOpen && <Modal isOpen title="Закрыть без сохранения?" size="small" onClose={() => setDiscardOpen(false)}><div className="iv-discard-confirm"><p>Изменения в черновике ещё не сохранены. При закрытии они будут потеряны.</p><div className="iv-form-actions"><button type="button" className="od-control" onClick={() => setDiscardOpen(false)}>Продолжить редактирование</button><button type="button" className="iv-danger-btn" onClick={onClose}>Закрыть без сохранения</button></div></div></Modal>}</>;
}
