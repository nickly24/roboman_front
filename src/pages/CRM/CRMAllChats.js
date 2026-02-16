import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import Card from '../../components/Card/Card';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import Select from '../../components/Select/Select';
import './CRM.css';

const CRMAllChats = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');

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

  const loadChats = async () => {
    setLoading(true);
    try {
      const url = branchFilter
        ? `${API_ENDPOINTS.CRM_CHATS}?branch_id=${branchFilter}`
        : API_ENDPOINTS.CRM_CHATS;
      const res = await apiClient.get(url);
      if (res.data?.ok && res.data?.data?.items) {
        setChats(res.data.data.items);
      } else {
        setChats([]);
      }
    } catch (e) {
      console.error(e);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadChats();
  }, [branchFilter]);

  const branchOptions = [
    { value: '', label: 'Все филиалы' },
    ...branches.map((b) => ({ value: String(b.branch_id), label: b.name })),
  ];

  const formatPreview = (msg) => {
    if (!msg || !msg.content_preview) return '—';
    const t = msg.content_preview.replace(/\s+/g, ' ').trim();
    return t.length > 50 ? t.slice(0, 50) + '…' : t;
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
  };

  return (
    <CRMLayout>
      <div className="crm-page crm-all-chats-page">
        <div className="crm-page-header">
          <h2>Чаты</h2>
        </div>
        <div className="crm-chats-filter">
          <Select
            label="Филиал"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            options={branchOptions}
          />
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : chats.length === 0 ? (
          <Card>
            <p className="crm-empty">Нет чатов. Добавьте филиал в CRM и создайте чаты.</p>
          </Card>
        ) : (
          <ul className="crm-chat-list crm-chat-list-messenger">
            {chats.map((c) => (
              <li key={c.id} className="crm-chat-item crm-chat-item-messenger">
                <Link to={`/crm/chats/${c.id}`} className="crm-chat-link">
                  <div className="crm-chat-item-dots">
                    {Number(c.unread_from_client) > 0 && <span className="crm-dot crm-dot-blue" title="Непрочитанные от клиента" />}
                    {Number(c.unread_from_team) > 0 && <span className="crm-dot crm-dot-green" title="Непрочитанные от коллег" />}
                  </div>
                  <div className="crm-chat-item-body">
                    <div className="crm-chat-item-top">
                      <span className="crm-chat-name">{c.display_name || `Chat ${c.telegram_chat_id}`}</span>
                      {c.last_message?.created_at && (
                        <span className="crm-chat-item-time">{formatTime(c.last_message.created_at)}</span>
                      )}
                    </div>
                    <div className="crm-chat-item-meta">{c.branch_name}</div>
                    {c.last_message && (
                      <p className="crm-chat-item-preview">{formatPreview(c.last_message)}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CRMLayout>
  );
};

export default CRMAllChats;
