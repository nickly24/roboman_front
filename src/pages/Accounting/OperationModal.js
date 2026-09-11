import React, { useEffect, useRef, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import { Choice } from '../Calendar/CalendarFields';
import apiClient from '../../services/api';
import { API_ENDPOINTS as API } from '../../config/api';
import { calcIncomeNet, calcReferralAmount } from '../../utils/incomeCalc';
import Icon from './AccountingIcons';
import { errorText, money, operationTypes, periodName, salaryPeriod, sheetPeriod, unpack } from './accountingData';
export default function OperationModal({ type, sheetData, onClose, onSave }) {
  const { sheet, owners = [], teachers = [], branches = [] } = sheetData;
  const [form, setForm] = useState({ owner: owners.length === 1 ? String(owners[0].id) : '', branch: '', teacher: '', to: '', amount: '', name: '', period: 'full', tax: '0', referral: '0', net: false, comment: '' });
  const [saving, setSaving] = useState(false), [pulling, setPulling] = useState(false), [error, setError] = useState(''), [pullNote, setPullNote] = useState('');
  const [deductions, setDeductions] = useState(false);
  const busy = useRef(false), request = useRef(null), generation = useRef(0);
  useEffect(() => () => request.current?.abort(), []);
  const set = (key, value) => { generation.current++; request.current?.abort(); setPulling(false); setPullNote(''); setForm(old => ({ ...old, [key]: value, ...(key === 'owner' && value === old.to ? { to: '' } : {}) })); };
  const close = () => { if (!busy.current) { request.current?.abort(); onClose(); } };
  const amount = Number(form.amount), tax = amount * Number(form.tax) / 100;
  const preview = { amount, tax_amount: tax, referral_percent: Number(form.referral), referral_from_net: form.net };
  const pull = async () => {
    if (pulling || saving) return;
    const abort = new AbortController(); request.current = abort; const version = generation.current; setPulling(true); setError(''); setPullNote('');
    try {
      let value;
      if (type === 'income') {
        const data = unpack(await apiClient.get(`${API.REPORTS_BRANCH_SUMMARY(form.branch)}?month=${sheetPeriod(sheet)}`, { signal: abort.signal }));
        value = data?.kpi?.revenue_sum;
      } else {
        const data = unpack(await apiClient.get(`${API.SALARY_OWNER_BY_DEPARTMENT}?month=${sheetPeriod(sheet)}`, { signal: abort.signal }));
        const department = data?.by_department?.find(d => String(d.department_id) === String(sheet.department_id));
        const teacher = department?.teachers?.find(t => String(t.teacher_id) === form.teacher);
        value = teacher?.[form.period === '1_15' ? 'salary_1_15' : form.period === '16_end' ? 'salary_16_end' : 'salary_sum'];
      }
      if (abort.signal.aborted || version !== generation.current) return;
      if (value === null || value === undefined || !Number.isFinite(Number(value))) throw new Error('За выбранный период нет данных. Сумму можно ввести вручную.');
      setForm(old => ({ ...old, amount: String(Math.round(Number(value) * 100) / 100) })); setPullNote('Сумма из отчёта подставлена. Проверьте её перед сохранением.');
    } catch (e) { if (!abort.signal.aborted) setError(errorText(e)); } finally { if (request.current === abort) setPulling(false); }
  };
  const submit = async e => {
    e.preventDefault(); if (busy.current) return; setError('');
    if (!form.owner || (type === 'income' && !form.branch) || (type === 'salary' && !form.teacher) || (type === 'expense' && !form.name.trim()) || (type === 'transfer' && (!form.to || form.owner === form.to))) { setError('Заполните обязательные поля. Для перевода выберите разных владельцев.'); return; }
    if (form.amount === '' || !Number.isFinite(amount) || amount < 0 || (type === 'transfer' && amount <= 0)) { setError('Укажите корректную сумму'); return; }
    let payload = { owner_id: Number(form.owner), amount };
    if (type === 'income') {
      if (![Number(form.tax), Number(form.referral)].every(v => Number.isFinite(v) && v >= 0 && v <= 100)) { setError('Проценты должны быть от 0 до 100'); return; }
      payload = { ...payload, branch_id: Number(form.branch), tax_amount: tax, referral_percent: form.referral === '' ? null : Number(form.referral), referral_from_net: form.net ? 1 : 0, referral_comment: form.comment || undefined };
    } else if (type === 'salary') payload = { ...payload, teacher_id: Number(form.teacher), period_type: form.period };
    else if (type === 'expense') payload = { ...payload, name: form.name.trim() };
    else payload = { from_owner_id: Number(form.owner), to_owner_id: Number(form.to), amount };
    request.current?.abort(); busy.current = true; setSaving(true);
    try { await onSave(payload); } catch (e) { setError(errorText(e)); } finally { busy.current = false; setSaving(false); }
  };
  const ownerOptions = owners.map(o => ({ value: String(o.id), label: o.full_name }));
  const field = (label, key, props = {}) => <label className="ac-field">{label}<input value={form[key]} disabled={saving} onChange={e => set(key, e.target.value)} {...props} /></label>;
  return <Modal isOpen title={`Добавить: ${operationTypes[type].single.toLowerCase()}`} onClose={close} size="accounting-form"><form className="ac-form" onSubmit={submit}><div className="ac-form-context"><Icon name={operationTypes[type].icon} /><span>{sheet.department_name}<small>{periodName(sheetPeriod(sheet))}</small></span></div>
    {type === 'income' && <Choice label="Филиал" required value={form.branch} disabled={saving} onChange={v => set('branch', v)} placeholder="Выберите филиал" options={branches.map(b => ({ value: String(b.id), label: b.name }))} />}
    <div className={type === 'transfer' || type === 'salary' ? 'ac-form-grid' : ''}><Choice label={type === 'income' ? 'Кому зачислено' : type === 'transfer' ? 'От кого' : 'Кто платит'} required value={form.owner} disabled={saving} onChange={v => set('owner', v)} options={ownerOptions} placeholder="Выберите владельца" />
      {type === 'transfer' && <Choice label="Кому" required value={form.to} disabled={saving} onChange={v => set('to', v)} options={ownerOptions.filter(o => o.value !== form.owner)} placeholder="Выберите владельца" />}
      {type === 'salary' && <Choice label="Преподаватель" required value={form.teacher} disabled={saving} onChange={v => set('teacher', v)} options={teachers.map(t => ({ value: String(t.id), label: t.full_name }))} placeholder="Выберите преподавателя" />}</div>
    {type === 'salary' && <Choice label="Период выплаты" required value={form.period} disabled={saving} onChange={v => set('period', v)} options={['1_15', '16_end', 'full'].map(value => ({ value, label: salaryPeriod(value) }))} />}
    {type === 'expense' && field('На что потрачено', 'name', { required: true, maxLength: 255, placeholder: 'Например, наборы для занятий' })}
    <div className="ac-amount-field">{field('Сумма, ₽', 'amount', { type: 'number', required: true, min: type === 'transfer' ? '0.01' : '0', step: '0.01', inputMode: 'decimal', placeholder: '0' })}{['income', 'salary'].includes(type) && <button className="od-control" type="button" onClick={pull} disabled={saving || pulling || (type === 'income' ? !form.branch : !form.teacher)}><Icon name="income" />{pulling ? 'Загружаем…' : 'Из отчёта'}</button>}</div>
    {pullNote && <p className="ac-pull-note">{pullNote}</p>}
    {type === 'income' && <div className="ac-deductions"><button type="button" className="ac-deductions-toggle" aria-expanded={deductions} onClick={() => setDeductions(!deductions)}><span>Налог и рефералка<small>{Number(form.tax) || Number(form.referral) ? `Налог ${form.tax || 0}% · рефералка ${form.referral || 0}%` : 'Указать удержания, если они есть'}</small></span><Icon name="down" /></button>{deductions && <><div className="ac-form-grid">{field('Налог, %', 'tax', { type: 'number', min: '0', max: '100', step: '0.01' })}{field('Рефералка, %', 'referral', { type: 'number', min: '0', max: '100', step: '0.01' })}</div><label className="ac-check"><input type="checkbox" checked={form.net} disabled={saving} onChange={e => set('net', e.target.checked)} />Рефералка после вычета налога</label>{field('Комментарий к рефералке', 'comment', { placeholder: 'Кому перечисляется процент' })}</>}<div className="ac-income-preview"><span>Удержания <b>{money(tax + calcReferralAmount(preview))}</b></span><span>Останется <strong>{money(calcIncomeNet(preview))}</strong></span></div></div>}
    {type === 'transfer' && <p className="ac-muted">Перевод меняет остатки владельцев. Прибыль листа остаётся прежней.</p>}
    {error && <div className="ac-error" role="alert">{error}</div>}<footer className="ac-form-footer"><button className="od-control" type="button" disabled={saving} onClick={close}>Отмена</button><button className="od-primary-btn" type="submit" disabled={saving || pulling}>{saving ? 'Сохраняем…' : 'Добавить операцию'}</button></footer>
  </form></Modal>;
}
