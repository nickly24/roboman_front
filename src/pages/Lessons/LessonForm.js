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
  const [formData, setFormData] = useState({
    branch_id: lesson?.branch_id || '',
    teacher_id: lesson?.teacher_id || (isOwner ? '' : user?.profile?.id),
    starts_at: lesson?.starts_at ? new Date(lesson.starts_at).toISOString().slice(0, 16) : '',
    paid_children: lesson?.paid_children || 0,
    trial_children: lesson?.trial_children || 0,
    is_creative: lesson?.is_creative !== undefined ? lesson.is_creative : false,
    instruction_id: lesson?.instruction_id || '',
  });

  useEffect(() => {
    loadBranches();
    loadInstructions();
    if (isOwner) {
      loadTeachers();
    }
  }, [isOwner]);

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
      };

      if (!formData.is_creative) {
        payload.instruction_id = parseInt(formData.instruction_id);
      }

      if (isOwner && formData.teacher_id) {
        payload.teacher_id = parseInt(formData.teacher_id);
      }

      if (lesson) {
        // Редактирование - ограничения для преподавателя
        if (!isOwner) {
          // Преподаватель может менять только starts_at, paid_children, trial_children
          await apiClient.put(API_ENDPOINTS.LESSON(lesson.id), {
            starts_at: payload.starts_at,
            paid_children: payload.paid_children,
            trial_children: payload.trial_children,
          });
        } else {
          const updatePayload = { ...payload };
          delete updatePayload.branch_id;
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
        onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
        options={branches}
        required
        disabled={!!lesson}
      />

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

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.is_creative}
            onChange={(e) => setFormData({ ...formData, is_creative: e.target.checked, instruction_id: e.target.checked ? '' : formData.instruction_id })}
            disabled={!!lesson && !isOwner}
          />
          <span>Творческое занятие</span>
        </label>
      </div>

      {!formData.is_creative && (
        <Select
          label="Инструкция"
          value={formData.instruction_id}
          onChange={(e) => setFormData({ ...formData, instruction_id: e.target.value })}
          options={instructions}
          required={!formData.is_creative}
          disabled={!!lesson && !isOwner}
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
