import React, { useState } from 'react';
import Modal from '../../components/Modal/Modal';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

const AddIncomeModal = ({ isOpen, onClose, onSuccess, sheet, branches, owners }) => {
  const [branchId, setBranchId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [taxPercent, setTaxPercent] = useState('0');
  const [referralPercent, setReferralPercent] = useState('0');
  const [referralFromNet, setReferralFromNet] = useState(false);
  const [referralComment, setReferralComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingPull, setLoadingPull] = useState(false);
  const [error, setError] = useState('');

  const month = sheet ? `${sheet.year}-${String(sheet.month).padStart(2, '0')}` : '';

  const handlePullFromBranch = async () => {
    if (!branchId || !month) return;
    setLoadingPull(true);
    try {
      const res = await apiClient.get(`${API_ENDPOINTS.REPORTS_BRANCH_SUMMARY(branchId)}?month=${month}`);
      if (res.data?.ok && res.data?.data?.kpi?.revenue_sum != null) {
        setAmount(String(Math.round(res.data.data.kpi.revenue_sum)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPull(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    const taxPct = parseFloat(taxPercent) || 0;
    const taxAmountRub = amt * (taxPct / 100);
    const refPct = parseFloat(referralPercent);
    const refPctFinal = (referralPercent === '' || Number.isNaN(refPct)) ? null : refPct;
    if (!branchId || !ownerId || amt < 0) return;
    setSaving(true);
    setError('');
    try {
      await onSuccess({
        branch_id: parseInt(branchId, 10),
        owner_id: parseInt(ownerId, 10),
        amount: amt,
        tax_amount: taxAmountRub,
        referral_percent: refPctFinal,
        referral_from_net: referralFromNet ? 1 : 0,
        referral_comment: referralComment || undefined,
      });
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Ошибка при создании поступления';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const branchOptions = (branches || []).map((b) => ({ value: String(b.id), label: b.name }));
  const ownerOptions = (owners || []).map((o) => ({ value: String(o.id), label: o.full_name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить поступление" size="medium">
      <form onSubmit={handleSubmit} className="add-record-form">
        <Select
          label="Филиал"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          options={branchOptions}
          placeholder="Выберите филиал"
          required
        />
        <Select
          label="Владелец (кому зачислено)"
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          options={ownerOptions}
          placeholder="Выберите владельца"
          required
        />
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
            onClick={handlePullFromBranch}
            disabled={!branchId || loadingPull}
          >
            {loadingPull ? '…' : 'Подтянуть из отчёта'}
          </Button>
        </div>
        <Input
          type="number"
          label="Налог (%)"
          value={taxPercent}
          onChange={(e) => setTaxPercent(e.target.value)}
          min="0"
          max="100"
          step="0.01"
          placeholder="0"
        />
        <Input
          type="number"
          label="Рефералка (%)"
          value={referralPercent}
          onChange={(e) => setReferralPercent(e.target.value)}
          min="0"
          max="100"
          step="0.01"
          placeholder="0"
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={referralFromNet}
            onChange={(e) => setReferralFromNet(e.target.checked)}
          />
          <span>Рефералка от суммы после налога</span>
        </label>
        <Input
          label="Комментарий к рефералке"
          value={referralComment}
          onChange={(e) => setReferralComment(e.target.value)}
          placeholder="Кому отдан %"
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

export default AddIncomeModal;
