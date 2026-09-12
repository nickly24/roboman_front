import React, { useEffect, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import service from '../../services/branchPortalService';
import { DateField } from '../Calendar/CalendarFields';
import { errorText, invoiceNumber, localDate, money, periodName, today } from './invoiceData';
import { InvoiceStatus, LoadingState, Notice, PortalIcon } from './InvoiceUI';

const actions = {
  issue: { title: 'Выставить счёт', button: 'Выставить в кабинет', icon: 'send', description: 'Сад увидит счёт и детализацию в своём кабинете. Сумма, реквизиты и строки счёта будут зафиксированы.' },
  'report-payment': { title: 'Сообщить об оплате', button: 'Я оплатил', icon: 'check', description: 'Администратор проверит поступление и подтвердит оплату. До подтверждения счёт останется на проверке.' },
  'confirm-payment': { title: 'Подтвердить оплату', button: 'Подтвердить поступление', icon: 'check', description: 'Подтвердите, что деньги по этому счёту поступили. Сад увидит статус «Оплачен».' },
  'reject-payment': { title: 'Оплата не найдена', button: 'Вернуть к оплате', icon: 'repeat', description: 'Укажите причину: сад увидит её в истории счёта и сможет повторно сообщить об оплате.' },
  cancel: { title: 'Отменить счёт', button: 'Отменить счёт', icon: 'close', description: 'Счёт останется в истории с отметкой об отмене. Для этого филиала и месяца можно будет подготовить новый.' },
};
const eventLabels = { created: 'Создан черновик', create: 'Создан черновик', updated: 'Изменён черновик', update: 'Изменён черновик', issued: 'Счёт выставлен', issue: 'Счёт выставлен', payment_reported: 'Сад сообщил об оплате', 'report-payment': 'Сад сообщил об оплате', paid: 'Оплата подтверждена', payment_confirmed: 'Оплата подтверждена', 'confirm-payment': 'Оплата подтверждена', payment_rejected: 'Оплата не подтверждена', 'reject-payment': 'Оплата не подтверждена', cancelled: 'Счёт отменён', cancel: 'Счёт отменён' };

export default function InvoiceDetail({ id, admin = false, onClose, onChanged, onEdit }) {
  const [invoice, setInvoice] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0);
  const [action, setAction] = useState(''), [note, setNote] = useState(''), [paymentDate, setPaymentDate] = useState(today()), [busy, setBusy] = useState(false), [documentBusy, setDocumentBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError('');
    service.invoice(admin, id, abort.signal).then(data => { if (!abort.signal.aborted) setInvoice(data); }).catch(e => { if (!abort.signal.aborted) setError(errorText(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [admin, id, refresh]);
  const selectAction = next => { setAction(next); setNote(''); setError(''); };
  const perform = async e => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const updated = await service.action(admin, invoice.id, action, { revision: invoice.revision, note: note.trim() || undefined, ...(action === 'report-payment' ? { payment_date: paymentDate } : {}) });
      if (updated?.id) setInvoice(updated);
      setAction(''); setRefresh(n => n + 1); onChanged?.(actions[action].title);
    } catch (e) { setError(e?.response?.status === 409 ? 'Счёт уже изменён. Обновите его, чтобы увидеть актуальный статус.' : errorText(e)); if (e?.response?.status === 409) setAction(''); } finally { setBusy(false); }
  };
  const document = async download => {
    const tab = download ? null : window.open('', '_blank');
    if (!download && !tab) { setError('Разрешите открытие нового окна, чтобы посмотреть документ. Или скачайте его.'); return; }
    if (tab) { tab.opener = null; tab.document.title = 'Подготовка документа…'; tab.document.body.textContent = 'Подготавливаем счёт…'; }
    setDocumentBusy(true); setError('');
    try {
      const blob = await service.document(admin, invoice.id), url = URL.createObjectURL(blob);
      if (download) {
        const a = window.document.createElement('a'); a.href = url; a.download = `Счёт-${invoice.number || invoice.id}.html`; a.click();
      } else tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { tab?.close(); setError(errorText(e)); } finally { setDocumentBusy(false); }
  };
  return <Modal isOpen onClose={() => { if (!busy) onClose(); }} title={invoice ? invoiceNumber(invoice) : 'Счёт'} size="large"><div className="iv-detail">
    {error && <Notice tone="error">{error} {!action && <button type="button" className="od-text-btn" onClick={() => setRefresh(n => n + 1)}>Обновить счёт</button>}</Notice>}
    {!invoice && loading ? <LoadingState label="Загружаем счёт…" /> : invoice && <>
      <div className="iv-detail-top"><div><span className="iv-eyebrow">{invoice.branch_name}</span><h3>{invoice.title || 'Занятия по робототехнике'}</h3><p>{periodName(invoice.month)}</p></div><InvoiceStatus invoice={invoice} /></div>
      <div className="iv-detail-total"><div><span>Сумма счёта</span><strong>{money(invoice.total_amount)}</strong></div><div><span>Оплатить до</span><strong>{localDate(invoice.due_date, { year: 'numeric' })}</strong></div></div>
      {invoice.status === 'payment_reported' && <Notice tone="warning">{admin ? 'Сад сообщил об оплате. Проверьте поступление перед подтверждением.' : 'Вы сообщили об оплате. Ожидаем подтверждения администратора.'}{invoice.payment_date && <span className="iv-block">Дата оплаты: {localDate(invoice.payment_date, { year: 'numeric' })}</span>}{invoice.payment_note && <span className="iv-block">{invoice.payment_note}</span>}</Notice>}
      {invoice.status === 'paid' && <Notice>Оплата подтверждена{invoice.paid_at ? ` ${localDate(invoice.paid_at, { year: 'numeric' })}` : ''}.</Notice>}
      <div className="iv-detail-tablewrap"><table className="iv-detail-table"><caption>Детализация счёта</caption><thead><tr><th>Услуга / занятие</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>{(invoice.items || []).map((item, index) => <tr key={item.id || index}><td><strong>{item.description}</strong>{(item.lesson_date || item.teacher_name) && <small>{[item.lesson_date && localDate(item.lesson_date), item.teacher_name].filter(Boolean).join(' · ')}</small>}</td><td>{Number(item.quantity)}</td><td>{money(item.unit_price)}</td><td><strong>{money(item.amount)}</strong></td></tr>)}</tbody></table></div>
      {invoice.note && <div className="iv-detail-note"><h4>Комментарий к счёту</h4><p>{invoice.note}</p></div>}
      {(invoice.seller_details || invoice.payment_details || invoice.buyer_details) && <details className="iv-details"><summary>Плательщик и реквизиты<PortalIcon name="down" /></summary><div className="iv-requisites">{[['Исполнитель', invoice.seller_details], ['Плательщик', invoice.buyer_details], ['Реквизиты для оплаты', invoice.payment_details]].filter(([, value]) => value).map(([label, value]) => <div key={label}><span>{label}</span><p>{value}</p></div>)}</div></details>}
      {!!invoice.events?.length && <details className="iv-details"><summary>История счёта <span>{invoice.events.length}</span><PortalIcon name="down" /></summary><ol className="iv-timeline">{invoice.events.map((event, index) => <li key={event.id || index}><span className="iv-timeline-dot" /><div><strong>{eventLabels[event.action] || 'Изменение счёта'}</strong><small>{localDate(event.created_at, { year: 'numeric', hour: '2-digit', minute: '2-digit' })}{event.actor_name ? ` · ${event.actor_name}` : ''}</small>{event.note && <p>{event.note}</p>}</div></li>)}</ol></details>}
      {action ? <form className="iv-action-panel" onSubmit={perform}><div className="iv-action-title"><PortalIcon name={actions[action].icon} /><h4>{actions[action].title}</h4></div><p>{actions[action].description}</p>{action === 'report-payment' && <DateField label="Дата оплаты" value={paymentDate} onChange={setPaymentDate} />}<label className="iv-field">{['reject-payment', 'cancel'].includes(action) ? 'Причина' : 'Комментарий (необязательно)'}<textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={2000} required={['reject-payment', 'cancel'].includes(action)} placeholder={action === 'report-payment' ? 'Например, номер платёжного поручения' : 'Комментарий будет сохранён в истории счёта'} /></label><div className="iv-form-actions"><button type="button" className="od-control" onClick={() => setAction('')} disabled={busy}>Назад</button><button type="submit" className={action === 'cancel' ? 'iv-danger-btn' : 'od-primary-btn'} disabled={busy}>{busy ? 'Сохраняем…' : actions[action].button}</button></div></form> : <div className="iv-detail-actions"><div><button type="button" className="od-control" onClick={() => document(false)} disabled={documentBusy}><PortalIcon name="invoice" />Печать / PDF</button><button type="button" className="od-icon-btn" title="Скачать HTML-документ" aria-label="Скачать HTML-документ" onClick={() => document(true)} disabled={documentBusy}><PortalIcon name="download" /></button></div><div>
        {admin && invoice.status === 'draft' && <><button type="button" className="od-control" disabled={loading || busy} onClick={() => onEdit(invoice)}><PortalIcon name="edit" />Редактировать</button><button type="button" className="od-primary-btn" disabled={loading || busy} onClick={() => selectAction('issue')}><PortalIcon name="send" />Выставить счёт</button></>}
        {!admin && invoice.status === 'issued' && <button type="button" className="od-primary-btn" disabled={loading || busy} onClick={() => selectAction('report-payment')}><PortalIcon name="check" />Я оплатил</button>}
        {admin && ['issued', 'payment_reported'].includes(invoice.status) && <>{invoice.status === 'payment_reported' && <button type="button" className="od-control" disabled={loading || busy} onClick={() => selectAction('reject-payment')}>Оплата не найдена</button>}<button type="button" className="od-primary-btn" disabled={loading || busy} onClick={() => selectAction('confirm-payment')}><PortalIcon name="check" />Подтвердить оплату</button></>}
      </div>{admin && ['draft', 'issued', 'payment_reported'].includes(invoice.status) && <button type="button" className="iv-cancel-link" disabled={loading || busy} onClick={() => selectAction('cancel')}>Отменить счёт</button>}</div>}
    </>}
  </div></Modal>;
}
