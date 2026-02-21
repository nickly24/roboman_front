import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal/Modal';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

const AddSalaryModal = ({ isOpen, onClose, onSuccess, sheet, owners, teachers }) => {
  const [ownerId, setOwnerId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [amount, setAmount] = useState('');
  const [periodType, setPeriodType] = useState('full');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [salaryData, setSalaryData] = useState(null);

  const month = sheet ? `${sheet.year}-${String(sheet.month).padStart(2, '0')}` : '';

  useEffect(() => {
    if (!isOpen || !month) return;
    const load = async () => {
      try {
        const res = await apiClient.get(`${API_ENDPOINTS.SALARY_OWNER_BY_DEPARTMENT}?month=${month}`);
        if (res.data?.ok) setSalaryData(res.data.data);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [isOpen, month]);

  const handlePull = () => {
    if (!salaryData?.by_department || !ownerId || !teacherId) return;
    const dep = salaryData.by_department.find((d) => d.department_id === sheet.department_id);
    if (!dep?.teachers) return;
    const t = dep.teachers.find((tch) => String(tch.teacher_id) === String(teacherId));
    if (!t) return;
    let val = 0;
    if (periodType === '1_15') val = t.salary_1_15 || 0;
    else if (periodType === '16_end') val = t.salary_16_end || 0;
    else val = t.salary_sum || 0;
    setAmount(String(Math.round(val)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (!ownerId || !teacherId || amt < 0) return;
    setSaving(true);
    setError('');
    try {
      await onSuccess({
        owner_id: parseInt(ownerId, 10),
        teacher_id: parseInt(teacherId, 10),
        amount: amt,
        period_type: periodType,
      });
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Ошибка при добавлении зарплаты';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const ownerOptions = (owners || []).map((o) => ({ value: String(o.id), label: o.full_name }));
  const teacherOptions = (teachers || []).map((t) => ({ value: String(t.id), label: t.full_name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить зарплату" size="medium">
      <form onSubmit={handleSubmit} className="add-record-form">
        <Select
          label="Владелец (кто платит)"
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          options={ownerOptions}
          placeholder="Выберите владельца"
          required
        />
        <Select
          label="Преподаватель"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          options={teacherOptions}
          placeholder="Выберите преподавателя"
          required
        />
        <div className="form-group">
          <label className="input-label">Период</label>
          <select
            className="select"
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value)}
          >
            <option value="1_15">1–15 число</option>
            <option value="16_end">16–конец месяца</option>
            <option value="full">Весь месяц</option>
          </select>
        </div>
        <div className="form-row-with-action">
          <Input
            type="number"
            label="Сумма (₽)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            required
          />
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={handlePull}
            disabled={!ownerId || !teacherId}
          >
            Подтянуть
          </Button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="primary" disabled={saving}>Добавить</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSalaryModal;
