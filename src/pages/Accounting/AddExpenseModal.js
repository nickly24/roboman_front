import React, { useState } from 'react';
import Modal from '../../components/Modal/Modal';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';

const AddExpenseModal = ({ isOpen, onClose, onSuccess, owners }) => {
  const [ownerId, setOwnerId] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (!ownerId || !name.trim() || amt < 0) return;
    setSaving(true);
    setError('');
    try {
      await onSuccess({
        owner_id: parseInt(ownerId, 10),
        name: name.trim(),
        amount: amt,
      });
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Ошибка при добавлении расхода';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const ownerOptions = (owners || []).map((o) => ({ value: String(o.id), label: o.full_name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить прочий расход" size="medium">
      <form onSubmit={handleSubmit} className="add-record-form">
        <Select
          label="Кто потратил"
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          options={ownerOptions}
          placeholder="Выберите владельца"
          required
        />
        <Input
          label="Название / описание"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="На что потрачено"
          required
        />
        <Input
          type="number"
          label="Сумма (₽)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.01"
          required
        />
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="primary" disabled={saving}>Добавить</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddExpenseModal;
