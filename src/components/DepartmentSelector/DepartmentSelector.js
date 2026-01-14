import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Select from '../Select/Select';
import './DepartmentSelector.css';

const DepartmentSelector = ({ value, onChange, label = 'Отдел', showAll = true, className = '' }) => {
  const { isOwner } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOwner) {
      loadDepartments();
    }
  }, [isOwner]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.DEPARTMENTS);
      if (response.data.ok) {
        const data = response.data.data;
        const depsList = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setDepartments(depsList);
      }
    } catch (error) {
      console.error('Ошибка загрузки отделов:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  const options = [
    ...(showAll ? [{ value: '', label: 'Все отделы' }] : []),
    ...departments.map((dep) => ({
      value: dep.id.toString(),
      label: dep.name,
    })),
  ];

  return (
    <div className={`department-selector ${className}`}>
      <Select
        label={label}
        value={value || ''}
        onChange={onChange}
        options={options}
        placeholder={loading ? 'Загрузка...' : 'Выберите отдел'}
        disabled={loading}
      />
    </div>
  );
};

export default DepartmentSelector;
