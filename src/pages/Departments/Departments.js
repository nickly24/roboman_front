import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Table from '../../components/Table/Table';
import Button from '../../components/Button/Button';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './Departments.css';

const Departments = () => {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.DEPARTMENTS);
      if (response.data.ok) {
        const data = response.data.data;
        setDepartments(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      }
    } catch (error) {
      console.error('Ошибка загрузки отделов:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'id', title: 'ID', align: 'center' },
    { key: 'name', title: 'Название' },
    { key: 'comment', title: 'Комментарий' },
    {
      key: 'created_at',
      title: 'Создан',
      render: (value) => value ? new Date(value).toLocaleDateString('ru-RU') : '-',
    },
  ];

  return (
    <Layout>
      <div className="departments-page">
        <div className="departments-header">
          <h1 className="departments-title">Отделы</h1>
        </div>

        <Card>
          {loading ? (
            <LoadingSpinner size="medium" text="Загрузка отделов..." />
          ) : (
            <Table
              columns={columns}
              data={departments}
              loading={false}
              emptyMessage="Нет отделов"
            />
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Departments;
