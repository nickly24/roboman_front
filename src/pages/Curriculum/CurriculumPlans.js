import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import { Choice } from '../Calendar/CalendarFields';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
import { API_ENDPOINTS as API } from '../../config/api';
import { ActionMenu, ConfirmDialog, Empty, ErrorNotice, Icon } from './CurriculumUI';
import { CurriculumEditor, FormatManager } from './CurriculumEditor';
import CurriculumLessonViewer from './CurriculumLessonViewer';
import { canMove, errorText, isUsed, lessonCount, matchesLesson, moduleCount, moduleUsed, sameId, sequence, unpack } from './curriculumData';
import '../Dashboard/OwnerDashboard.css';
import '../Calendar/Calendar.css';
import './CurriculumPlans.css';

export default function CurriculumPlans() {
  const { isOwner } = useAuth();
  const [params, setParams] = useSearchParams();
  const [plans, setPlans] = useState([]), [formats, setFormats] = useState([]), [plan, setPlan] = useState(null);
  const [listLoading, setListLoading] = useState(true), [planLoading, setPlanLoading] = useState(false), [listError, setListError] = useState(''), [planError, setPlanError] = useState(''), [formatError, setFormatError] = useState('');
  const [listVersion, setListVersion] = useState(0), [planVersion, setPlanVersion] = useState(0), [formatVersion, setFormatVersion] = useState(0);
  const [search, setSearch] = useState(''), [format, setFormat] = useState(''), [material, setMaterial] = useState('');
  const [editor, setEditor] = useState(null), [removing, setRemoving] = useState(null), [formatsOpen, setFormatsOpen] = useState(false), [notice, setNotice] = useState(''), [actionError, setActionError] = useState(''), [moving, setMoving] = useState(false);
  const busy = useRef(false);
  const selectedId = params.get('plan') || String(plans[0]?.id || '');
  const selectedModule = params.get('module') || '';
  useEffect(() => {
    const abort = new AbortController(); setListLoading(true); setListError('');
    apiClient.get(API.CURRICULUM_PLANS, { signal: abort.signal }).then(unpack).then(data => { if (!abort.signal.aborted) setPlans(data.items || []); }).catch(e => { if (!abort.signal.aborted) setListError(errorText(e)); }).finally(() => { if (!abort.signal.aborted) setListLoading(false); });
    return () => abort.abort();
  }, [listVersion]);
  useEffect(() => {
    const abort = new AbortController(); setFormatError('');
    apiClient.get(`${API.LESSON_FORMATS}${isOwner ? '?include_inactive=1' : ''}`, { signal: abort.signal }).then(unpack).then(data => { if (!abort.signal.aborted) setFormats(data.items || []); }).catch(e => { if (!abort.signal.aborted) setFormatError(errorText(e)); });
    return () => abort.abort();
  }, [formatVersion, isOwner]);
  useEffect(() => {
    if (!selectedId) { setPlan(null); return; }
    const abort = new AbortController(); setPlanLoading(true); setPlanError(''); setPlan(old => sameId(old?.id, selectedId) ? old : null);
    apiClient.get(API.CURRICULUM_PLAN(selectedId), { signal: abort.signal }).then(unpack).then(data => { if (!abort.signal.aborted) setPlan(data); }).catch(e => { if (!abort.signal.aborted) setPlanError(errorText(e)); }).finally(() => { if (!abort.signal.aborted) setPlanLoading(false); });
    return () => abort.abort();
  }, [selectedId, planVersion]);
  const lessons = useMemo(() => sequence(plan), [plan]);
  const matching = useMemo(() => lessons.filter(l => matchesLesson(l, { search, format, material })), [lessons, search, format, material]);
  const visible = matching.filter(l => !selectedModule || sameId(l.module_id, selectedModule));
  const groups = (plan?.modules || []).filter(m => (!selectedModule || sameId(m.id, selectedModule)) && ((!search && !format && !material) || visible.some(l => sameId(l.module_id, m.id))));
  const lessonIndex = lessons.findIndex(l => sameId(l.id, params.get('lesson'))), selectedLesson = lessons[lessonIndex];
  const resetFilters = () => { setSearch(''); setFormat(''); setMaterial(''); };
  const selectPlan = id => { resetFilters(); setActionError(''); setNotice(''); setParams({ plan: id }); };
  const selectModule = id => setParams({ plan: selectedId, ...(id ? { module: id } : {}) });
  const openLesson = (lesson, view = 'lesson', replace = false) => { const next = new URLSearchParams(params); next.set('plan', selectedId); next.set('lesson', lesson.id); next.set('view', view); setParams(next, { replace }); };
  const closeLesson = () => { const next = new URLSearchParams(params); next.delete('lesson'); next.delete('view'); setParams(next); };
  const refresh = () => { setPlanVersion(n => n + 1); setListVersion(n => n + 1); };
  const save = async payload => {
    const { kind, item } = editor; let saved;
    if (kind === 'plan') saved = unpack(await (item ? apiClient.put(API.CURRICULUM_PLAN(item.id), payload) : apiClient.post(API.CURRICULUM_PLANS, payload)));
    if (kind === 'module') unpack(await (item ? apiClient.put(API.CURRICULUM_MODULE(item.id), payload) : apiClient.post(API.CURRICULUM_MODULES(plan.id), payload)));
    if (kind === 'lesson') unpack(await (item ? apiClient.put(API.CURRICULUM_LESSON(item.id), payload) : apiClient.post(API.CURRICULUM_LESSONS(payload.module_id), payload)));
    setEditor(null); setNotice('Изменения сохранены'); refresh();
    if (kind === 'plan' && !item) selectPlan(String(saved.id));
  };
  const remove = async () => {
    const { kind, item } = removing;
    unpack(await apiClient.delete(({ plan: API.CURRICULUM_PLAN, module: API.CURRICULUM_MODULE, lesson: API.CURRICULUM_LESSON })[kind](item.id)));
    if (kind === 'plan') { setPlans(old => old.filter(p => !sameId(p.id, item.id))); setParams({}); setPlan(null); }
    if (kind === 'module' && sameId(selectedModule, item.id)) selectModule('');
    setNotice('Удалено'); refresh();
  };
  const reorder = async (kind, parent, items, index, delta) => {
    if (busy.current || !canMove(items, index, delta, kind === 'modules')) return;
    const next = [...items]; [next[index], next[index + delta]] = [next[index + delta], next[index]];
    busy.current = true; setMoving(true); setActionError('');
    try { unpack(await apiClient.put(kind === 'modules' ? API.CURRICULUM_MODULES_REORDER(parent) : API.CURRICULUM_LESSONS_REORDER(parent), kind === 'modules' ? { module_ids: next.map(x => x.id) } : { lesson_ids: next.map(x => x.id) })); setPlan(old => kind === 'modules' ? { ...old, modules: next } : { ...old, modules: old.modules.map(m => sameId(m.id, parent) ? { ...m, lessons: next } : m) }); setNotice('Порядок обновлён'); setPlanVersion(n => n + 1); } catch (e) { setActionError(errorText(e)); } finally { busy.current = false; setMoving(false); }
  };
  const moveActions = (kind, parent, items, index) => [-1, 1].map(delta => ({ label: delta === -1 ? 'Переместить выше' : 'Переместить ниже', icon: delta === -1 ? 'up' : 'down', disabled: moving || planLoading || !canMove(items, index, delta, kind === 'modules'), hint: 'Положение использованных занятий и модулей зафиксировано', onClick: () => reorder(kind, parent, items, index, delta) }));
  const planMenu = [{ label: 'Редактировать план', icon: 'edit', onClick: () => setEditor({ kind: 'plan', item: plan }) }, { label: 'Добавить модуль', icon: 'plus', onClick: () => setEditor({ kind: 'module' }) }, { label: 'Удалить план', icon: 'trash', danger: true, disabled: isUsed(plan), hint: isUsed(plan) ? 'План уже используется' : undefined, onClick: () => setRemoving({ kind: 'plan', item: plan }) }];
  return <Layout headerTitle="Учебные планы" className="layout-curriculum"><div className="cp-page">
    <div className="cp-topline"><div className="cp-plan-picker"><span className="cp-book-mark"><Icon name="book" /></span><Choice label="Учебный план" required value={selectedId} onChange={selectPlan} options={plans.map(p => ({ value: String(p.id), label: p.name }))} placeholder={listLoading ? 'Загружаем планы…' : 'Выберите план'} disabled={listLoading && !plans.length} /></div>{isOwner && <div className="cp-top-actions"><button className="od-control" onClick={() => setFormatsOpen(true)}><Icon name="layers" />Форматы</button><button className="od-primary-btn" onClick={() => setEditor({ kind: 'plan' })}><Icon name="plus" />Новый план</button></div>}</div>
    {listError && <ErrorNotice onRetry={() => setListVersion(n => n + 1)}>{listError}</ErrorNotice>}{formatError && <ErrorNotice onRetry={() => setFormatVersion(n => n + 1)}>{formatError}</ErrorNotice>}
    {notice && <div className="cp-notice" role="status"><Icon name="check" />{notice}<button className="od-icon-btn" aria-label="Закрыть сообщение" onClick={() => setNotice('')}><Icon name="close" /></button></div>}{actionError && <ErrorNotice>{actionError}</ErrorNotice>}
    {!selectedId && !listLoading && !listError ? <Empty title="Учебных планов пока нет"><p>{isOwner ? 'Создайте план, добавьте модули и занятия.' : 'Учебные планы появятся здесь после добавления.'}</p>{isOwner && <button className="od-primary-btn" onClick={() => setEditor({ kind: 'plan' })}><Icon name="plus" />Создать первый план</button>}</Empty> : !plan && !planError ? <div className="cp-loading" role="status">Открываем учебный план…</div> : null}
    {planError && <ErrorNotice onRetry={() => setPlanVersion(n => n + 1)}>{planError}</ErrorNotice>}
    {plan && <><div className="cp-plan-heading"><div><h2>{plan.name}</h2><p>{moduleCount(plan.modules.length)}<span>·</span>{lessonCount(lessons.length)}{planLoading && <span>Обновляем…</span>}</p></div>{isOwner && <ActionMenu label="Действия с планом" items={planMenu} disabled={planLoading} />}</div>{plan.description && <details className="cp-plan-description"><summary>О плане</summary><p className="cp-prose">{plan.description}</p></details>}
      <div className="cp-browser"><aside className="cp-outline"><div className="cp-outline-heading"><span>Содержание</span>{isOwner && <button className="od-icon-btn" aria-label="Добавить модуль" title="Добавить модуль" onClick={() => setEditor({ kind: 'module' })}><Icon name="plus" /></button>}</div><nav aria-label="Модули плана"><button className={!selectedModule ? 'selected' : ''} aria-current={!selectedModule ? 'true' : undefined} onClick={() => selectModule('')}><span className="cp-module-number"><Icon name="layers" /></span><span>Все модули</span><small>{lessons.length}</small></button>{plan.modules.map((module, index) => <button key={module.id} className={sameId(module.id, selectedModule) ? 'selected' : ''} aria-current={sameId(module.id, selectedModule) ? 'true' : undefined} onClick={() => selectModule(String(module.id))}><span className="cp-module-number">{String(index + 1).padStart(2, '0')}</span><span>{module.name}</span><small>{module.lessons.length}</small></button>)}</nav></aside>
      <section className="cp-content" aria-label="Занятия учебного плана"><div className="cp-filters"><label className="cp-search"><Icon name="search" /><input aria-label="Поиск занятий в плане" placeholder="Найти занятие или инструкцию…" value={search} onChange={e => setSearch(e.target.value)} />{search && <button className="od-icon-btn" aria-label="Очистить поиск" onClick={() => setSearch('')}><Icon name="close" /></button>}</label><div className="cp-filter-selects"><Choice label="Формат занятия" placeholder="Все форматы" value={format} onChange={setFormat} options={[...new Map(lessons.map(l => [String(l.format_id), { value: String(l.format_id), label: l.format_name }])).values()]} /><Choice label="Материалы" placeholder="Все материалы" value={material} onChange={setMaterial} options={[{ value: 'with', label: 'С инструкцией' }, { value: 'without', label: 'Без инструкции' }]} /></div>{(search || format || material) && <div className="cp-filter-result"><span>Найдено: {lessonCount(visible.length)}</span><button className="od-text-btn" onClick={resetFilters}><Icon name="close" />Сбросить</button></div>}</div>
      {!groups.length ? <Empty title={plan.modules.length ? 'Ничего не найдено' : 'Добавьте первый модуль'} icon={plan.modules.length ? 'search' : 'layers'}><p>{plan.modules.length ? 'Измените фильтры или выберите другой модуль.' : 'Модули объединяют занятия по теме или механизму.'}</p>{plan.modules.length ? <button className="od-control" onClick={() => { resetFilters(); selectModule(''); }}>Показать все занятия</button> : isOwner && <button className="od-primary-btn" onClick={() => setEditor({ kind: 'module' })}>Добавить модуль</button>}</Empty> : groups.map(module => {
        const mi = plan.modules.findIndex(m => sameId(m.id, module.id)), rows = visible.filter(l => sameId(l.module_id, module.id));
        return <article className="cp-module" key={module.id}><header className="cp-module-heading"><span className="cp-module-number">{String(mi + 1).padStart(2, '0')}</span><div><h3>{module.name}</h3><small>{lessonCount(module.lessons.length)}</small></div>{isOwner && <div className="cp-module-actions"><button className="od-icon-btn cp-add-lesson" title="Добавить занятие" aria-label={`Добавить занятие в модуль: ${module.name}`} onClick={() => setEditor({ kind: 'lesson', moduleId: module.id })}><Icon name="plus" /></button><ActionMenu label={`Действия с модулем: ${module.name}`} disabled={planLoading} items={[{ label: 'Редактировать модуль', icon: 'edit', onClick: () => setEditor({ kind: 'module', item: module }) }, ...moveActions('modules', plan.id, plan.modules, mi), { label: 'Удалить модуль', icon: 'trash', danger: true, disabled: moduleUsed(module), onClick: () => setRemoving({ kind: 'module', item: module }) }]} /></div>}</header>{module.description && <details className="cp-module-description"><summary>О модуле</summary><p className="cp-prose">{module.description}</p></details>}
        <div className="cp-lesson-list">{rows.map(lesson => <div className="cp-lesson-row" key={lesson.id}><button className="cp-lesson-main" onClick={() => openLesson(lesson)}><span className="cp-lesson-number">{lesson.lesson_index}</span><span><strong>{lesson.name}</strong><small>{lesson.format_name}</small></span></button><div className="cp-row-materials">{lesson.instruction_id ? <button className="cp-pdf-shortcut" title={lesson.instruction_name} aria-label={`Инструкция: ${lesson.name}`} onClick={() => openLesson(lesson, 'instruction')}><Icon name="file" /><span>{lesson.instruction_name || 'Инструкция'}</span></button> : <span className="cp-no-instruction"><Icon name="file" />Без инструкции</span>}{Number(lesson.lesson_comment_count) + Number(lesson.instruction_comment_count) > 0 && <button className="cp-comment-shortcut" aria-label={`Обсуждение: ${lesson.name}`} onClick={() => openLesson(lesson, 'comments')}><Icon name="message" />{Number(lesson.lesson_comment_count) + Number(lesson.instruction_comment_count)}</button>}</div><div className="cp-row-actions">{isUsed(lesson) ? <span className="cp-used" title="Занятие использовалось в журнале: содержание и порядок зафиксированы" aria-label="Содержание зафиксировано"><Icon name="lock" /></span> : isOwner && <><button className="od-icon-btn cp-edit-lesson" title="Редактировать занятие" aria-label={`Редактировать занятие: ${lesson.name}`} onClick={() => setEditor({ kind: 'lesson', item: lesson })}><Icon name="edit" /></button><ActionMenu label={`Действия с занятием: ${lesson.name}`} disabled={planLoading} items={[...moveActions('lessons', module.id, module.lessons, lesson.lesson_index - 1), { label: 'Удалить занятие', icon: 'trash', danger: true, onClick: () => setRemoving({ kind: 'lesson', item: lesson }) }]} /></>}<button className="od-icon-btn cp-open-lesson" aria-label={`Открыть занятие: ${lesson.name}`} onClick={() => openLesson(lesson)}><Icon name="right" /></button></div></div>)}</div>{!rows.length && <p className="cp-module-empty">В модуле пока нет занятий.</p>}{isOwner && <button className="cp-module-footer" onClick={() => setEditor({ kind: 'lesson', moduleId: module.id })}><Icon name="plus" />Добавить занятие</button>}</article>;
      })}</section></div>
    </>}
    {selectedLesson && !editor && <CurriculumLessonViewer key={selectedLesson.id} lesson={selectedLesson} index={lessonIndex} total={lessons.length} initialTab={['lesson', 'instruction', 'comments'].includes(params.get('view')) ? params.get('view') : 'lesson'} isOwner={isOwner} onClose={closeLesson} onEdit={() => setEditor({ kind: 'lesson', item: selectedLesson })} onNavigate={(delta, tab) => { const next = lessons[lessonIndex + delta]; if (next) openLesson(next, tab, true); }} onUpdated={refresh} />}
    {editor && <CurriculumEditor key={`${editor.kind}-${editor.item?.id || 'new'}`} {...editor} plan={plan} formats={formats} onSave={save} onClose={() => setEditor(null)} />}
    {removing && <ConfirmDialog title={`Удалить ${removing.kind === 'plan' ? 'план' : removing.kind === 'module' ? 'модуль' : 'занятие'}?`} onClose={() => setRemoving(null)} onConfirm={remove}><p>«{removing.item.name}» будет удалено{removing.kind === 'plan' ? ' вместе с модулями и занятиями' : removing.kind === 'module' ? ' вместе с его занятиями' : ''}.</p></ConfirmDialog>}
    {formatsOpen && <FormatManager formats={formats} onClose={() => setFormatsOpen(false)} onChanged={() => setFormatVersion(n => n + 1)} />}
  </div></Layout>;
}
