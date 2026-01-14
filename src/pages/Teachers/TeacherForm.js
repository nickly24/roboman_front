import React, { useMemo, useState } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import Button from '../../components/Button/Button';
import { TEACHER_STATUS, TEACHER_STATUS_LABELS } from '../../utils/constants';
import './Teachers.css';

const TeacherForm = ({ teacher, onSuccess, onCancel }) => {
  const isEdit = !!teacher?.id;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: teacher?.full_name || '',
    color: teacher?.color || '#0369a1',
    status: teacher?.status || TEACHER_STATUS.WORKING,
  });

  const statusOptions = useMemo(
    () => [
      { value: TEACHER_STATUS.WORKING, label: TEACHER_STATUS_LABELS[TEACHER_STATUS.WORKING] },
      { value: TEACHER_STATUS.VACATION, label: TEACHER_STATUS_LABELS[TEACHER_STATUS.VACATION] },
      { value: TEACHER_STATUS.FIRED, label: TEACHER_STATUS_LABELS[TEACHER_STATUS.FIRED] },
    ],
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        full_name: form.full_name.trim(),
        color: form.color,
        status: form.status,
      };

      if (!payload.full_name) {
        setError('ФИО обязательно');
        setSaving(false);
        return;
      }

      if (isEdit) {
        await apiClient.put(API_ENDPOINTS.TEACHER(teacher.id), payload);
      } else {
        await apiClient.post(API_ENDPOINTS.TEACHERS, payload);
      }
      onSuccess?.();
    } catch (e2) {
      const msg = e2?.response?.data?.error?.message || e2?.response?.data?.message;
      setError(msg || 'Не удалось сохранить преподавателя');
      // eslint-disable-next-line no-console
      console.error(e2);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="teacher-form">
      {error && <div className="form-error">{error}</div>}

      <Input
        label="ФИО"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        required
        disabled={saving}
      />

      <div className="teacher-form-row">
        <div className="teacher-color-field">
          <label className="input-label">Цвет</label>
          <div className="teacher-color-control">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              disabled={saving}
              className="teacher-color-input"
            />
            <input
              type="text"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              disabled={saving}
              className="teacher-color-text"
            />
          </div>
        </div>

        <Select
          label="Статус"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          options={statusOptions}
          required
          disabled={saving}
        />
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
        </Button>
      </div>

      <div className="teacher-form-note">
        Преподавателей не удаляем физически: используйте статус (например, «Уволен») для архива.
      </div>
    </form>
  );
};

export default TeacherForm;

