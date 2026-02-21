import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './CRM.css';

const CRMRegistrationRequests = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [approveModal, setApproveModal] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadBranches = async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.CRM_BRANCHES);
      if (res.data?.ok && res.data?.data?.items) {
        setBranches(res.data.data.items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const url = `${API_ENDPOINTS.CRM_REGISTRATION_REQUESTS}?status=${statusFilter}`;
      const res = await apiClient.get(url);
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

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleApprove = async () => {
    if (!approveModal || !selectedBranchId) return;
    setSaving(true);
    try {
      const res = await apiClient.post(
        API_ENDPOINTS.CRM_REGISTRATION_REQUEST_APPROVE(approveModal.id),
        { branch_id: Number(selectedBranchId), display_name: displayName.trim() || undefined }
      );
      setApproveModal(null);
      setSelectedBranchId('');
      setDisplayName('');
      loadRequests();
      if (res.data?.data?.chat?.id) {
        // Можно предложить перейти к чату
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка регистрации');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (req) => {
    if (!window.confirm(`Отклонить заявку от ${req.display_label}?`)) return;
    try {
      await apiClient.post(API_ENDPOINTS.CRM_REGISTRATION_REQUEST_REJECT(req.id));
      loadRequests();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  const openApproveModal = (req) => {
    setApproveModal(req);
    setSelectedBranchId('');
    setDisplayName(req.display_label || '');
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('ru', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabels = {
    pending: 'Ожидает',
    approved: 'Зарегистрирован',
    rejected: 'Отклонён',
  };

  const branchOptions = branches.map((b) => ({
    value: String(b.branch_id),
    label: `${b.name} (${b.address || '—'})`,
  }));
  if (branchOptions.length === 0) {
    branchOptions.push({ value: '', label: 'Нет филиалов в CRM. Добавьте филиал в разделе «Филиалы в CRM».' });
  }

  return (
    <CRMLayout>
      <div className="crm-page">
        <div className="crm-page-header">
          <h2>Заявки на регистрацию</h2>
        </div>
        <p className="crm-help">
          Когда клиент пишет боту /start в Telegram, создаётся заявка. Выберите филиал и нажмите «Зарегистрировать», чтобы привязать контакт к филиалу.
        </p>
        <div className="crm-chats-filter">
          <Select
            label="Статус"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'pending', label: 'Ожидают' },
              { value: 'approved', label: 'Зарегистрированы' },
              { value: 'rejected', label: 'Отклонённые' },
              { value: 'all', label: 'Все' },
            ]}
          />
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <Card>
            <p className="crm-empty">
              {statusFilter === 'pending'
                ? 'Нет заявок. Клиенты появятся здесь после нажатия /start в боте.'
                : 'Нет заявок с таким статусом.'}
            </p>
          </Card>
        ) : (
          <ul className="crm-branch-list">
            {items.map((r) => (
              <li key={r.id} className="crm-branch-item">
                <div className="crm-branch-info">
                  <span className="crm-chat-name">{r.display_label}</span>
                  <div className="crm-request-meta">
                    <span className="crm-chat-id">ID: {r.telegram_chat_id}</span>
                    {r.telegram_username && (
                      <span className="crm-branch-address"> · @{r.telegram_username}</span>
                    )}
                    <span className="crm-branch-address"> · {formatTime(r.created_at)}</span>
                  </div>
                  <span className={`crm-request-status crm-request-status-${r.status}`}>
                    {statusLabels[r.status] || r.status}
                  </span>
                  {r.status === 'approved' && r.crm_chat_id && (
                    <Link to={`/crm/chats/${r.crm_chat_id}`} className="crm-request-chat-link">
                      Открыть чат →
                    </Link>
                  )}
                </div>
                <div className="crm-branch-actions">
                  {r.status === 'pending' && (
                    <>
                      <Button variant="primary" onClick={() => openApproveModal(r)}>
                        Зарегистрировать
                      </Button>
                      <Button variant="secondary" onClick={() => handleReject(r)}>
                        Отклонить
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Modal
        isOpen={!!approveModal}
        onClose={() => {
          setApproveModal(null);
          setSelectedBranchId('');
          setDisplayName('');
        }}
        title="Зарегистрировать контакт"
      >
        {approveModal && (
          <>
            <p className="crm-help">
              {approveModal.display_label} (ID: {approveModal.telegram_chat_id})
            </p>
            <Select
              label="Филиал"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              options={branchOptions}
              placeholder="Выберите филиал"
            />
            <Input
              label="Имя контакта (необязательно)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Для отображения в чатах"
            />
            <div className="crm-modal-actions">
              <Button variant="secondary" onClick={() => setApproveModal(null)}>
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={!selectedBranchId || saving}
              >
                {saving ? 'Регистрация…' : 'Зарегистрировать'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </CRMLayout>
  );
};

export default CRMRegistrationRequests;
