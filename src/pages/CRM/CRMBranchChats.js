import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Input from '../../components/Input/Input';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './CRM.css';

const CRMBranchChats = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [branchInfo, setBranchInfo] = useState(null);
  const [chats, setChats] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadChats = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.CRM_BRANCH_CHATS(branchId));
      if (res.data?.ok) {
        setChats(res.data.data?.items || []);
      }
    } catch (e) {
      console.error(e);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
    apiClient.get(API_ENDPOINTS.CRM_BRANCHES).then((res) => {
      if (res.data?.ok && res.data?.data?.items) {
        const b = res.data.data.items.find((i) => i.branch_id === Number(branchId));
        setBranchInfo(b || null);
      }
    }).catch(() => setBranchInfo(null));
  }, [branchId]);

  const handleAddChat = async () => {
    const tid = telegramChatId.trim();
    if (!tid) return;
    const num = parseInt(tid, 10);
    if (Number.isNaN(num)) {
      alert('Chat ID должен быть числом');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(API_ENDPOINTS.CRM_CHATS, {
        branch_id: Number(branchId),
        telegram_chat_id: num,
        display_name: displayName.trim() || undefined,
      });
      setIsAddModalOpen(false);
      setTelegramChatId('');
      setDisplayName('');
      loadChats();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка добавления чата');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm('Удалить чат? История сообщений будет удалена.')) return;
    try {
      await apiClient.delete(API_ENDPOINTS.CRM_CHAT(chatId));
      loadChats();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  return (
    <CRMLayout>
      <div className="crm-page">
        <div className="crm-page-header crm-page-header-with-back">
          <Button variant="secondary" onClick={() => navigate('/crm')}>← Филиалы</Button>
          <h2>{branchInfo ? `${branchInfo.name} — Чаты` : 'Чаты филиала'}</h2>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>Добавить чат</Button>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : chats.length === 0 ? (
          <Card>
            <p className="crm-empty">Нет чатов. Попросите контакт написать боту /start, затем добавьте его chat_id сюда.</p>
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
                    <span className="crm-chat-name">{c.display_name || `Chat ${c.telegram_chat_id}`}</span>
                    <span className="crm-chat-id">ID: {c.telegram_chat_id}</span>
                    {c.last_message?.content_preview && (
                      <p className="crm-chat-item-preview">{(c.last_message.content_preview || '').slice(0, 50)}{(c.last_message.content_preview || '').length > 50 ? '…' : ''}</p>
                    )}
                  </div>
                </Link>
                <Button variant="secondary" onClick={(e) => { e.preventDefault(); handleDeleteChat(c.id); }}>Удалить</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setTelegramChatId(''); setDisplayName(''); }}
        title="Добавить чат"
      >
        <Input
          label="Telegram Chat ID"
          value={telegramChatId}
          onChange={(e) => setTelegramChatId(e.target.value)}
          placeholder="Например: 123456789"
        />
        <Input
          label="Имя контакта (необязательно)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Для отображения в CRM"
        />
        <div className="crm-modal-actions">
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Отмена</Button>
          <Button variant="primary" onClick={handleAddChat} disabled={!telegramChatId.trim() || saving}>
            {saving ? 'Сохранение…' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </CRMLayout>
  );
};

export default CRMBranchChats;
