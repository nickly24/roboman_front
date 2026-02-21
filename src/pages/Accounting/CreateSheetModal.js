import React, { useState } from 'react';
import Modal from '../../components/Modal/Modal';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import DepartmentSelector from '../../components/DepartmentSelector/DepartmentSelector';

const CreateSheetModal = ({ isOpen, onClose, onSuccess, departments }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [departmentId, setDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!departmentId) {
      setError('Выберите отдел');
      return;
    }
    setSaving(true);
    try {
      await onSuccess({ year: parseInt(year, 10), month: parseInt(month, 10), department_id: parseInt(departmentId, 10) });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка создания листа');
    } finally {
      setSaving(false);
    }
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i).toLocaleString('ru-RU', { month: 'long' }),
  }));

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать денежный лист" size="medium">
      <form onSubmit={handleSubmit} className="create-sheet-form">
        <div className="form-row">
          <div className="form-group">
            <label className="input-label">Год</label>
            <select
              className="select"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              required
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="input-label">Месяц</label>
            <select
              className="select"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
        <DepartmentSelector
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          label="Отдел"
          showAll={false}
        />
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Создание…' : 'Создать'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateSheetModal;
