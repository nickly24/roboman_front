import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api';
import Layout from '../../components/Layout/Layout';
import Modal from '../../components/Modal/Modal';
import { Choice } from '../Calendar/CalendarFields';
import CalIcon from '../Calendar/CalendarIcons';
import { errorText, unpack } from '../Accounting/accountingData';
import '../Dashboard/OwnerDashboard.css';
import '../Calendar/Calendar.css';
import './BranchAccounts.css';

const ACCESS_API = '/accounting/branch-access';
const active = account => Number(account.is_active) === 1;
const archived = account => account.branch_is_active != null && Number(account.branch_is_active) === 0;
const canEnter = account => active(account) && !archived(account);
const branchLabel = branch => `${branch.name}${Number(branch.is_active) === 0 ? ' · в архиве' : ''}`;
function AccessIcon({ name, ...props }) {
  const paths = {
    access: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    key: <><circle cx="8" cy="9" r="5" /><path d="m12 13 8 8m-3-3 3-3m-6 0 3-3" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V3H3v13h5" /></>,
    pause: <><path d="M8 6v12M16 6v12" /></>,
    play: <path d="m8 5 11 7-11 7Z" />,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    hide: <><path d="m3 3 18 18M10 5a12 12 0 0 1 12 7 18 18 0 0 1-4 4M6 6a20 20 0 0 0-4 6s4 7 10 7a12 12 0 0 0 4-1" /><path d="M10 10a3 3 0 0 0 4 4" /></>,
  };
  return paths[name] ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg> : <CalIcon name={name} {...props} />;
}

function PasswordField({ value, onChange, disabled }) {
  const [visible, setVisible] = useState(false);
  return <div className="ba-field"><label htmlFor="branch-access-password">Новый пароль</label><div className="ba-password-input"><input id="branch-access-password" name="password" type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={256} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} aria-describedby="branch-password-hint" /><button type="button" className="od-icon-btn" disabled={disabled} aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'} aria-pressed={visible} onClick={() => setVisible(v => !v)}><AccessIcon name={visible ? 'hide' : 'eye'} /></button></div><small id="branch-password-hint">От 8 до 256 символов. Передайте пароль представителю сада.</small></div>;
}

