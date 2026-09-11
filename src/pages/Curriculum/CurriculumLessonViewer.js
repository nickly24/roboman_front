import React, { useEffect, useRef, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import apiClient from '../../services/api';
import { API_ENDPOINTS as API } from '../../config/api';
import { Empty, ErrorNotice, Icon, Tabs } from './CurriculumUI';
import { ImageGallery, InstructionPane } from './CurriculumMaterials';
import { errorText, isUsed, unpack } from './curriculumData';

function Comments({ lesson, onUpdated, onBusy }) {
  const [target, setTarget] = useState('lesson'), [comments, setComments] = useState([]), [drafts, setDrafts] = useState({ lesson: '', instruction: '' }), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [loadError, setLoadError] = useState(''), [retry, setRetry] = useState(0);
  const busy = useRef(false), endpoint = target === 'lesson' ? API.CURRICULUM_LESSON_COMMENTS(lesson.id) : API.INSTRUCTION_COMMENTS(lesson.instruction_id);
  useEffect(() => {
    const abort = new AbortController(); setComments([]); setLoading(true); setLoadError('');
    apiClient.get(endpoint, { signal: abort.signal }).then(unpack).then(data => { if (!abort.signal.aborted) setComments(data.items || []); }).catch(e => { if (!abort.signal.aborted) setLoadError(errorText(e)); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [endpoint, retry]);
  const send = async e => {
    e.preventDefault(); const text = drafts[target].trim(); if (!text || busy.current) return;
    busy.current = true; setSaving(true); onBusy(true); setError('');
    try { const comment = unpack(await apiClient.post(endpoint, { text })); setComments(old => [...old, comment]); setDrafts(old => ({ ...old, [target]: '' })); onUpdated(); } catch (e) { setError(errorText(e)); } finally { busy.current = false; setSaving(false); onBusy(false); }
  };
  return <div className="cp-discussion"><div className="cp-comment-target" role="group" aria-label="К чему комментарий"><button disabled={saving} aria-pressed={target === 'lesson'} onClick={() => { setTarget('lesson'); setError(''); }}>К занятию</button>{lesson.instruction_id && <button disabled={saving} aria-pressed={target === 'instruction'} onClick={() => { setTarget('instruction'); setError(''); }}>К конструкции</button>}</div><p className="cp-muted">{target === 'lesson' ? 'Заметки и опыт преподавателей по проведению этого занятия.' : `Обсуждение конструкции «${lesson.instruction_name || 'Инструкция'}» общее для всех занятий с этой инструкцией.`}</p>
    {loading ? <p className="cp-loading" role="status">Загружаем комментарии…</p> : loadError ? <ErrorNotice onRetry={() => setRetry(n => n + 1)}>{loadError}</ErrorNotice> : !comments.length ? <Empty title="Комментариев пока нет" icon="message" /> : <div className="cp-comments">{comments.map(comment => <article key={comment.id}><span className="cp-comment-avatar">{(comment.author_name || '?').slice(0, 1).toUpperCase()}</span><div><header><strong>{comment.author_name}</strong><time>{new Date(comment.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></header><p>{comment.text}</p></div></article>)}</div>}
    <form className="cp-comment-form" onSubmit={send}><label className="cp-field">{target === 'lesson' ? 'Комментарий к занятию' : 'Комментарий к конструкции'}<textarea value={drafts[target]} disabled={saving} onChange={e => setDrafts({ ...drafts, [target]: e.target.value })} placeholder="Что получилось, что стоит учесть на следующем занятии…" /></label>{error && <ErrorNotice>{error}</ErrorNotice>}<button className="od-primary-btn" type="submit" disabled={saving || loading || !!loadError || !drafts[target].trim()}><Icon name="message" />{saving ? 'Отправляем…' : 'Отправить комментарий'}</button></form>
  </div>;
}
export default function CurriculumLessonViewer({ lesson, index, total, initialTab = 'lesson', isOwner, onClose, onEdit, onNavigate, onUpdated }) {
  const [tab, setTab] = useState(initialTab), [busy, setBusy] = useState(false);
  return <Modal isOpen title={lesson.name} size="curriculum-viewer" onClose={() => { if (!busy) onClose(); }}><div className="cp-lesson-viewer">
    <div className="cp-viewer-context"><span className="cp-format-pill">{lesson.format_name}</span><span>{lesson.module_name}</span><div className="cp-lesson-pager"><button className="od-icon-btn" aria-label="Предыдущее занятие" title="Предыдущее занятие" disabled={busy || index <= 0} onClick={() => onNavigate(-1, tab)}><Icon name="left" /></button><span>{index + 1} / {total}</span><button className="od-icon-btn" aria-label="Следующее занятие" title="Следующее занятие" disabled={busy || index >= total - 1} onClick={() => onNavigate(1, tab)}><Icon name="right" /></button></div></div>
    <div className={`cp-viewer-tabs ${busy ? 'cp-busy' : ''}`}><Tabs label="Содержимое занятия" value={tab} onChange={value => { if (!busy) setTab(value); }} items={[{ value: 'lesson', label: 'Занятие', icon: 'book' }, { value: 'instruction', label: 'Инструкция', icon: 'file' }, { value: 'comments', label: 'Обсуждение', icon: 'message', count: Number(lesson.lesson_comment_count || 0) + Number(lesson.instruction_comment_count || 0) }]} />{isOwner && !isUsed(lesson) && <button className="od-control" disabled={busy} onClick={onEdit}><Icon name="edit" />Редактировать</button>}</div>
    {tab === 'lesson' && <div className="cp-lesson-overview">{isUsed(lesson) && <div className="cp-lock-note"><Icon name="lock" /><span>Занятие уже использовалось в журнале. Его содержание и порядок зафиксированы; комментарии доступны.</span></div>}<section className="cp-description-block"><h3><Icon name="people" />Для преподавателя</h3><p className={`cp-prose ${!lesson.internal_description ? 'cp-muted' : ''}`}>{lesson.internal_description || 'Описание пока не заполнено.'}</p></section><details className="cp-external-description" open={lesson.internal_description ? undefined : true}><summary>Внешнее описание</summary><p className="cp-prose">{lesson.external_description || 'Внешнее описание пока не заполнено.'}</p></details>
      {lesson.instruction_id && <button className="cp-instruction-link" onClick={() => setTab('instruction')}><span className="cp-document-icon"><Icon name="file" /></span><span><strong>{lesson.instruction_name || 'Инструкция'}</strong><small>Открыть инструкцию по сборке</small></span><Icon name="right" /></button>}
      <ImageGallery lesson={lesson} editable={isOwner && !isUsed(lesson)} onUpdated={onUpdated} onBusy={setBusy} />
    </div>}
    {tab === 'instruction' && <InstructionPane id={lesson.instruction_id} name={lesson.instruction_name} />}
    {tab === 'comments' && <Comments lesson={lesson} onUpdated={onUpdated} onBusy={setBusy} />}
  </div></Modal>;
}
