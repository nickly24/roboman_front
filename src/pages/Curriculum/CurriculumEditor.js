import React, { useEffect, useRef, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import { Choice } from '../Calendar/CalendarFields';
import apiClient from '../../services/api';
import { API_ENDPOINTS as API } from '../../config/api';
import { ConfirmDialog, ErrorNotice, Icon, Tabs } from './CurriculumUI';
import { InstructionPane } from './CurriculumMaterials';
import { errorText, sameId, unpack } from './curriculumData';

export function CurriculumEditor({ kind, item, moduleId, plan, formats, onSave, onClose }) {
  const [initial] = useState(() => kind === 'lesson' ? { name: item?.name || '', internal_description: item?.internal_description || '', external_description: item?.external_description || '', module_id: String(item?.module_id || moduleId || plan?.modules[0]?.id || ''), format_id: String(item?.format_id || ''), instruction_id: String(item?.instruction_id || '') } : { name: item?.name || '', description: item?.description || '' });
  const [form, setForm] = useState(initial), [tab, setTab] = useState('internal_description'), [saving, setSaving] = useState(false), [error, setError] = useState(''), [discard, setDiscard] = useState(false), [preview, setPreview] = useState(false);
  const [instructions, setInstructions] = useState([]), [catalogError, setCatalogError] = useState(''), [catalogLoading, setCatalogLoading] = useState(kind === 'lesson'), [retry, setRetry] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    if (kind !== 'lesson') return;
    const abort = new AbortController(); setCatalogLoading(true); setCatalogError('');
    (async () => {
      try {
        const all = []; let offset = 0;
        while (!abort.signal.aborted) {
          const data = unpack(await apiClient.get(`${API.INSTRUCTIONS}?limit=500&offset=${offset}&include_branches=0`, { signal: abort.signal }));
          if (abort.signal.aborted) return;
          const items = data.items || []; all.push(...items); offset += items.length;
          if (!items.length || offset >= Number(data.total ?? offset) || items.length < 500) break;
        }
        setInstructions(all);
      } catch (e) { if (!abort.signal.aborted) setCatalogError(errorText(e)); } finally { if (!abort.signal.aborted) setCatalogLoading(false); }
    })();
    return () => abort.abort();
  }, [kind, retry]);
  const set = (field, value) => setForm(old => ({ ...old, [field]: value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const close = () => { if (busy.current) return; if (dirty) setDiscard(true); else onClose(); };
  const save = async e => {
    e.preventDefault(); if (busy.current) return; setError('');
    if (!form.name.trim() || (kind === 'lesson' && (!form.module_id || !form.format_id))) { setError('Укажите название, модуль и формат занятия.'); return; }
    busy.current = true; setSaving(true);
    try { await onSave(kind === 'lesson' ? { ...form, name: form.name.trim(), module_id: Number(form.module_id), format_id: Number(form.format_id), instruction_id: form.instruction_id ? Number(form.instruction_id) : null } : { ...form, name: form.name.trim() }); } catch (e) { setError(errorText(e)); } finally { busy.current = false; setSaving(false); }
  };
  const titles = { lesson: item ? 'Редактирование занятия' : 'Новое занятие', plan: item ? 'Редактирование плана' : 'Новый учебный план', module: item ? 'Редактирование модуля' : 'Новый модуль' };
  const options = formats.filter(f => Number(f.is_active) === 1 || sameId(f.id, item?.format_id)).map(f => ({ value: String(f.id), label: `${f.name}${Number(f.is_active) === 1 ? '' : ' · скрыт'}` }));
  if (item?.format_id && !options.some(o => sameId(o.value, item.format_id))) options.push({ value: String(item.format_id), label: item.format_name || 'Текущий формат' });
  const instructionOptions = instructions.map(i => ({ value: String(i.id), label: i.name }));
  if (item?.instruction_id && !instructionOptions.some(o => sameId(o.value, item.instruction_id))) instructionOptions.push({ value: String(item.instruction_id), label: item.instruction_name || 'Текущая инструкция' });
  const instructionName = instructionOptions.find(o => sameId(o.value, form.instruction_id))?.label;
  return <Modal isOpen title={titles[kind]} size={kind === 'lesson' ? 'curriculum-editor' : 'curriculum-form'} onClose={close}><form className="cp-form" onSubmit={save}>
    {kind !== 'plan' && <div className="cp-form-context"><Icon name="book" /><span>{plan?.name}</span></div>}
    <label className="cp-field">Название<input value={form.name} onChange={e => set('name', e.target.value)} required maxLength={255} disabled={saving} placeholder={kind === 'lesson' ? 'Например, робот-художник' : kind === 'module' ? 'Например, зубчатая передача' : 'Название учебного плана'} /></label>
    {kind === 'lesson' ? <div className="cp-editor-grid"><div className="cp-editor-text"><Tabs label="Описание занятия" value={tab} onChange={setTab} items={[{ value: 'internal_description', label: 'Для преподавателя', icon: 'people' }, { value: 'external_description', label: 'Внешнее описание', icon: 'file' }]} /><label className="cp-field"><span>{tab === 'internal_description' ? 'Ход занятия и заметки' : 'Описание для внешнего использования'}</span><textarea aria-label={tab === 'internal_description' ? 'Внутреннее описание' : 'Внешнее описание'} value={form[tab]} onChange={e => set(tab, e.target.value)} disabled={saving} placeholder={tab === 'internal_description' ? 'Как провести занятие, что объяснить детям и на что обратить внимание…' : 'Описание занятия понятным языком…'} /></label><p className="cp-muted">Оба описания сохраняются вместе с занятием.</p></div><aside className="cp-editor-links"><h3>Место в плане и материалы</h3><Choice label="Модуль" required value={form.module_id} onChange={v => set('module_id', v)} disabled={saving} options={(plan?.modules || []).map(m => ({ value: String(m.id), label: m.name }))} /><Choice label="Формат" required value={form.format_id} onChange={v => set('format_id', v)} disabled={saving} options={options} placeholder="Выберите формат" /><Choice label="Инструкция" value={form.instruction_id} onChange={v => set('instruction_id', v)} disabled={saving || catalogLoading || !!catalogError} options={instructionOptions} placeholder={catalogLoading ? 'Загружаем…' : 'Без инструкции'} emptyLabel="Без инструкции" />{catalogError && <ErrorNotice onRetry={() => setRetry(n => n + 1)}>{catalogError}</ErrorNotice>}{form.instruction_id && <button type="button" className="od-control cp-preview-button" onClick={() => setPreview(true)}><Icon name="file" />Посмотреть инструкцию</button>}{item && !sameId(form.module_id, initial.module_id) && <p className="cp-muted">Занятие переместится в конец выбранного модуля.</p>}</aside></div> : <label className="cp-field">Описание<textarea value={form.description} onChange={e => set('description', e.target.value)} disabled={saving} placeholder={kind === 'module' ? 'Чему учим в этом модуле и что важно для преподавателя…' : 'Цель и содержание учебного плана…'} /></label>}
    {error && <ErrorNotice>{error}</ErrorNotice>}{discard && <div className="cp-discard" role="alert"><span>Изменения ещё не сохранены.</span><button type="button" className="od-control" onClick={() => setDiscard(false)}>Продолжить редактирование</button><button type="button" className="cp-danger-btn" onClick={onClose}>Закрыть без сохранения</button></div>}
    <footer className="cp-form-footer"><span className="cp-muted">{dirty ? 'Есть несохранённые изменения' : ' '}</span><button type="button" className="od-control" disabled={saving} onClick={close}>Отмена</button><button type="submit" className="od-primary-btn" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button></footer>
  </form>{preview && <Modal isOpen title={instructionName || 'Инструкция'} size="curriculum-viewer" onClose={() => setPreview(false)}><InstructionPane id={form.instruction_id} name={instructionName} /></Modal>}</Modal>;
}

export function FormatManager({ formats, onChanged, onClose }) {
  const [editing, setEditing] = useState(null), [remove, setRemove] = useState(null), [saving, setSaving] = useState(false), [error, setError] = useState(''), busy = useRef(false);
  const save = async e => { e.preventDefault(); if (busy.current || !editing.name.trim()) return; busy.current = true; setSaving(true); setError(''); try { const payload = { name: editing.name.trim() }; unpack(await (editing.id ? apiClient.put(API.LESSON_FORMAT(editing.id), payload) : apiClient.post(API.LESSON_FORMATS, payload))); setEditing(null); await onChanged(); } catch (e) { setError(errorText(e)); } finally { busy.current = false; setSaving(false); } };
  return <Modal isOpen title="Форматы занятий" size="curriculum-form" onClose={() => { if (!busy.current) onClose(); }}><div className="cp-formats"><p className="cp-muted">Формат помогает различать обычные сборки, квесты и соревнования.</p>{error && <ErrorNotice>{error}</ErrorNotice>}{editing ? <form className="cp-form" onSubmit={save}><label className="cp-field">Название формата<input autoFocus required maxLength={255} disabled={saving} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></label><footer className="cp-form-footer"><button type="button" className="od-control" disabled={saving} onClick={() => { setEditing(null); setError(''); }}>Назад к форматам</button><button type="submit" className="od-primary-btn" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button></footer></form> : <><div className="cp-format-list">{formats.map(format => <div key={format.id}><span>{format.name}{!Number(format.is_active) && <small>Скрыт</small>}</span><button type="button" className="od-icon-btn" aria-label={`Переименовать формат: ${format.name}`} title="Переименовать" onClick={() => setEditing({ id: format.id, name: format.name })}><Icon name="edit" /></button>{!!Number(format.is_active) && <button type="button" className="od-icon-btn" aria-label={`Убрать формат: ${format.name}`} title="Убрать формат" onClick={() => setRemove(format)}><Icon name="trash" /></button>}</div>)}</div><button type="button" className="od-control" onClick={() => setEditing({ name: '' })}><Icon name="plus" />Добавить формат</button></>}{remove && <ConfirmDialog title="Убрать формат?" action="Убрать формат" onClose={() => setRemove(null)} onConfirm={async () => { unpack(await apiClient.delete(API.LESSON_FORMAT(remove.id))); await onChanged(); }}><p>«{remove.name}» исчезнет из выбора для новых занятий. В существующих занятиях использованный формат сохранится.</p></ConfirmDialog>}</div></Modal>;
}
