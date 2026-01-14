import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import './Settings.css';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    teacher_base_rate: 1200,
    teacher_threshold_children: 4,
    teacher_bonus_per_child: 100,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.SETTINGS_SALARY);
      if (response.data.ok) {
        const data = response.data.data;
        setSettings({
          teacher_base_rate: data.teacher_base_rate?.value_int || 1200,
          teacher_threshold_children: data.teacher_threshold_children?.value_int || 4,
          teacher_bonus_per_child: data.teacher_bonus_per_child?.value_int || 100,
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put(API_ENDPOINTS.SETTINGS_SALARY, settings);
      alert('Настройки сохранены');
    } catch (error) {
      alert('Ошибка сохранения настроек');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="settings-loading">Загрузка настроек...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="settings-page">
        <div className="settings-header">
          <h1 className="settings-title">Настройки</h1>
        </div>

        <Card title="Настройки расчёта зарплаты">
          <form onSubmit={handleSave} className="settings-form">
            <Input
              type="number"
              label="Базовая ставка за занятие (₽)"
              value={settings.teacher_base_rate}
              onChange={(e) => setSettings({ ...settings, teacher_base_rate: parseInt(e.target.value) })}
              min="0"
              required
            />

            <Input
              type="number"
              label="Порог детей для доплаты"
              value={settings.teacher_threshold_children}
              onChange={(e) => setSettings({ ...settings, teacher_threshold_children: parseInt(e.target.value) })}
              min="0"
              required
            />

            <Input
              type="number"
              label="Доплата за каждого ребёнка после порога (₽)"
              value={settings.teacher_bonus_per_child}
              onChange={(e) => setSettings({ ...settings, teacher_bonus_per_child: parseInt(e.target.value) })}
              min="0"
              required
            />

            <div className="form-actions">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
