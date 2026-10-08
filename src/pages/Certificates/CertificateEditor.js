import React, { forwardRef, useId, useImperativeHandle, useState } from 'react';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import certificateService from '../../services/certificateService';
import { certificateError, isRevisionConflict, photoError } from './certificateData';

const fields = certificate => ({ university: certificate?.university || '', study_program: certificate?.study_program || '', description: certificate?.description || '' });

const CertificateEditor = forwardRef(function CertificateEditor({ certificate, teachers, initialTeacherId, onSaved, onPartialSaved, onCancel, onBusy }, ref) {
  const [current, setCurrent] = useState(certificate || null);
  const [form, setForm] = useState(fields(certificate));
  const [teacherId, setTeacherId] = useState(String(certificate?.teacher_id || initialTeacherId || ''));
  const [photo, setPhoto] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const descriptionId = useId();
  const photoId = useId();
  const [photoPickerVersion, setPhotoPickerVersion] = useState(0);
  const initial = fields(current);
  const dirty = photo || removePhoto || Object.keys(form).some(key => form[key] !== initial[key]) || (!current && !!teacherId);
  const isPublished = current?.status === 'published';
  const setWorking = value => { setBusy(value); onBusy?.(value); };
  const cancel = () => { if (busy) return; if (dirty) setConfirmClose(true); else onCancel(); };
  useImperativeHandle(ref, () => ({ requestClose: cancel }));
  const setPersisted = document => { setCurrent(document); onPartialSaved?.(document); };
  const submit = async e => {
    e.preventDefault();
    if (busy) return;
    setError(''); setConflict(false);
    const imageError = photoError(photo);
    if (imageError) { setError(imageError); return; }
    const payload = { university: form.university.trim(), study_program: form.study_program.trim(), description: form.description.trim() };
    if (!current && !teacherId) { setError('Выберите преподавателя.'); return; }
    if (payload.university.length > 250 || payload.study_program.length > 250 || payload.description.length > 3000) { setError('Проверьте длину текста: образование до 250 символов, описание до 3000.'); return; }
    if (isPublished && !payload.description) { setError('У опубликованного сертификата должно оставаться описание. Для удаления сначала отзовите сертификат.'); return; }
    setWorking(true);
    let document = current;
    try {
      if (!document) { document = await certificateService.create({ teacher_id: Number(teacherId), ...payload }); setPersisted(document); }
      else if (Object.keys(payload).some(key => payload[key] !== (document[key] || ''))) { document = await certificateService.update(document.id, { ...payload, revision: document.revision }); setPersisted(document); }
      if (photo) { document = await certificateService.photo(document.id, photo, document.revision); setPersisted(document); }
      else if (removePhoto) { document = await certificateService.removePhoto(document.id, document.revision); setPersisted(document); }
      onSaved(document);
    } catch (e2) { setConflict(isRevisionConflict(e2)); setError(certificateError(e2)); }
    finally { setWorking(false); }
  };
  const refresh = async () => {
    if (!current || busy) return;
    setWorking(true);
    try {
      const latest = await certificateService.get(current.id);
      setPersisted(latest); setForm(fields(latest)); setPhoto(null); setRemovePhoto(false); setConflict(false); setError('');
      setPhotoPickerVersion(value => value + 1);
    } catch (e) { setError(certificateError(e)); }
    finally { setWorking(false); }
  };
  const changePhoto = e => {
    const file = e.target.files?.[0] || null;
    const validation = photoError(file);
    setError(validation);
    if (validation) { e.target.value = ''; setPhoto(null); return; }
    setPhoto(file); setRemovePhoto(false);
  };
  return <form className="tc-editor" aria-label={current ? 'Редактирование сертификата' : 'Создание сертификата'} onSubmit={submit}>
    <p className="tc-editor-intro">Имя и закреплённые сады берутся из карточки преподавателя. После публикации фотография, образование и описание будут доступны по публичной ссылке.</p>
    {error && <div role="alert" className="tc-alert tc-alert-error">{error}{conflict && <div className="tc-conflict"><p>Обновление отменит несохранённые изменения в этой форме.</p><Button variant="secondary" size="small" onClick={refresh} disabled={busy}>Обновить данные</Button></div>}</div>}
    {current ? <div className="tc-editor-identity"><strong>{current.teacher_name}</strong><span>Сертификат № {current.number}</span></div> : <Select label="Преподаватель" required value={teacherId} onChange={e => setTeacherId(e.target.value)} disabled={busy} options={teachers.map(teacher => ({ value: teacher.id, label: teacher.full_name }))} />}
    <div className="tc-editor-grid"><Input label="Университет / учебное заведение" value={form.university} onChange={e => setForm({ ...form, university: e.target.value })} maxLength={250} disabled={busy} placeholder="Например, Московский политех" /><Input label="Направление обучения" value={form.study_program} onChange={e => setForm({ ...form, study_program: e.target.value })} maxLength={250} disabled={busy} placeholder="Например, мехатроника и робототехника" /></div>
    <div className="tc-editor-field"><label htmlFor={descriptionId}>Описание преподавателя{isPublished && <span className="input-required">*</span>}</label><textarea id={descriptionId} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={3000} rows={6} disabled={busy} placeholder="Опыт преподавателя, интересы и подход к занятиям" /><div className="tc-field-note"><span>Обязательно для публикации</span><span>{form.description.length} / 3000</span></div></div>
    <div className="tc-photo-field"><div><label htmlFor={photoId}>Фотография преподавателя</label><p>JPEG, PNG или WebP · до 5 МБ. Фото обязательно для публикации.</p></div><input key={photoPickerVersion} id={photoId} type="file" accept="image/jpeg,image/png,image/webp" onChange={changePhoto} disabled={busy} />{photo && <div className="tc-current-photo"><p className="tc-photo-choice">Выбрано: <strong>{photo.name}</strong></p><Button size="small" variant="secondary" disabled={busy} onClick={() => { setPhoto(null); setPhotoPickerVersion(value => value + 1); }}>Отменить выбор фото</Button></div>}{current?.has_photo && !photo && <div className="tc-current-photo"><span>{removePhoto ? 'Фотография будет удалена при сохранении' : 'Фотография загружена'}</span>{!isPublished && <Button size="small" variant="secondary" onClick={() => setRemovePhoto(value => !value)} disabled={busy}>{removePhoto ? 'Оставить фотографию' : 'Удалить фотографию'}</Button>}</div>}{isPublished && <p className="tc-field-note">Опубликованную фотографию можно заменить. Чтобы убрать её, сначала отзовите сертификат.</p>}</div>
    {isPublished && <div className="tc-alert tc-alert-info">Сохранённые изменения сразу появятся в публичном профиле.</div>}
    {confirmClose ? <div className="tc-discard" role="alert"><p>Закрыть форму и отменить несохранённые изменения?</p><div><Button variant="secondary" onClick={() => setConfirmClose(false)}>Продолжить редактирование</Button><Button variant="danger" onClick={onCancel}>Закрыть без сохранения</Button></div></div> : <div className="tc-editor-actions"><Button variant="secondary" onClick={cancel} disabled={busy}>Отмена</Button><Button type="submit" disabled={busy}>{busy ? 'Сохраняем…' : current ? 'Сохранить изменения' : 'Создать черновик'}</Button></div>}
  </form>;
});

export default CertificateEditor;
