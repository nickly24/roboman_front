import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import Button from '../../components/Button/Button';
import './Lessons.css';

const LessonForm = ({ lesson, onSuccess, onCancel }) => {
  const { isOwner, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [curriculum, setCurriculum] = useState(null);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [curriculumMode, setCurriculumMode] = useState('PLAN');
  const [previousLessonId, setPreviousLessonId] = useState('');
  const [curriculumImageUrls, setCurriculumImageUrls] = useState({});
  const [formData, setFormData] = useState({
    branch_id: lesson?.branch_id || '',
    teacher_id: lesson?.teacher_id || (isOwner ? '' : user?.profile?.id),
    starts_at: lesson?.starts_at ? new Date(lesson.starts_at).toISOString().slice(0, 16) : '',
    paid_children: lesson?.paid_children || 0,
    trial_children: lesson?.trial_children || 0,
    is_creative: lesson?.is_creative !== undefined ? lesson.is_creative : false,
    instruction_id: lesson?.instruction_id || '',
    is_fixed_salary_2000: lesson?.is_fixed_salary_2000 === true || lesson?.is_fixed_salary_2000 === 1,
  });
  const hasExistingCurriculumLink = !!lesson?.curriculum_run_id;

  useEffect(() => {
    loadBranches();
    loadInstructions();
    if (isOwner) {
      loadTeachers();
    }
  }, [isOwner]);

  useEffect(() => {
    if (lesson || !formData.branch_id) {
      setCurriculum(null);
      return;
    }
    let active = true;
    setCurriculumLoading(true);
    apiClient.get(API_ENDPOINTS.BRANCH_CURRICULUM(formData.branch_id))
      .then((response) => {
        if (!active) return;
        const progress = response.data?.data;
        setCurriculum(progress?.enabled ? progress : null);
        setCurriculumMode(progress?.is_completed ? 'OFF_PLAN_PAUSE' : 'PLAN');
        setPreviousLessonId('');
        setFormData((prev) => ({ ...prev, instruction_id: '' }));
      })
      .catch(() => { if (active) setCurriculum(null); })
      .finally(() => { if (active) setCurriculumLoading(false); });
    return () => { active = false; };
  }, [formData.branch_id, lesson]);

  const selectedCurriculumLesson = curriculumMode === 'REPEAT'
    ? curriculum?.previous_lessons?.find((item) => String(item.id) === String(previousLessonId))
    : curriculum?.current_lesson;

  useEffect(() => {
    let active = true;
    const urls = {};
    const load = async () => {
      const images = selectedCurriculumLesson?.images || [];
      await Promise.all(images.map(async (image) => {
        try {
          const response = await apiClient.get(API_ENDPOINTS.CURRICULUM_LESSON_IMAGE(image.id), { responseType: 'blob' });
          urls[image.id] = URL.createObjectURL(response.data);
        } catch (_) {}
      }));
      if (active) setCurriculumImageUrls(urls);
      else Object.values(urls).forEach(URL.revokeObjectURL);
    };
    setCurriculumImageUrls({});
    if (selectedCurriculumLesson && ['PLAN', 'REPEAT'].includes(curriculumMode)) load();
    return () => { active = false; Object.values(urls).forEach(URL.revokeObjectURL); };
  }, [selectedCurriculumLesson, curriculumMode]);

  const loadBranches = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.BRANCHES);
      if (response.data.ok) {
        const data = response.data.data;
        const branchesList = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setBranches(
          branchesList.map((b) => ({
            value: b.id,
            label: `${b.name}${b.address ? ` (${b.address})` : ''}`,
          }))
        );
      }
    } catch (error) {
      console.error('Ошибка загрузки филиалов:', error);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.TEACHERS);
      if (response.data.ok) {
        const data = response.data.data;
        const teachersList = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setTeachers(
          teachersList
            .filter((t) => t.status === 'working')
            .map((t) => ({
              value: t.id,
              label: t.full_name,
            }))
        );
      }
    } catch (error) {
      console.error('Ошибка загрузки преподавателей:', error);
    }
  };

  const loadInstructions = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.INSTRUCTIONS);
      if (response.data.ok) {
        const data = response.data.data;
        const instructionsList = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setInstructions(
          instructionsList.map((i) => ({
            value: i.id,
            label: i.name,
          }))
        );
      }
    } catch (error) {
      console.error('Ошибка загрузки инструкций:', error);
    }
  };

  const handleReprice = async () => {
    if (!lesson?.id) return;
    setError('');
    setLoading(true);
    try {
      await apiClient.post(API_ENDPOINTS.LESSON_REPRICE(lesson.id));
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка пересчёта цены');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        branch_id: parseInt(formData.branch_id),
        starts_at: new Date(formData.starts_at).toISOString(),
        paid_children: parseInt(formData.paid_children),
        trial_children: parseInt(formData.trial_children),
        is_creative: formData.is_creative,
        is_fixed_salary_2000: formData.is_fixed_salary_2000,
      };

      if (curriculum && !lesson) {
        payload.curriculum_mode = curriculumMode;
        if (curriculumMode === 'REPEAT') payload.curriculum_lesson_id = Number(previousLessonId);
        if (curriculumMode === 'PLAN') payload.curriculum_lesson_id = curriculum.current_lesson?.id;
        if (['OFF_PLAN_REPLACE', 'OFF_PLAN_PAUSE'].includes(curriculumMode)) {
          payload.instruction_id = formData.instruction_id ? Number(formData.instruction_id) : null;
        }
      } else if (!formData.is_creative && !hasExistingCurriculumLink) {
        payload.instruction_id = parseInt(formData.instruction_id);
      }

      if (isOwner && formData.teacher_id) {
        payload.teacher_id = parseInt(formData.teacher_id);
      }

      if (lesson) {
        // Редактирование - ограничения для преподавателя
        if (!isOwner) {
          // Преподаватель: дата, дети, флаг «от 10 чел.»
          await apiClient.put(API_ENDPOINTS.LESSON(lesson.id), {
            starts_at: payload.starts_at,
            paid_children: payload.paid_children,
            trial_children: payload.trial_children,
            is_fixed_salary_2000: payload.is_fixed_salary_2000,
          });
        } else {
          const updatePayload = { ...payload };
          delete updatePayload.branch_id;
          if (hasExistingCurriculumLink) {
            delete updatePayload.is_creative;
            delete updatePayload.instruction_id;
          }
          await apiClient.put(API_ENDPOINTS.LESSON(lesson.id), updatePayload);
        }
      } else {
        await apiClient.post(API_ENDPOINTS.LESSONS, payload);
      }

      onSuccess();
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Ошибка сохранения занятия');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="lesson-form">
      {error && <div className="form-error">{error}</div>}

      {isOwner && (
        <Select
          label="Преподаватель"
          value={formData.teacher_id}
          onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
          options={teachers}
          required
          disabled={false}
        />
      )}

      <Select
        label="Филиал"
        value={formData.branch_id}
        onChange={(e) => setFormData({ ...formData, branch_id: e.target.value, instruction_id: '' })}
        options={branches}
        required
        disabled={!!lesson}
      />

      {curriculumLoading && <p className="form-hint">Загрузка учебного плана…</p>}

      {hasExistingCurriculumLink && <div className="lesson-curriculum-panel">
        <strong>{lesson.curriculum_plan_name}</strong>
        <p className="form-hint">{lesson.curriculum_module_name} · {lesson.curriculum_lesson_name}</p>
        <span className="lesson-curriculum-complete">Связь с учебным планом зафиксирована</span>
      </div>}

      {!lesson && curriculum && (
        <div className="lesson-curriculum-panel">
          <div className="lesson-curriculum-heading">
            <div>
              <strong>{curriculum.plan_name}</strong>
              <span>Пройдено {curriculum.closed_lessons} из {curriculum.total_lessons}</span>
            </div>
            {curriculum.is_completed && <span className="lesson-curriculum-complete">План завершён</span>}
          </div>
          {curriculum.last_lesson && <p className="form-hint">Последний урок: {curriculum.last_lesson.module_name} · {curriculum.last_lesson.name}</p>}
          <Select
            label="Как отметить занятие"
            value={curriculumMode}
            onChange={(e) => { setCurriculumMode(e.target.value); setPreviousLessonId(''); setFormData({ ...formData, instruction_id: '' }); }}
            options={[
              ...(!curriculum.is_completed ? [{ value: 'PLAN', label: 'Текущий урок по плану' }] : []),
              ...(curriculum.previous_lessons?.length ? [{ value: 'REPEAT', label: 'Повторить предыдущий урок' }] : []),
              ...(!curriculum.is_completed ? [{ value: 'OFF_PLAN_REPLACE', label: 'Вне плана — заменить текущий урок' }] : []),
              { value: 'OFF_PLAN_PAUSE', label: 'Вне плана — не продвигаться' },
            ]}
          />
          {curriculumMode === 'REPEAT' && <Select
            label="Предыдущий урок"
            value={previousLessonId}
            onChange={(e) => setPreviousLessonId(e.target.value)}
            options={(curriculum.previous_lessons || []).map((item) => ({ value: item.id, label: `${item.module_name} · ${item.name}` }))}
            required
          />}
          {['PLAN', 'REPEAT'].includes(curriculumMode) && selectedCurriculumLesson && <div className="lesson-curriculum-current">
            <span>{selectedCurriculumLesson.module_name}</span>
            <h3>{selectedCurriculumLesson.name}</h3>
            <p>{selectedCurriculumLesson.internal_description || 'Внутреннее описание не заполнено'}</p>
            <div className="lesson-curriculum-meta"><span>{selectedCurriculumLesson.format_name}</span><span>{selectedCurriculumLesson.instruction_name || 'Инструкция удалена или не прикреплена'}</span></div>
            {Object.values(curriculumImageUrls).length > 0 && <div className="lesson-curriculum-images">{Object.entries(curriculumImageUrls).map(([id, url]) => <img key={id} src={url} alt={selectedCurriculumLesson.name} />)}</div>}
          </div>}
        </div>
      )}

      <Input
        type="datetime-local"
        label="Дата и время"
        value={formData.starts_at}
        onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
        required
      />

      <div className="form-row">
        <Input
          type="number"
          label="Платные дети"
          value={formData.paid_children}
          onChange={(e) => setFormData({ ...formData, paid_children: e.target.value })}
          min="0"
          required
        />
        <Input
          type="number"
          label="Пробные дети"
          value={formData.trial_children}
          onChange={(e) => setFormData({ ...formData, trial_children: e.target.value })}
          min="0"
          required
        />
      </div>

      {!curriculum && !hasExistingCurriculumLink && <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.is_creative}
            onChange={(e) => setFormData({ ...formData, is_creative: e.target.checked, instruction_id: e.target.checked ? '' : formData.instruction_id })}
            disabled={!!lesson && !isOwner}
          />
          <span>Творческое занятие</span>
        </label>
      </div>}

      {!curriculum && !hasExistingCurriculumLink && !formData.is_creative && (
        <Select
          label="Инструкция"
          value={formData.instruction_id}
          onChange={(e) => setFormData({ ...formData, instruction_id: e.target.value })}
          options={instructions}
          required={!formData.is_creative}
          disabled={!!lesson && !isOwner}
        />
      )}

      {curriculum && !lesson && ['OFF_PLAN_REPLACE', 'OFF_PLAN_PAUSE'].includes(curriculumMode) && (
        <Select
          label="Инструкция для внепланового занятия"
          value={formData.instruction_id}
          onChange={(e) => setFormData({ ...formData, instruction_id: e.target.value })}
          options={instructions}
          placeholder="Без инструкции"
        />
      )}

      {isOwner && lesson && (
        <div className="form-group lesson-form-salary">
          <Button type="button" variant="secondary" size="small" onClick={handleReprice} disabled={loading}>
            Пересчитать цену
          </Button>
          <p className="form-hint">Обновить price_snapshot из филиала (для выручки). Зарплата — по формуле или «бесплатное».</p>
        </div>
      )}

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.is_fixed_salary_2000}
            onChange={(e) => setFormData({ ...formData, is_fixed_salary_2000: e.target.checked })}
          />
          <span>Занятие от 10 чел.</span>
        </label>
        <p className="form-hint">Зарплата за занятие фиксированная — 2000 ₽ (количество детей вносится как обычно).</p>
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Сохранение...' : lesson ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
};

export default LessonForm;
