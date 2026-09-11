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
  const [configuredAitunnel, setConfiguredAitunnel] = useState(false);
  const [aitunnelKey, setAitunnelKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get(API_ENDPOINTS.CRM_SETTINGS).then((res) => {
      if (res.data?.ok) {
        const d = res.data.data;
        setConfiguredAitunnel(d?.aitunnel_configured ?? false);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {};
      if (aitunnelKey.trim() !== '') body.aitunnel_api_key = aitunnelKey.trim();
      if (Object.keys(body).length === 0) {
        setSaving(false);
        return;
      }
      const res = await apiClient.put(API_ENDPOINTS.CRM_SETTINGS, body);
      if (res.data?.ok) {
        setConfiguredAitunnel(res.data.data?.aitunnel_configured ?? false);
        setAitunnelKey('');
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
        <h2>Настройки CRM</h2>
        <Card>
          <p className="crm-help">
            AITUNNEL API ключ используется для ИИ-поиска детских садов.
          </p>
          <Input
            label="AITUNNEL API ключ (оставьте пустым, чтобы не менять)"
            type="password"
            value={aitunnelKey}
            onChange={(e) => setAitunnelKey(e.target.value)}
            placeholder="sk-aitunnel-xxx"
          />
          {configuredAitunnel && <p className="crm-help" style={{ marginTop: 4, color: 'var(--color-success)' }}>✓ Ключ настроен</p>}

          <div className="crm-modal-actions">
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Button>
          </div>
        </Card>
      </div>
    </CRMLayout>
  );
};

export default CRMSettings;
