import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Table from '../../components/Table/Table';
import Modal from '../../components/Modal/Modal';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import useMediaQuery from '../../hooks/useMediaQuery';
import certificateService from '../../services/certificateService';
import CertificateProfile, { CertificateIcon, CertificateStatus } from './CertificateProfile';
import CertificateEditor from './CertificateEditor';
import { CertificateShareActions } from './MyCertificate';
import { certificateDate, certificateDownloadError, certificateError, certificateLink, certificateStatus, isCertificateValid, isRevisionConflict, saveCertificateFile } from './certificateData';
import './Certificates.css';

export default function TeacherCertificates() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [params, setParams] = useSearchParams();
  const [certificates, setCertificates] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState([]);
  const [active, setActive] = useState(null);
  const [opening, setOpening] = useState(false);
  const [editor, setEditor] = useState(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [actionConflict, setActionConflict] = useState(false);
  const consumedTeacher = useRef('');
  const detailRef = useRef(null);
  const editorRef = useRef(null);
  const openingId = useRef(0);
  const load = useCallback(async signal => {
    setLoading(true); setLoadError('');
    try {
      const [documents, people] = await Promise.all([certificateService.list(signal), certificateService.teachers(signal)]);
      if (signal?.aborted) return;
      setCertificates(documents); setTeachers(people);
      setSelected(ids => ids.filter(id => documents.some(document => document.id === id && isCertificateValid(document))));
    } catch (e) { if (e?.code !== 'ERR_CANCELED') setLoadError(certificateError(e)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => { controller.abort(); openingId.current += 1; }; }, [load]);
  const sync = document => {
    setActive(document);
    setCertificates(items => items.some(item => item.id === document.id) ? items.map(item => item.id === document.id ? document : item) : [...items, document]);
    if (!isCertificateValid(document)) setSelected(ids => ids.filter(id => id !== document.id));
  };
  const open = useCallback(async id => {
    const request = ++openingId.current;
    setOpening(true); setError(''); setNotice('');
    try { const document = await certificateService.get(id); if (request === openingId.current) setActive(document); }
    catch (e) { if (request === openingId.current) setError(certificateError(e)); }
    finally { if (request === openingId.current) setOpening(false); }
  }, []);
  useEffect(() => {
    const teacherId = params.get('teacher');
    if (loading || loadError || !teacherId || consumedTeacher.current === teacherId) return;
    consumedTeacher.current = teacherId;
    const teacher = teachers.find(item => String(item.id) === teacherId);
    if (!teacher) { setError('Преподаватель не найден.'); return; }
    const existing = certificates.find(item => String(item.teacher_id) === teacherId);
    if (existing) open(existing.id);
    else setEditor({ certificate: null, teacherId: teacher.id });
  }, [params, loading, loadError, teachers, certificates, open]);
  const activeId = active?.id;
  useEffect(() => { if (activeId) detailRef.current?.focus({ preventScroll: true }); }, [activeId]);
  const availableTeachers = teachers.filter(teacher => !certificates.some(document => String(document.teacher_id) === String(teacher.id)));
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ru-RU');
    return certificates.filter(document => (!status || certificateStatus(document) === status) && (!needle || `${document.teacher_name} ${document.number}`.toLocaleLowerCase('ru-RU').includes(needle))).sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'ru'));
  }, [certificates, query, status]);
  const selectable = filtered.filter(isCertificateValid).map(document => document.id);
  const allSelected = selectable.length > 0 && selectable.every(id => selected.includes(id));
  const selectOne = id => setSelected(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  const toggleAll = () => setSelected(ids => allSelected ? ids.filter(id => !selectable.includes(id)) : Array.from(new Set([...ids, ...selectable])));
  const download = async () => {
    if (pdfBusy || !active) return;
    setPdfBusy(true); setError(''); setNotice('');
    try { saveCertificateFile(await certificateService.pdf(active.id), `Сертификат-${active.number}.pdf`); }
    catch (e) { setError(await certificateDownloadError(e)); }
    finally { setPdfBusy(false); }
  };
  const exportSelected = async () => {
    if (busy || !selected.length || selected.length > 100) return;
    setBusy(true); setError(''); setNotice('');
    try { saveCertificateFile(await certificateService.export(selected), 'Сертификаты-IT-Club.zip'); setNotice(`Архив сертификатов готов: ${selected.length}`); }
    catch (e) { setError(await certificateDownloadError(e)); }
    finally { setBusy(false); }
  };
  const perform = async () => {
    if (busy || !active) return;
    setBusy(true); setError(''); setActionConflict(false);
    try {
      sync(await certificateService[action](active.id, active.revision));
      setNotice(action === 'publish' ? 'Сертификат опубликован' : 'Сертификат отозван');
      setAction('');
    } catch (e) { setActionConflict(isRevisionConflict(e)); setError(certificateError(e)); }
    finally { setBusy(false); }
  };
  const refreshAction = async () => {
    if (busy || !active) return;
    setBusy(true);
    try { sync(await certificateService.get(active.id)); setError(''); setActionConflict(false); setAction(''); }
    catch (e) { setError(certificateError(e)); }
    finally { setBusy(false); }
  };
  const startAction = name => { setError(''); setNotice(''); setActionConflict(false); setAction(name); };
  const closeEditor = () => {
    if (editorBusy) return;
    setEditor(null);
    if (params.has('teacher')) { const next = new URLSearchParams(params); next.delete('teacher'); setParams(next, { replace: true }); }
  };
  const publicationReady = active?.has_photo && active?.description?.trim() && active?.teacher_status !== 'fired';
  const valid = isCertificateValid(active);
  const columns = [
    { key: 'selection', title: isMobile ? 'Выбрать' : <input type="checkbox" aria-label="Выбрать все действующие сертификаты в списке" checked={allSelected} onChange={toggleAll} disabled={!selectable.length || busy} />, width: 48, render: (_, row) => <input type="checkbox" aria-label={`Выбрать сертификат: ${row.teacher_name}`} checked={selected.includes(row.id)} disabled={!isCertificateValid(row) || busy} onChange={() => selectOne(row.id)} /> },
    { key: 'teacher_name', title: 'Преподаватель', render: (name, row) => <div className="tc-table-teacher"><strong>{name}</strong><span>{row.university || 'Образование не указано'}</span></div> },
    { key: 'number', title: 'Номер', render: number => <span className="tc-table-number">{number}</span> },
    { key: 'status', title: 'Состояние', render: (_, row) => <CertificateStatus certificate={row} /> },
    { key: 'issued_at', title: 'Выдан', render: value => value ? certificateDate(value) : '—' },
    { key: 'actions', title: '', align: 'right', render: (_, row) => <Button size="small" variant="secondary" onClick={() => open(row.id)} aria-label={`Открыть сертификат: ${row.teacher_name}`}>Открыть</Button> },
  ];
  return <Layout><div className="tc-workspace"><div className="tc-page-heading"><div><h1>Сертификаты преподавателей</h1><p className="page-description">Оформление профилей, публикация и выгрузка документов</p></div><Button onClick={() => { setError(''); setEditor({ certificate: null }); }} disabled={loading || !availableTeachers.length}>Создать сертификат</Button></div>
    {error && !action && <div role="alert" className="tc-alert tc-alert-error">{error}</div>}{notice && <div role="status" className="tc-alert tc-alert-success">{notice}</div>}
    <div className="tc-summary"><div><CertificateIcon /><span>Всего сертификатов<strong>{certificates.length}</strong></span></div><div><span className="tc-summary-dot tc-summary-published" /><span>Действующие<strong>{certificates.filter(isCertificateValid).length}</strong></span></div><div><span className="tc-summary-dot tc-summary-draft" /><span>Черновики<strong>{certificates.filter(document => certificateStatus(document) === 'draft').length}</strong></span></div><div><span className="tc-summary-dot tc-summary-revoked" /><span>Недействующие<strong>{certificates.filter(document => certificateStatus(document) === 'revoked').length}</strong></span></div></div>
    <Card><div className="tc-list-toolbar"><Input aria-label="Поиск по ФИО или номеру сертификата" placeholder="Поиск по ФИО или номеру" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Состояние сертификата" value={status} onChange={e => setStatus(e.target.value)} className="select"><option value="">Все состояния</option><option value="published">Действующие</option><option value="draft">Черновики</option><option value="revoked">Недействующие</option></select><Button variant="secondary" onClick={exportSelected} disabled={busy || !selected.length || selected.length > 100}><CertificateIcon kind="download" />{busy && !action ? 'Готовим архив…' : `Скачать ZIP${selected.length ? ` (${selected.length})` : ''}`}</Button></div>
      {isMobile && <label className="tc-mobile-select-all"><input type="checkbox" aria-label="Выбрать все действующие сертификаты в списке" checked={allSelected} onChange={toggleAll} disabled={!selectable.length || busy} /><span>Выбрать все действующие</span></label>}
      {selected.length > 100 && <div role="alert" className="tc-alert tc-alert-error">За один раз можно выгрузить до 100 сертификатов. Уменьшите выбор.</div>}
      {selected.length > 0 && <div className="tc-selection-note"><span>Выбрано: {selected.length} · лимит 100</span><button type="button" onClick={() => setSelected([])} disabled={busy}>Снять выбор</button></div>}
      {loadError ? <div role="alert" className="tc-alert tc-alert-error">{loadError}<Button variant="secondary" onClick={() => load()}>Повторить загрузку</Button></div> : <Table className="tc-certificate-list" columns={columns} data={filtered} loading={loading} emptyMessage={query || status ? 'По вашим условиям сертификаты не найдены' : 'Сертификаты ещё не созданы'} mobileTitleKey="teacher_name" />}
      <p className="tc-list-note">В ZIP входят только действующие сертификаты. Данные о садах обновляются из назначений преподавателя.</p>
    </Card>
    {opening ? <LoadingSpinner text="Открываем сертификат…" /> : active && <section className="tc-detail" ref={detailRef} tabIndex={-1} aria-label="Выбранный сертификат"><div className="tc-detail-toolbar"><div><h2>{active.teacher_name}</h2><p>Сертификат № {active.number}</p></div><div className="tc-detail-controls"><Button variant="secondary" onClick={() => { setError(''); setEditor({ certificate: active }); }} disabled={busy}>Редактировать</Button>{active.status === 'published' ? <Button variant="danger" onClick={() => startAction('revoke')} disabled={busy}>Отозвать сертификат</Button> : <Button onClick={() => startAction('publish')} disabled={busy || !publicationReady}>Опубликовать</Button>}<Button variant="ghost" aria-label="Закрыть просмотр сертификата" onClick={() => setActive(null)}>Закрыть</Button></div></div>
      {!valid && <div className="tc-alert tc-alert-info">{active.teacher_status === 'fired' ? 'Преподаватель в архиве. Сертификат недействителен и не может быть опубликован до возвращения преподавателя.' : !publicationReady ? 'Для публикации загрузите фотографию и заполните описание преподавателя.' : 'Данные доступны в предварительном просмотре. Публичная ссылка и PDF откроются после публикации.'}</div>}
      {valid && !certificateLink(active) && <div className="tc-alert tc-alert-info">Не настроен публичный адрес сертификатов.</div>}{valid && <CertificateShareActions certificate={active} onDownload={download} busy={pdfBusy} onError={setError} onCopied={setNotice} />}<CertificateProfile certificate={active} preview />
    </section>}
    <Modal isOpen={!!editor} onClose={() => editorRef.current?.requestClose()} title={editor?.certificate ? 'Редактировать сертификат' : 'Создать сертификат'} size="large">{editor && <CertificateEditor ref={editorRef} key={editor.certificate?.id || `new-${editor.teacherId || ''}`} certificate={editor.certificate} teachers={availableTeachers} initialTeacherId={editor.teacherId} onBusy={setEditorBusy} onCancel={closeEditor} onPartialSaved={sync} onSaved={document => { sync(document); setNotice('Сертификат сохранён'); setEditor(null); if (params.has('teacher')) { const next = new URLSearchParams(params); next.delete('teacher'); setParams(next, { replace: true }); } }} />}</Modal>
    <Modal isOpen={!!action} onClose={() => { if (!busy) { setAction(''); setError(''); } }} title={action === 'publish' ? 'Опубликовать сертификат?' : 'Отозвать сертификат?'}>
      {active && <div className="tc-review">{error && <div role="alert" className="tc-alert tc-alert-error">{error}{actionConflict && <Button variant="secondary" onClick={refreshAction} disabled={busy}>Обновить данные</Button>}</div>}
        {action === 'publish' ? <><p>По ссылке станут доступны следующие сведения о преподавателе:</p><dl><div><dt>Преподаватель</dt><dd>{active.teacher_name}</dd></div><div><dt>Фотография</dt><dd>{active.has_photo ? 'Загружена' : 'Не загружена'}</dd></div>{active.university && <div><dt>Учебное заведение</dt><dd>{active.university}</dd></div>}{active.study_program && <div><dt>Направление</dt><dd>{active.study_program}</dd></div>}<div><dt>Описание</dt><dd className="tc-prose">{active.description}</dd></div><div><dt>Сады</dt><dd>{active.branches?.length ? active.branches.map(branch => `${branch.name}${branch.address ? ` — ${branch.address}` : ''}`).join('; ') : 'Пока не закреплены'}</dd></div></dl></> : <><p>Публичная страница будет показывать только номер и сообщение о недействительности. Фотография, имя, описание и сады станут недоступны по ссылке.</p><p>Скачивание PDF прекратится. Ранее скачанные документы проверяются по QR-коду. Сертификат можно опубликовать повторно с тем же номером.</p></>}
        <div className="tc-editor-actions"><Button variant="secondary" onClick={() => { setAction(''); setError(''); }} disabled={busy}>Отмена</Button><Button variant={action === 'revoke' ? 'danger' : 'primary'} onClick={perform} disabled={busy || actionConflict || (action === 'publish' && !publicationReady)}>{busy ? 'Сохраняем…' : action === 'publish' ? 'Подтвердить публикацию' : 'Подтвердить отзыв'}</Button></div>
      </div>}
    </Modal>
  </div></Layout>;
}
