import React, { useState } from 'react';
import apiClient from '../../services/api';
import Modal from '../../components/Modal/Modal';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';

export default function TeacherPasswordReset({ account, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    if (saving) return;
    if (password.length < 8 || password.length > 256) {
      setError('Пароль должен содержать от 8 до 256 символов');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await apiClient.put(`/users/${account.user_id}`, { password });
      if (!response.data?.ok) throw new Error(response.data?.error?.message || 'Не удалось изменить пароль');
      setPassword('');
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Не удалось изменить пароль');
    } finally {
      setSaving(false);
    }
  };

  return <Modal isOpen title="Изменить пароль преподавателя" onClose={() => { if (!saving) onClose(); }} size="medium">
    <form className="teacher-accounts-form" aria-label="Изменить пароль преподавателя" onSubmit={submit}>
      <p>{account.full_name} · {account.login}</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <Input label="Новый пароль" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} maxLength={256} required disabled={saving} />
      <p className="teacher-accounts-note">Сохраните новый пароль и передайте преподавателю отдельно. После изменения потребуется войти снова. Посмотреть сохранённый пароль нельзя.</p>
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Отмена</Button>
        <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Сохраняем…' : 'Изменить пароль'}</Button>
      </div>
    </form>
  </Modal>;
}
