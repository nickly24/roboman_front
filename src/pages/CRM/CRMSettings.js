import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import CRMLayout from '../../components/CRMLayout/CRMLayout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './CRM.css';

const CRMSettings = () => {
  const [loading, setLoading] = useState(true);
  const [configuredProd, setConfiguredProd] = useState(false);
  const [configuredDev, setConfiguredDev] = useState(false);
  const [tokenProd, setTokenProd] = useState('');
  const [tokenDev, setTokenDev] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get(API_ENDPOINTS.CRM_SETTINGS).then((res) => {
      if (res.data?.ok) {
        const d = res.data.data;
        setConfiguredProd(d?.telegram_bot_configured ?? false);
        setConfiguredDev(d?.telegram_bot_dev_configured ?? false);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {};
      if (tokenProd.trim() !== '') body.telegram_bot_token = tokenProd.trim();
      if (tokenDev.trim() !== '') body.telegram_bot_token_dev = tokenDev.trim();
      if (Object.keys(body).length === 0) {
        setSaving(false);
        return;
      }
      const res = await apiClient.put(API_ENDPOINTS.CRM_SETTINGS, body);
      if (res.data?.ok) {
        setConfiguredProd(res.data.data?.telegram_bot_configured ?? false);
        setConfiguredDev(res.data.data?.telegram_bot_dev_configured ?? false);
        setTokenProd('');
        setTokenDev('');
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CRMLayout>
        <div className="crm-page"><LoadingSpinner /></div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="crm-page">
        <h2>Настройки бота</h2>
        <Card>
          <p className="crm-help">
            Два токена (PROD и DEV) — задайте оба в Telegram разными ботами. Какой из них запускается, выбирается константой TELEGRAM_BOT_ENV в коде бэкенда (main.py).
          </p>

          <Input
            label="Токен PROD (оставьте пустым, чтобы не менять)"
            type="password"
            value={tokenProd}
            onChange={(e) => setTokenProd(e.target.value)}
            placeholder="Токен бота для продакшена"
          />
          <Input
            label="Токен DEV (оставьте пустым, чтобы не менять)"
            type="password"
            value={tokenDev}
            onChange={(e) => setTokenDev(e.target.value)}
            placeholder="Токен бота для разработки"
          />

          <div className="crm-modal-actions">
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
          </div>
        </Card>
      </div>
    </CRMLayout>
  );
};

export default CRMSettings;
