import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Input from '../../components/Input/Input';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './CRM.css';

const CRMNotifications = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.CRM_NOTIFICATION_SUBSCRIBERS);
      if (res.data?.ok && res.data?.data?.items) setItems(res.data.data.items);
      else setItems([]);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const tid = telegramChatId.trim();
    if (!tid) return;
    const num = parseInt(tid, 10);
    if (Number.isNaN(num)) {
      alert('Chat ID должен быть числом');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(API_ENDPOINTS.CRM_NOTIFICATION_SUBSCRIBERS, {
        telegram_chat_id: num,
        label: label.trim() || undefined,
      });
      setIsModalOpen(false);
      setTelegramChatId('');
      setLabel('');
      load();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Удалить подписчика?')) return;
    try {
      await apiClient.delete(API_ENDPOINTS.CRM_NOTIFICATION_SUBSCRIBER(id));
      load();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка');
    }
  };

  return (
    <CRMLayout>
      <div className="crm-page">
        <div className="crm-page-header">
          <h2>Уведомления о новых сообщениях</h2>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>Добавить chat_id для уведомлений</Button>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Card>
            <p className="crm-help">Сюда приходят уведомления при новом сообщении в любой чат CRM. Укажите свой Telegram chat_id (узнать: напишите боту /start).</p>
            {items.length === 0 ? (
              <p className="crm-empty">Нет подписчиков.</p>
            ) : (
              <ul className="crm-subscribers-list">
                {items.map((s) => (
                  <li key={s.id} className="crm-subscriber-item">
                    <span>{s.label ? `${s.label} (${s.telegram_chat_id})` : s.telegram_chat_id}</span>
                    <Button variant="secondary" onClick={() => handleRemove(s.id)}>Удалить</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setTelegramChatId(''); setLabel(''); }} title="Добавить подписчика">
        <Input
          label="Telegram Chat ID"
          value={telegramChatId}
          onChange={(e) => setTelegramChatId(e.target.value)}
          placeholder="Ваш chat_id из бота"
        />
        <Input
          label="Подпись (необязательно)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Например: Ник"
        />
        <div className="crm-modal-actions">
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
          <Button variant="primary" onClick={handleAdd} disabled={!telegramChatId.trim() || saving}>{saving ? '…' : 'Добавить'}</Button>
        </div>
      </Modal>
    </CRMLayout>
  );
};

export default CRMNotifications;
