import React, { useMemo, useState } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import Button from '../../components/Button/Button';
import './TeacherAccounts.css';

const TeacherAccountForm = ({ teachers, initialTeacher, onSuccess, onCancel }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    teacher_id: initialTeacher?.teacher_id || '',
    login: '',
    password: '',
    is_active: true,
  });

  const teacherOptions = useMemo(
    () =>
      (teachers || []).map((item) => ({
        value: item.teacher_id,
        label: item.full_name,
      })),
    [teachers]
  );

  const canSelectTeacher = !initialTeacher;
  const hasTeachers = teacherOptions.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        teacher_id: form.teacher_id,
        login: form.login.trim(),
        password: form.password,
        is_active: true,
      };

      if (!payload.teacher_id || !payload.login || !payload.password) {
        setError('Заполните преподавателя, логин и пароль');
        setSaving(false);
        return;
      }

      await apiClient.post(API_ENDPOINTS.TEACHER_ACCOUNTS, payload);
      onSuccess?.();
    } catch (e2) {
      const msg = e2?.response?.data?.error?.message || e2?.response?.data?.message;
      setError(msg || 'Не удалось создать учётку');
      // eslint-disable-next-line no-console
      console.error(e2);
    } finally {
      setSaving(false);
    }
  };

  if (!hasTeachers && canSelectTeacher) {
    return (
      <div className="teacher-accounts-empty">
        Все преподаватели уже имеют учётки.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="teacher-accounts-form">
      {error && <div className="form-error">{error}</div>}

      <Select
        label="Преподаватель"
        value={form.teacher_id}
        onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
        options={teacherOptions}
        required
        disabled={saving || !canSelectTeacher}
      />

      <Input
        label="Логин"
        value={form.login}
        onChange={(e) => setForm({ ...form, login: e.target.value })}
        required
        disabled={saving}
      />

      <Input
        label="Пароль"
        type="text"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
        disabled={saving}
      />

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Создание...' : 'Создать учетку'}
        </Button>
      </div>

      <div className="teacher-accounts-note">
        Логин и пароль будут доступны администратору для копирования.
      </div>
    </form>
  );
};

export default TeacherAccountForm;
