import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS as API } from '../../config/api';
import Modal from '../../components/Modal/Modal';
import { ConfirmDialog, Empty, ErrorNotice, Icon } from './CurriculumUI';
import { errorText, unpack } from './curriculumData';
const CurriculumPdf = lazy(() => import('./CurriculumPdf'));

export function useBlob(endpoint, mime) {
  const [url, setUrl] = useState(''), [loading, setLoading] = useState(!!endpoint), [error, setError] = useState(''), [version, setVersion] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); let objectUrl;
    setUrl(''); setError(''); setLoading(!!endpoint);
    if (endpoint) apiClient.get(endpoint, { responseType: 'blob', signal: abort.signal }).then(response => {
      if (abort.signal.aborted) return;
      objectUrl = URL.createObjectURL(mime ? new Blob([response.data], { type: mime }) : response.data); setUrl(objectUrl);
    }).catch(() => { if (!abort.signal.aborted) setError('Не удалось загрузить файл.'); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => { abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [endpoint, mime, version]);
  return { url, loading, error, retry: () => setVersion(n => n + 1) };
}
function Photo({ endpoint, alt, onOpen }) {
  const { url, loading, error, retry } = useBlob(endpoint);
  return <div className="cp-photo">{loading ? <span role="status">Загрузка…</span> : error ? <button type="button" onClick={retry}>Повторить загрузку</button> : url && <button type="button" aria-label={`Увеличить: ${alt}`} onClick={() => onOpen({ url, name: alt })}><img src={url} alt={alt} /></button>}</div>;
}
function Zoom({ image, onClose }) { return image && <Modal isOpen title={image.name} size="curriculum-image" onClose={onClose}><img className="cp-zoom" src={image.url} alt={image.name} /></Modal>; }
export function InstructionPane({ id, name }) {
  const { url, loading, error, retry } = useBlob(id ? API.INSTRUCTION_PDF(id) : null, 'application/pdf');
  const [meta, setMeta] = useState(null), [zoom, setZoom] = useState(null);
  useEffect(() => { if (!id) return; const abort = new AbortController(); setMeta(null); apiClient.get(API.INSTRUCTION(id), { signal: abort.signal }).then(unpack).then(data => { if (!abort.signal.aborted) setMeta(data); }).catch(() => {}); return () => abort.abort(); }, [id]);
  if (!id) return <Empty title="Инструкция не прикреплена" icon="file"><p>Описание и изображения занятия доступны на вкладке «Занятие».</p></Empty>;
  return <div className="cp-instruction-pane"><div className="cp-pdf-toolbar"><span className="cp-document-icon"><Icon name="file" /></span><div><strong>{meta?.name || name || 'Инструкция'}</strong><small>{meta?.section_name || 'Материалы для сборки'} · PDF</small></div>{url && <div className="cp-pdf-links"><a className="od-control" href={url} target="_blank" rel="noreferrer"><Icon name="external" />Открыть PDF</a><a className="od-icon-btn" href={url} download={meta?.pdf_filename || `${name || 'Инструкция'}.pdf`} aria-label="Скачать инструкцию" title="Скачать инструкцию"><Icon name="download" /></a></div>}</div>
    {(meta?.description || meta?.has_photo) && <details className="cp-instruction-about"><summary>О конструкции{meta?.has_photo ? ' и фото' : ''}</summary>{meta?.description && <p className="cp-prose">{meta.description}</p>}{!!meta?.has_photo && <Photo endpoint={API.INSTRUCTION_PHOTO(id)} alt={meta.name || name} onOpen={setZoom} />}</details>}
    {loading && <div className="cp-file-loading" role="status"><Icon name="file" />Загружаем инструкцию…</div>}{error && <ErrorNotice onRetry={retry}>Инструкция недоступна. Попробуйте загрузить её снова.</ErrorNotice>}{url && <Suspense fallback={<div className="cp-file-loading" role="status">Открываем документ…</div>}><CurriculumPdf url={url} name={name || 'Инструкция'} /></Suspense>}
    <Zoom image={zoom} onClose={() => setZoom(null)} />
  </div>;
}
export function ImageGallery({ lesson, editable, onUpdated, onBusy }) {
  const [error, setError] = useState(''), [saving, setSaving] = useState(false), [remove, setRemove] = useState(null), [zoom, setZoom] = useState(null), busy = useRef(false);
  const upload = async e => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file || busy.current) return;
    setError(''); if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { setError('Выберите изображение размером до 5 МБ.'); return; }
    busy.current = true; setSaving(true); onBusy(true);
    try { const body = new FormData(); body.append('image', file); unpack(await apiClient.post(API.CURRICULUM_LESSON_IMAGES(lesson.id), body)); await onUpdated(); } catch (e) { setError(errorText(e)); } finally { busy.current = false; setSaving(false); onBusy(false); }
  };
  const destroy = async () => { onBusy(true); try { unpack(await apiClient.delete(API.CURRICULUM_LESSON_IMAGE(remove.id))); await onUpdated(); } finally { onBusy(false); } };
  return <section className="cp-gallery-section"><div className="cp-section-heading"><h3>Изображения <span>{lesson.images?.length || 0}</span></h3>{editable && <label className={`od-control cp-upload ${saving ? 'disabled' : ''}`}><Icon name="plus" />{saving ? 'Загружаем…' : 'Добавить'}<input type="file" accept="image/*" aria-label="Добавить изображение" disabled={saving} onChange={upload} /></label>}</div>
    {error && <ErrorNotice>{error}</ErrorNotice>}{!lesson.images?.length ? <p className="cp-muted">{editable ? 'Фото сборки и материалы к занятию. До 5 МБ на изображение.' : 'Изображения к занятию пока не добавлены.'}</p> : <div className="cp-gallery">{lesson.images.map(image => <figure key={image.id}><Photo endpoint={API.CURRICULUM_LESSON_IMAGE(image.id)} alt={image.filename || lesson.name} onOpen={setZoom} /><figcaption><span>{image.filename || lesson.name}</span>{editable && <button type="button" className="od-icon-btn" aria-label={`Удалить изображение: ${image.filename || image.id}`} disabled={saving} onClick={() => setRemove(image)}><Icon name="trash" /></button>}</figcaption></figure>)}</div>}
    {remove && <ConfirmDialog title="Удалить изображение?" onClose={() => setRemove(null)} onConfirm={destroy}><p>{remove.filename || 'Изображение'} будет удалено из материалов занятия.</p></ConfirmDialog>}
    <Zoom image={zoom} onClose={() => setZoom(null)} />
  </section>;
}
