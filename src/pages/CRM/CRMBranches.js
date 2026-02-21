import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Select from '../../components/Select/Select';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './CRM.css';

const CRMBranches = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCrmBranches = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.CRM_BRANCHES);
      if (res.data?.ok && res.data?.data?.items) {
        setItems(res.data.data.items);
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllBranches = async () => {
    try {
      const res = await apiClient.get(`${API_ENDPOINTS.BRANCHES}?limit=500&include_inactive=true`);
      if (res.data?.ok && res.data?.data?.items) {
        setAllBranches(res.data.data.items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCrmBranches();
  }, []);

  useEffect(() => {
    if (isAddModalOpen) loadAllBranches();
  }, [isAddModalOpen]);

  const handleAddBranch = async () => {
    if (!selectedBranchId) return;
    setSaving(true);
    try {
      await apiClient.post(API_ENDPOINTS.CRM_BRANCHES, { branch_id: Number(selectedBranchId) });
      setIsAddModalOpen(false);
      setSelectedBranchId('');
      loadCrmBranches();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка добавления филиала в CRM');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBranch = async (branchId) => {
    if (!window.confirm('Убрать филиал из CRM? Чаты и сообщения будут удалены.')) return;
    try {
      await apiClient.delete(API_ENDPOINTS.CRM_BRANCH(branchId));
      loadCrmBranches();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const branchOptions = allBranches
    .filter((b) => !items.some((i) => i.branch_id === b.id))
    .map((b) => ({ value: String(b.id), label: `${b.name} (${b.address || '—'})` }));

  return (
    <CRMLayout>
      <div className="crm-page">
        <div className="crm-page-header">
          <h2>Филиалы в CRM</h2>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            Добавить филиал в CRM
          </Button>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <Card>
            <p className="crm-empty">Пока нет филиалов в CRM. Добавьте филиал, чтобы привязывать к нему Telegram-чаты.</p>
          </Card>
        ) : (
          <ul className="crm-branch-list">
            {items.map((row) => (
              <li key={row.branch_id} className="crm-branch-item">
                <div className="crm-branch-info">
                  <Link to={`/crm/chats?branch_id=${row.branch_id}`} className="crm-branch-name">
                    {row.name}
                  </Link>
                  <span className="crm-branch-address">{row.address || '—'}</span>
                </div>
                <div className="crm-branch-actions">
                  <Link to={`/crm/chats?branch_id=${row.branch_id}`}>
                    <Button variant="secondary">Чаты</Button>
                  </Link>
                  <Button variant="secondary" onClick={() => handleRemoveBranch(row.branch_id)}>
                    Убрать из CRM
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setSelectedBranchId(''); }}
        title="Добавить филиал в CRM"
      >
        <Select
          label="Филиал"
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          options={branchOptions}
          placeholder="Выберите филиал"
        />
        <div className="crm-modal-actions">
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Отмена</Button>
          <Button variant="primary" onClick={handleAddBranch} disabled={!selectedBranchId || saving}>
            {saving ? 'Сохранение…' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </CRMLayout>
  );
};

export default CRMBranches;