function AccountModal({ mode, account, branches, onClose, onSave }) {
  const [branchId, setBranchId] = useState('');
  const [login, setLogin] = useState(account?.login || '');
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(account ? active(account) : true);
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const busy = useRef(false);
  const creating = mode === 'create', changingPassword = mode === 'password', changingStatus = mode === 'status';
  const title = creating ? 'Создать кабинет сада' : changingPassword ? 'Изменить пароль' : changingStatus ? active(account) ? 'Приостановить доступ?' : 'Включить доступ?' : 'Настройки доступа';
  const close = () => { if (!busy.current) onClose(); };
  const submit = async e => {
    e.preventDefault();
    if (busy.current) return;
    if (creating && !branchId) { setError('Выберите филиал для кабинета'); return; }
    if (!changingStatus && !changingPassword && !login.trim()) { setError('Укажите логин для входа'); return; }
    if ((creating || changingPassword) && (password.length < 8 || password.length > 256)) { setError('Пароль должен содержать от 8 до 256 символов'); return; }
    const payload = changingStatus ? { is_active: active(account) ? 0 : 1 } : changingPassword ? { password } : creating ? { branch_id: Number(branchId), login: login.trim(), password, is_active: enabled ? 1 : 0 } : { login: login.trim() };
    busy.current = true; setSaving(true); setError('');
    try { await onSave(payload); } catch (err) { setError(errorText(err)); } finally { busy.current = false; setSaving(false); }
  };
  return <Modal isOpen title={title} onClose={close} size="branch-access"><form className="ba-form" aria-label={title} onSubmit={submit}>
    <div className="ba-form-context"><span className="ba-context-icon"><AccessIcon name={changingPassword ? 'key' : 'access'} /></span><div><strong>{account?.branch_name || 'Свой кабинет для каждого филиала'}</strong><p>{account ? account.login : 'Занятия, счета и аналитика сада в одном месте.'}</p></div></div>
    {changingStatus ? <p className="ba-status-explanation">{active(account) ? 'Представитель сада больше не сможет войти в кабинет. Вы сможете включить доступ снова в любой момент.' : 'Представитель сада снова сможет войти с текущим логином и паролем.'}</p> : <>
      {creating && <Choice label="Филиал" required value={branchId} onChange={setBranchId} options={branches.map(branch => ({ value: String(branch.id), label: branchLabel(branch) }))} placeholder="Выберите филиал" disabled={saving} />}
      {!changingPassword && <div className="ba-field"><label htmlFor="branch-access-login">Логин</label><input id="branch-access-login" name="login" required autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={64} value={login} onChange={e => setLogin(e.target.value)} disabled={saving} placeholder="Например, sad.solnyshko" aria-describedby="branch-login-hint" /><small id="branch-login-hint">Представитель сада будет использовать его для входа.</small></div>}
      {(creating || changingPassword) && <PasswordField value={password} onChange={setPassword} disabled={saving} />}
      {changingPassword && <p className="ba-form-note">После сохранения прежний пароль перестанет действовать.</p>}
      {creating && <label className="ba-toggle-field"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} disabled={saving} /><span><strong>Доступ включен</strong><small>Представитель сада сможет войти после создания кабинета.</small></span></label>}
    </>}
    {error && <div className="ba-error" role="alert"><AccessIcon name="access" /><span>{error}</span></div>}
    <footer className="ba-form-footer"><button type="button" className="od-control" disabled={saving} onClick={close}>Отмена</button><button className={`od-primary-btn${changingStatus && active(account) ? ' ba-pause-button' : ''}`} disabled={saving || (creating && !branches.length)}>{saving ? 'Сохраняем…' : creating ? 'Создать кабинет' : changingPassword ? 'Изменить пароль' : changingStatus ? active(account) ? 'Приостановить доступ' : 'Включить доступ' : 'Сохранить'}</button></footer>
  </form></Modal>;
}

