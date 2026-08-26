import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout/Layout';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import './CurriculumPlans.css';

const emptyPlan = { name: '', description: '' };
const emptyModule = { name: '', description: '' };
const emptyLesson = {
  name: '', internal_description: '', external_description: '', format_id: '',
  instruction_id: '', module_id: '',
};

const CurriculumPlans = () => {
  const { isOwner } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [plan, setPlan] = useState(null);
  const [formats, setFormats] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [lessonComments, setLessonComments] = useState([]);
  const [instructionComments, setInstructionComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentTarget, setCommentTarget] = useState('lesson');
  const [imageUrls, setImageUrls] = useState({});
  const [formatsOpen, setFormatsOpen] = useState(false);
  const [formatDialog, setFormatDialog] = useState(null);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [plansRes, formatsRes, instructionsRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.CURRICULUM_PLANS),
        apiClient.get(`${API_ENDPOINTS.LESSON_FORMATS}${isOwner ? '?include_inactive=1' : ''}`),
        apiClient.get(`${API_ENDPOINTS.INSTRUCTIONS}?limit=500&offset=0`),
      ]);
      const nextPlans = plansRes.data?.data?.items || [];
      setPlans(nextPlans);
      setFormats(formatsRes.data?.data?.items || []);
      setInstructions(instructionsRes.data?.data?.items || []);
      setSelectedId((current) => current || nextPlans[0]?.id || null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Не удалось загрузить учебные планы');
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  const loadPlan = useCallback(async (id) => {
    if (!id) { setPlan(null); return; }
    try {
      const response = await apiClient.get(API_ENDPOINTS.CURRICULUM_PLAN(id));
      setPlan(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Не удалось открыть учебный план');
    }
  }, []);

  useEffect(() => { loadLists(); }, [loadLists]);
  useEffect(() => { loadPlan(selectedId); }, [selectedId, loadPlan]);

  const refresh = async (preferredId = selectedId) => {
    await loadLists();
    if (preferredId) {
      setSelectedId(preferredId);
      await loadPlan(preferredId);
    }
  };

  const openDialog = (type, data = null) => {
    setError('');
    setDialog({ type, data });
    if (type === 'plan') setForm(data ? { name: data.name, description: data.description || '' } : { ...emptyPlan });
    if (type === 'module') setForm(data ? { name: data.name, description: data.description || '' } : { ...emptyModule });
    if (type === 'lesson') setForm(data ? {
      name: data.name || '', internal_description: data.internal_description || '',
      external_description: data.external_description || '', format_id: String(data.format_id || ''),
      instruction_id: String(data.instruction_id || ''), module_id: String(data.module_id || ''),
    } : { ...emptyLesson, module_id: String(dialog?.data?.moduleId || '') });
  };

  const openNewLesson = (moduleId) => {
    setDialog({ type: 'lesson', data: null });
    setForm({ ...emptyLesson, module_id: String(moduleId) });
  };

  const saveDialog = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (dialog.type === 'plan') {
        if (dialog.data) await apiClient.put(API_ENDPOINTS.CURRICULUM_PLAN(dialog.data.id), form);
        else {
          const response = await apiClient.post(API_ENDPOINTS.CURRICULUM_PLANS, form);
          setSelectedId(response.data.data.id);
        }
      }
      if (dialog.type === 'module') {
        if (dialog.data) await apiClient.put(API_ENDPOINTS.CURRICULUM_MODULE(dialog.data.id), form);
        else await apiClient.post(API_ENDPOINTS.CURRICULUM_MODULES(plan.id), form);
      }
      if (dialog.type === 'lesson') {
        const payload = { ...form, format_id: Number(form.format_id), instruction_id: form.instruction_id ? Number(form.instruction_id) : null };
        if (dialog.data) await apiClient.put(API_ENDPOINTS.CURRICULUM_LESSON(dialog.data.id), payload);
        else await apiClient.post(API_ENDPOINTS.CURRICULUM_LESSONS(Number(form.module_id)), payload);
      }
      setDialog(null);
      await refresh(plan?.id);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (kind, item) => {
    if (!window.confirm(`Удалить «${item.name}»?`)) return;
    setError('');
    try {
      if (kind === 'plan') await apiClient.delete(API_ENDPOINTS.CURRICULUM_PLAN(item.id));
      if (kind === 'module') await apiClient.delete(API_ENDPOINTS.CURRICULUM_MODULE(item.id));
      if (kind === 'lesson') await apiClient.delete(API_ENDPOINTS.CURRICULUM_LESSON(item.id));
      if (kind === 'plan') { setSelectedId(null); setPlan(null); await loadLists(); }
      else await refresh(plan.id);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Удаление невозможно');
    }
  };

  const reorder = async (kind, parent, items, index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    try {
      if (kind === 'modules') await apiClient.put(API_ENDPOINTS.CURRICULUM_MODULES_REORDER(parent), { module_ids: next.map((x) => x.id) });
      else await apiClient.put(API_ENDPOINTS.CURRICULUM_LESSONS_REORDER(parent), { lesson_ids: next.map((x) => x.id) });
      await loadPlan(plan.id);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Нельзя изменить порядок');
    }
  };

  const loadComments = useCallback(async (lesson) => {
    const lessonResponse = await apiClient.get(API_ENDPOINTS.CURRICULUM_LESSON_COMMENTS(lesson.id));
    setLessonComments(lessonResponse.data?.data?.items || []);
    if (lesson.instruction_id) {
      const instructionResponse = await apiClient.get(API_ENDPOINTS.INSTRUCTION_COMMENTS(lesson.instruction_id));
      setInstructionComments(instructionResponse.data?.data?.items || []);
    } else setInstructionComments([]);
  }, []);

  const openDetail = async (lesson) => {
    setDetail(lesson);
    setCommentText('');
    setCommentTarget('lesson');
    try { await loadComments(lesson); } catch (_) {}
  };

  useEffect(() => {
    let active = true;
    const urls = {};
    const loadImages = async () => {
      if (!detail?.images?.length) { setImageUrls({}); return; }
      await Promise.all(detail.images.map(async (image) => {
        try {
          const response = await apiClient.get(API_ENDPOINTS.CURRICULUM_LESSON_IMAGE(image.id), { responseType: 'blob' });
          urls[image.id] = URL.createObjectURL(response.data);
        } catch (_) {}
      }));
      if (active) setImageUrls(urls);
      else Object.values(urls).forEach(URL.revokeObjectURL);
    };
    loadImages();
    return () => { active = false; Object.values(urls).forEach(URL.revokeObjectURL); };
  }, [detail]);

  const addComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    const endpoint = commentTarget === 'instruction'
      ? API_ENDPOINTS.INSTRUCTION_COMMENTS(detail.instruction_id)
      : API_ENDPOINTS.CURRICULUM_LESSON_COMMENTS(detail.id);
    await apiClient.post(endpoint, { text: commentText.trim() });
    setCommentText('');
    await loadComments(detail);
    await loadPlan(plan.id);
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !detail) return;
    const data = new FormData();
    data.append('image', file);
    try {
      await apiClient.post(API_ENDPOINTS.CURRICULUM_LESSON_IMAGES(detail.id), data);
      await loadPlan(plan.id);
      setDetail(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Не удалось загрузить изображение');
    }
  };

  const deleteImage = async (imageId) => {
    await apiClient.delete(API_ENDPOINTS.CURRICULUM_LESSON_IMAGE(imageId));
    setDetail(null);
    await loadPlan(plan.id);
  };

  const openPdf = async () => {
    if (!detail?.instruction_id) return;
    try {
      const response = await apiClient.get(API_ENDPOINTS.INSTRUCTION_PDF(detail.instruction_id), { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { setError('Инструкция удалена или недоступна'); }
  };

  const saveFormat = async (event) => {
    event.preventDefault();
    const name = formatDialog?.name?.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      if (formatDialog.id) await apiClient.put(API_ENDPOINTS.LESSON_FORMAT(formatDialog.id), { name });
      else await apiClient.post(API_ENDPOINTS.LESSON_FORMATS, { name });
      setFormatDialog(null);
      await loadLists();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Не удалось сохранить формат');
    } finally {
      setSaving(false);
    }
  };

  const removeFormat = async (format) => {
    if (!window.confirm(`Убрать формат «${format.name}»? Используемый формат будет скрыт, но сохранится в уроках.`)) return;
    await apiClient.delete(API_ENDPOINTS.LESSON_FORMAT(format.id));
    await loadLists();
  };

  const activeFormats = useMemo(() => formats.filter((item) => item.is_active === 1 || item.is_active === true), [formats]);

  return (
    <Layout>
      <div className="curriculum-page">
        <header className="curriculum-header">
          <div><h1>Учебные планы</h1><p>Модули, уроки, материалы и комментарии преподавателей</p></div>
          {isOwner && <div className="curriculum-actions"><Button variant="secondary" onClick={() => setFormatsOpen(true)}>Форматы уроков</Button><Button onClick={() => openDialog('plan')}>Создать план</Button></div>}
        </header>
        {error && <div className="curriculum-error">{error}</div>}
        {loading ? <LoadingSpinner /> : (
          <div className="curriculum-layout">
            <aside className="curriculum-plans-list">
              {plans.length === 0 && <div className="curriculum-empty">Планов пока нет</div>}
              {plans.map((item) => <button key={item.id} className={`curriculum-plan-nav ${String(item.id) === String(selectedId) ? 'active' : ''}`} onClick={() => setSelectedId(item.id)}>
                <strong>{item.name}</strong><span>{item.module_count} мод. · {item.lesson_count} ур.</span>
              </button>)}
            </aside>
            <section className="curriculum-workspace">
              {!plan ? <div className="curriculum-empty">Выберите учебный план</div> : <>
                <div className="curriculum-plan-header">
                  <div><h2>{plan.name}</h2><p>{plan.description || 'Описание не заполнено'}</p><span>{plan.module_count} модулей · {plan.lesson_count} уроков</span></div>
                  {isOwner && <div className="curriculum-actions"><Button size="small" variant="secondary" onClick={() => openDialog('plan', plan)}>Редактировать</Button><Button size="small" variant="danger" onClick={() => remove('plan', plan)}>Удалить</Button></div>}
                </div>
                {isOwner && <div className="curriculum-toolbar"><Button size="small" onClick={() => openDialog('module')}>Добавить модуль</Button></div>}
                <div className="curriculum-modules">
                  {plan.modules.map((module, moduleIndex) => <article className="curriculum-module" key={module.id}>
                    <div className="curriculum-module-header"><div><span className="curriculum-number">Модуль {moduleIndex + 1}</span><h3>{module.name}</h3><p>{module.description}</p><span>{module.lesson_count} уроков</span></div>
                      {isOwner && <div className="curriculum-actions">
                        <Button size="small" variant="secondary" onClick={() => reorder('modules', plan.id, plan.modules, moduleIndex, -1)} disabled={moduleIndex === 0}>↑</Button>
                        <Button size="small" variant="secondary" onClick={() => reorder('modules', plan.id, plan.modules, moduleIndex, 1)} disabled={moduleIndex === plan.modules.length - 1}>↓</Button>
                        <Button size="small" variant="secondary" onClick={() => openDialog('module', module)}>Изменить</Button>
                        <Button size="small" variant="danger" onClick={() => remove('module', module)}>Удалить</Button>
                      </div>}
                    </div>
                    <div className="curriculum-lessons">
                      {module.lessons.map((lesson, lessonIndex) => <div className={`curriculum-lesson ${lesson.is_used ? 'locked' : ''}`} key={lesson.id}>
                        <button className="curriculum-lesson-main" onClick={() => openDetail(lesson)}><span className="curriculum-lesson-index">{lessonIndex + 1}</span><span><strong>{lesson.name}</strong><small>{lesson.format_name}{lesson.instruction_name ? ` · ${lesson.instruction_name}` : ' · без инструкции'}</small></span></button>
                        <div className="curriculum-badges"><span>💬 {lesson.lesson_comment_count}</span><span>🛠 {lesson.instruction_comment_count}</span>{lesson.is_used ? <span>🔒 Пройден</span> : null}</div>
                        {isOwner && !lesson.is_used && <div className="curriculum-actions">
                          <Button size="small" variant="secondary" onClick={() => reorder('lessons', module.id, module.lessons, lessonIndex, -1)} disabled={lessonIndex === 0}>↑</Button>
                          <Button size="small" variant="secondary" onClick={() => reorder('lessons', module.id, module.lessons, lessonIndex, 1)} disabled={lessonIndex === module.lessons.length - 1}>↓</Button>
                          <Button size="small" variant="secondary" onClick={() => openDialog('lesson', lesson)}>Изменить</Button>
                          <Button size="small" variant="danger" onClick={() => remove('lesson', lesson)}>Удалить</Button>
                        </div>}
                      </div>)}
                      {isOwner && <Button size="small" variant="secondary" onClick={() => openNewLesson(module.id)}>+ Добавить урок</Button>}
                    </div>
                  </article>)}
                </div>
              </>}
            </section>
          </div>
        )}
      </div>

      <Modal isOpen={!!dialog} onClose={() => setDialog(null)} title={dialog?.data ? 'Редактирование' : 'Создание'} size="large">
        <form className="curriculum-form" onSubmit={saveDialog}>
          <Input label="Название" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {dialog?.type === 'lesson' ? <>
            <label>Внутреннее описание<textarea value={form.internal_description || ''} onChange={(e) => setForm({ ...form, internal_description: e.target.value })} /></label>
            <label>Внешнее описание<textarea value={form.external_description || ''} onChange={(e) => setForm({ ...form, external_description: e.target.value })} /></label>
            <Select label="Модуль" value={form.module_id || ''} onChange={(e) => setForm({ ...form, module_id: e.target.value })} options={(plan?.modules || []).map((m) => ({ value: m.id, label: m.name }))} required />
            <Select label="Формат" value={form.format_id || ''} onChange={(e) => setForm({ ...form, format_id: e.target.value })} options={activeFormats.map((f) => ({ value: f.id, label: f.name }))} required />
            <Select label="Инструкция" value={form.instruction_id || ''} onChange={(e) => setForm({ ...form, instruction_id: e.target.value })} options={instructions.map((i) => ({ value: i.id, label: i.name }))} placeholder="Без инструкции" />
          </> : <label>Описание<textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>}
          <div className="curriculum-actions"><Button variant="secondary" onClick={() => setDialog(null)}>Отмена</Button><Button type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button></div>
        </form>
      </Modal>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail?.name} size="large">
        {detail && <div className="curriculum-detail">
          <div className="curriculum-detail-meta"><span>{detail.format_name}</span><span>{detail.module_name}</span>{detail.is_used ? <span>🔒 Пройден</span> : null}</div>
          <h4>Для преподавателей</h4><p>{detail.internal_description || 'Описание не заполнено'}</p>
          <h4>Внешнее описание</h4><p>{detail.external_description || 'Описание не заполнено'}</p>
          <div className="curriculum-gallery">{detail.images?.map((image) => <div key={image.id}><img src={imageUrls[image.id]} alt={image.filename || detail.name} />{isOwner && !detail.is_used && <button onClick={() => deleteImage(image.id)}>Удалить</button>}</div>)}</div>
          {isOwner && !detail.is_used && <label className="curriculum-upload">Добавить изображение<input type="file" accept="image/*" onChange={uploadImage} /></label>}
          <div className="curriculum-instruction"><strong>{detail.instruction_name || 'Инструкция не прикреплена или удалена'}</strong>{detail.instruction_id && <Button size="small" variant="secondary" onClick={openPdf}>Открыть PDF</Button>}</div>
          <div className="curriculum-comment-tabs"><button className={commentTarget === 'lesson' ? 'active' : ''} onClick={() => setCommentTarget('lesson')}>К уроку ({lessonComments.length})</button><button disabled={!detail.instruction_id} className={commentTarget === 'instruction' ? 'active' : ''} onClick={() => setCommentTarget('instruction')}>К конструкции ({instructionComments.length})</button></div>
          <div className="curriculum-comments">{(commentTarget === 'lesson' ? lessonComments : instructionComments).map((comment) => <div key={comment.id}><strong>{comment.author_name}</strong><span>{new Date(comment.created_at).toLocaleString('ru-RU')}</span><p>{comment.text}</p></div>)}</div>
          <form className="curriculum-comment-form" onSubmit={addComment}><textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Оставить комментарий" /><Button type="submit">Отправить</Button></form>
        </div>}
      </Modal>

      <Modal isOpen={formatsOpen} onClose={() => setFormatsOpen(false)} title="Форматы уроков">
        <div className="curriculum-formats">
          {formats.map((format) => <div key={format.id} className={!format.is_active ? 'inactive' : ''}><span>{format.name}{!format.is_active ? ' · скрыт' : ''}</span><div className="curriculum-actions"><Button size="small" variant="secondary" onClick={() => setFormatDialog({ id: format.id, name: format.name })}>Переименовать</Button><Button size="small" variant="danger" onClick={() => removeFormat(format)}>Убрать</Button></div></div>)}
          <Button onClick={() => setFormatDialog({ id: null, name: '' })}>Добавить формат</Button>
        </div>
      </Modal>

      <Modal isOpen={!!formatDialog} onClose={() => setFormatDialog(null)} title={formatDialog?.id ? 'Переименование формата' : 'Новый формат урока'}>
        <form className="curriculum-form" onSubmit={saveFormat}>
          <Input label="Название" value={formatDialog?.name || ''} onChange={(event) => setFormatDialog((current) => ({ ...current, name: event.target.value }))} required autoFocus />
          <div className="curriculum-actions"><Button variant="secondary" onClick={() => setFormatDialog(null)}>Отмена</Button><Button type="submit" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button></div>
        </form>
      </Modal>
    </Layout>
  );
};

export default CurriculumPlans;
