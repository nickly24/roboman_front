import React, { useState } from 'react';
import Modal from '../../components/Modal/Modal';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';

const AddTransferModal = ({ isOpen, onClose, onSuccess, owners }) => {
  const [fromOwnerId, setFromOwnerId] = useState('');
  const [toOwnerId, setToOwnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (!fromOwnerId || !toOwnerId || fromOwnerId === toOwnerId || amt <= 0) return;
    setSaving(true);
    setError('');
    try {
      await onSuccess({
        from_owner_id: parseInt(fromOwnerId, 10),
        to_owner_id: parseInt(toOwnerId, 10),
        amount: amt,
      });
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Ошибка при добавлении перевода';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const ownerOptions = (owners || []).map((o) => ({ value: String(o.id), label: o.full_name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить перевод" size="medium">
      <form onSubmit={handleSubmit} className="add-record-form">
        <Select
          label="От кого"
          value={fromOwnerId}
          onChange={(e) => setFromOwnerId(e.target.value)}
          options={ownerOptions}
          placeholder="Выберите владельца"
          required
        />
        <Select
          label="Кому"
          value={toOwnerId}
          onChange={(e) => setToOwnerId(e.target.value)}
          options={ownerOptions.filter((o) => o.value !== fromOwnerId)}
          placeholder="Выберите владельца"
          required
        />
        <Input
          type="number"
          label="Сумма (₽)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0.01"
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

export default AddTransferModal;
