import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { formatCurrency, getCurrentMonth } from '../../utils/format';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import Table from '../../components/Table/Table';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import './Salary.css';

const Salary = () => {
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadSalary();
  }, [month]);

  const loadSalary = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SALARY_OWNER_BY_DEPARTMENT}?month=${month}`);
      if (response.data?.ok) {
        setData(response.data.data);
      } else {
        setData(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки зарплаты по отделам:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const byDepartment = data?.by_department ?? [];

  // Последний день месяца для подписи колонки (16–31 и т.д.)
  const lastDayOfMonth = month
    ? new Date(parseInt(month.slice(0, 4), 10), parseInt(month.slice(5, 7), 10), 0).getDate()
    : 31;

  const columns = [
    { key: 'teacher_name', title: 'Преподаватель' },
    {
      key: 'salary_1_15',
      title: '1–15',
      render: (_, row) => (
        <span className="salary-period-cell">
          {formatCurrency(row.salary_1_15)}
          <span className="salary-period-meta">({row.lessons_1_15} зан.)</span>
        </span>
      ),
      align: 'right',
    },
    {
      key: 'salary_16_end',
      title: `16–${lastDayOfMonth}`,
      render: (_, row) => (
        <span className="salary-period-cell">
          {formatCurrency(row.salary_16_end)}
          <span className="salary-period-meta">({row.lessons_16_end} зан.)</span>
        </span>
      ),
      align: 'right',
    },
    {
      key: 'salary_sum',
      title: 'Итого',
      render: (v, row) => (
        <span className="salary-total-cell">
          {formatCurrency(v)}
          <span className="salary-period-meta">({row.lessons_count} зан.)</span>
        </span>
      ),
      align: 'right',
    },
  ];

  return (
    <Layout>
      <div className="salary-page">
        <div className="salary-header">
          <h1 className="salary-title">Зарплата по отделам</h1>
          <p className="salary-subtitle">Зарплата преподавателей в каждом из ваших отделов за выбранный период</p>
        </div>

        <Card className="salary-filters">
          <div className="salary-filters-grid">
            <Input
              type="month"
              label="Период"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <div className="salary-filters-actions">
              <Button onClick={loadSalary} variant="primary">Обновить</Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card>
            <LoadingSpinner size="medium" text="Загрузка данных..." />
          </Card>
        ) : byDepartment.length === 0 ? (
          <Card>
            <div className="salary-empty">Нет данных за выбранный период</div>
          </Card>
        ) : (
          <div className="salary-departments">
            {byDepartment.map((dep) => (
              <Card key={dep.department_id} title={dep.department_name} subtitle={`Итого по отделу: ${formatCurrency(dep.department_total ?? 0)}`}>
                {dep.teachers?.length > 0 ? (
                  <Table
                    columns={columns}
                    data={dep.teachers}
                  />
                ) : (
                  <div className="salary-department-empty">В отделе нет занятий за период</div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Salary;
