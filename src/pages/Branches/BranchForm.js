import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import Button from '../../components/Button/Button';

const BranchForm = ({ branch, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    department_id: branch?.department_id || '',
    name: branch?.name || '',
    address: branch?.address || '',
    metro: branch?.metro || '',
    price_per_child: branch?.price_per_child || 0,
    is_active: branch?.is_active !== undefined ? branch.is_active : true,
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DEPARTMENTS);
      if (response.data.ok) {
        const data = response.data.data;
        const departmentsList = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setDepartments(
          departmentsList.map((d) => ({
            value: d.id,
            label: d.name,
          }))
        );
      }
    } catch (error) {
      console.error('Ошибка загрузки отделов:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        department_id: parseInt(formData.department_id),
        price_per_child: parseFloat(formData.price_per_child),
      };

      if (branch) {
        await apiClient.put(API_ENDPOINTS.BRANCH(branch.id), payload);
      } else {
        await apiClient.post(API_ENDPOINTS.BRANCHES, payload);
      }

      onSuccess();
    } catch (error) {
      setError(error.response?.data?.error?.message || 'Ошибка сохранения филиала');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="branch-form">
      {error && <div className="form-error">{error}</div>}

      <Select
        label="Отдел"
        value={formData.department_id}
        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
        options={departments}
        required
      />

      <Input
        type="text"
        label="Название"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <Input
        type="text"
        label="Адрес"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
      />

      <Input
        type="text"
        label="Станция метро"
        value={formData.metro}
        onChange={(e) => setFormData({ ...formData, metro: e.target.value })}
      />

      <Input
        type="number"
        label="Цена за ребёнка (₽)"
        value={formData.price_per_child}
        onChange={(e) => setFormData({ ...formData, price_per_child: e.target.value })}
        min="0"
        step="0.01"
        required
      />

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Сохранение...' : branch ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
};

export default BranchForm;