export default function BranchAccounts() {
  const [accounts, setAccounts] = useState([]), [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true), [branchLoading, setBranchLoading] = useState(true);
  const [error, setError] = useState(''), [branchError, setBranchError] = useState('');
  const [refresh, setRefresh] = useState(0), [query, setQuery] = useState(''), [status, setStatus] = useState('');
  const [modal, setModal] = useState(null), [notice, setNotice] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setBranchLoading(true); setError(''); setBranchError('');
    const read = async (url, onSuccess, onError, onDone) => {
      try { const data = unpack(await apiClient.get(url, { signal: controller.signal })); if (!controller.signal.aborted) onSuccess(data.items || []); }
      catch (err) { if (!controller.signal.aborted) onError(errorText(err)); }
      finally { if (!controller.signal.aborted) onDone(false); }
    };
    read(ACCESS_API, setAccounts, setError, setLoading);
    read('/branches?include_inactive=true&limit=500', setBranches, setBranchError, setBranchLoading);
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const availableBranches = branches.filter(branch => Number(branch.is_active) !== 0 && !accounts.some(account => String(account.branch_id) === String(branch.id)));
  const withBranchState = accounts.map(account => ({ ...account, branch_is_active: account.branch_is_active ?? branches.find(branch => String(branch.id) === String(account.branch_id))?.is_active }));
  const filtered = withBranchState.filter(account => (!status || (status === 'active') === canEnter(account)) && [account.branch_name, account.login].some(value => String(value || '').toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))));
  const activeCount = withBranchState.filter(canEnter).length;
  const openModal = (mode, account = null) => { setNotice(null); setModal({ mode, account }); };
  const save = async payload => {
    const creating = modal.mode === 'create';
    const response = creating ? await apiClient.post(ACCESS_API, payload) : await apiClient.put(`${ACCESS_API}/${modal.account.id}`, payload);
    const updated = unpack(response);
    // Merge against the known account so a compact write response cannot erase its name.
    if (updated?.id) {
      const branch = branches.find(item => String(item.id) === String(updated.branch_id || payload.branch_id));
      const row = { ...modal.account, ...payload, ...updated, branch_name: updated.branch_name || modal.account?.branch_name || branch?.name || '' };
      delete row.password;
      setAccounts(items => creating ? [row, ...items] : items.map(item => String(item.id) === String(row.id) ? row : item));
    }
    setNotice({ text: creating ? 'Кабинет создан. Передайте саду логин и пароль для входа.' : modal.mode === 'password' ? 'Пароль изменен. Передайте новый пароль представителю сада.' : modal.mode === 'status' ? payload.is_active ? 'Доступ к кабинету включен' : 'Доступ к кабинету приостановлен' : 'Настройки доступа сохранены' });
    setModal(null); setRefresh(value => value + 1);
  };
  const copyInvite = async account => {
    try {
      await navigator.clipboard.writeText(`Кабинет сада «${account.branch_name}»\nВход: ${window.location.origin}/login\nЛогин: ${account.login}\nПароль передан вам отдельно.`);
      setNotice({ text: 'Ссылка для входа и логин скопированы' });
    } catch { setNotice({ error: true, text: 'Не удалось скопировать. Логин можно выделить в списке, адрес входа — в блоке ниже.' }); }
  };
  return <Layout headerTitle="Доступ садов" className="layout-branch-accounts"><div className="branch-accounts-page">
    <div className="ba-heading"><div><Link className="od-text-btn ba-back" to="/branches"><AccessIcon name="left" />Филиалы</Link><h1>Кабинеты садов</h1><p>Управляйте доступом представителей филиалов к занятиям, счетам и аналитике.</p></div><button className="od-primary-btn" disabled={loading || branchLoading || !!error || !!branchError || !availableBranches.length} onClick={() => openModal('create')}><AccessIcon name="plus" />Создать кабинет</button></div>
    <section className="ba-summary" aria-label="Сводка доступа"><div><span className="ba-summary-icon"><AccessIcon name="access" /></span><span>Кабинетов создано<strong>{loading || error ? '—' : accounts.length}</strong></span></div><div><span className="ba-summary-icon ba-summary-active"><AccessIcon name="check" /></span><span>Доступ включен<strong>{loading || error ? '—' : activeCount}</strong></span></div><div><span className="ba-summary-icon"><AccessIcon name="pause" /></span><span>Без доступа<strong>{loading || error ? '—' : accounts.length - activeCount}</strong></span></div></section>
    {notice && <div className={`ba-notice${notice.error ? ' ba-notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}><AccessIcon name={notice.error ? 'access' : 'check'} /><span>{notice.text}</span><button className="od-icon-btn" aria-label="Скрыть сообщение" onClick={() => setNotice(null)}><AccessIcon name="close" /></button></div>}
    {branchError && <div className="ba-error" role="alert"><span>Список филиалов недоступен: {branchError}</span><button className="od-control" onClick={() => setRefresh(v => v + 1)}>Повторить</button></div>}
    <section className="ba-panel" aria-label="Учетные записи садов" aria-busy={loading}>
      <div className="ba-toolbar"><label className="ba-search"><AccessIcon name="search" /><input aria-label="Найти кабинет по филиалу или логину" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Филиал или логин" /></label><Choice label="Статус доступа" value={status} onChange={setStatus} options={[{ value: 'active', label: 'Доступ включен' }, { value: 'paused', label: 'Без доступа' }]} placeholder="Все статусы" /><button className="od-icon-btn" aria-label="Обновить кабинеты" disabled={loading || branchLoading} onClick={() => setRefresh(v => v + 1)}><AccessIcon name="repeat" /></button></div>
      {error ? <div className="ba-list-state ba-list-error" role="alert"><AccessIcon name="access" /><h2>Не удалось загрузить кабинеты</h2><p>{error}</p><button className="od-control" onClick={() => setRefresh(v => v + 1)}>Попробовать снова</button></div> : loading ? <div className="ba-list-state" role="status"><span className="ba-loading-dot" /><p>Загружаем кабинеты…</p></div> : !filtered.length ? <div className="ba-list-state"><span className="ba-empty-icon"><AccessIcon name={accounts.length ? 'search' : 'access'} /></span><h2>{accounts.length ? 'Кабинеты не найдены' : 'Откройте саду доступ к своим занятиям'}</h2><p>{accounts.length ? 'Попробуйте другой запрос или измените статус доступа.' : 'Создайте кабинет для филиала и передайте представителю сада данные для входа.'}</p>{accounts.length ? <button className="od-control" onClick={() => { setQuery(''); setStatus(''); }}>Сбросить фильтры</button> : !branchLoading && !branchError && !availableBranches.length ? <Link className="od-control" to="/branches">Перейти к филиалам</Link> : <button className="od-primary-btn" disabled={branchLoading || !!branchError} onClick={() => openModal('create')}><AccessIcon name="plus" />Создать первый кабинет</button>}</div> : <>
        <div className="ba-table-head" aria-hidden="true"><span>Филиал</span><span>Логин</span><span>Доступ</span><span>Управление</span></div>
        <ul className="ba-account-list">{filtered.map(account => {
          const branch = branches.find(item => String(item.id) === String(account.branch_id));
          return <li className="ba-account-row" key={account.id}><div className="ba-branch-cell"><span className={`ba-branch-avatar${canEnter(account) ? '' : ' ba-avatar-paused'}`}><AccessIcon name="pin" /></span><div><strong>{account.branch_name}</strong><small>{branch?.department_name || 'Кабинет филиала'}{archived(account) ? ' · филиал в архиве' : ''}</small></div></div><div className="ba-login-cell"><span>{account.login}</span><button className="od-icon-btn" title="Скопировать ссылку и логин" aria-label={`Скопировать данные для входа: ${account.branch_name}`} onClick={() => copyInvite(account)}><AccessIcon name="copy" /></button></div><div className="ba-status-cell"><span className={`ba-status${canEnter(account) ? ' ba-status-active' : ''}`}><i />{archived(account) ? 'Филиал в архиве' : active(account) ? 'Включен' : 'Приостановлен'}</span></div><div className="ba-row-actions"><button className="od-control ba-edit" aria-label={`Изменить доступ: ${account.branch_name}`} onClick={() => openModal('edit', account)}><AccessIcon name="edit" /><span>Изменить</span></button><button className="od-icon-btn" title="Изменить пароль" aria-label={`Изменить пароль: ${account.branch_name}`} onClick={() => openModal('password', account)}><AccessIcon name="key" /></button><button className={`od-icon-btn${active(account) ? '' : ' ba-resume'}`} disabled={!active(account) && archived(account)} title={!active(account) && archived(account) ? 'Сначала восстановите филиал из архива' : active(account) ? 'Приостановить доступ' : 'Включить доступ'} aria-label={`${active(account) ? 'Приостановить доступ' : 'Включить доступ'}: ${account.branch_name}`} onClick={() => openModal('status', account)}><AccessIcon name={active(account) ? 'pause' : 'play'} /></button></div></li>;
        })}</ul><footer className="ba-list-footer"><span>{query || status ? `Найдено ${filtered.length} из ${accounts.length}` : `Всего кабинетов: ${accounts.length}`}</span><span>Один кабинет на филиал</span></footer>
      </>}
    </section>
    {!loading && !branchLoading && !error && !branchError && accounts.length > 0 && !availableBranches.length && <p className="ba-all-connected"><AccessIcon name="check" />Для всех активных филиалов уже созданы кабинеты. Вы можете изменить их настройки в списке.</p>}
    <aside className="ba-access-note"><span className="ba-note-icon"><AccessIcon name="key" /></span><div><h2>Как передать доступ саду</h2><p>Скопируйте ссылку и логин кнопкой рядом с учетной записью. Пароль передайте отдельно; при необходимости задайте новый.</p><Link to="/login">{window.location.origin}/login<AccessIcon name="right" /></Link></div></aside>
    {modal && <AccountModal mode={modal.mode} account={modal.account} branches={availableBranches} onClose={() => setModal(null)} onSave={save} />}
  </div></Layout>;
}
