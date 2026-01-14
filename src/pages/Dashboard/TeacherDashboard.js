import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { formatCurrency, formatNumber, getCurrentMonth } from '../../utils/format';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import KPICard from '../../components/KPICard/KPICard';
import Table from '../../components/Table/Table';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import './Dashboard.css';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [month, setMonth] = useState(getCurrentMonth());
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [myBranches, setMyBranches] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, [month]);

  useEffect(() => {
    loadMyBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setLessonsLoading(true);
    try {
      const [dashResp, lessonsResp] = await Promise.all([
        apiClient.get(`${API_ENDPOINTS.DASHBOARD_TEACHER}?month=${month}`),
        apiClient.get(`${API_ENDPOINTS.LESSONS}?${new URLSearchParams({ month, limit: '200', offset: '0', sort: 'starts_at', order: 'desc' }).toString()}`),
      ]);

      if (dashResp.data.ok) {
        setDashboardData(dashResp.data.data);
      }

      if (lessonsResp.data.ok) {
        const data = lessonsResp.data.data;
        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setLessons(items);
      } else {
        setLessons([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки дашборда:', error);
      setLessons([]);
    } finally {
      setLoading(false);
      setLessonsLoading(false);
    }
  };

  const loadMyBranches = async () => {
    setBranchesLoading(true);
    try {
      const teacherId = user?.profile?.id;
      if (!teacherId) {
        setMyBranches([]);
        return;
      }
      const resp = await apiClient.get(API_ENDPOINTS.TEACHER_BRANCHES(teacherId));
      if (resp.data.ok) {
        const data = resp.data.data;
        setMyBranches(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      } else {
        setMyBranches([]);
      }
    } catch (e) {
      console.error('Ошибка загрузки моих филиалов:', e);
      setMyBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <Layout>
        <LoadingSpinner size="large" text="Загрузка дашборда..." />
      </Layout>
    );
  }

  const { kpi, total } = dashboardData || {};

  // Разбивка зарплаты на 2 выплаты (1–15 и 16–конец месяца)
  const getMonthMeta = () => {
    const [y, m] = String(month || '').split('-').map(Number);
    if (!y || !m) return { year: null, monthIndex: null, lastDay: null };
    const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month = last day of current month
    return { year: y, monthIndex: m - 1, lastDay };
  };

  const { lastDay } = getMonthMeta();

  const salarySplit = lessons.reduce(
    (acc, lesson) => {
      const d = new Date(lesson.starts_at);
      const day = d.getDate();
      const salary = Number(lesson.teacher_salary ?? 0) || 0;
      if (day <= 15) {
        acc.first.sum += salary;
        acc.first.count += 1;
      } else {
        acc.second.sum += salary;
        acc.second.count += 1;
      }
      return acc;
    },
    { first: { sum: 0, count: 0 }, second: { sum: 0, count: 0 } }
  );

  const tableColumns = [
    { key: 'starts_at', title: 'Дата/Время', render: (value) => new Date(value).toLocaleString('ru-RU') },
    { key: 'branch_name', title: 'Филиал' },
    { key: 'paid_children', title: 'Платные', align: 'center' },
    { key: 'trial_children', title: 'Пробные', align: 'center' },
    { key: 'total_children', title: 'Всего', align: 'center' },
    {
      key: 'instruction',
      title: 'Инструкция',
      render: (_, row) => (row.is_creative ? 'Творческое' : row.instruction_name || 'По инструкции'),
    },
    { key: 'teacher_salary', title: 'Зарплата', render: (value) => formatCurrency(value), align: 'right' },
  ];

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Мой дашборд</h1>
        </div>

        <Card title="Мои филиалы" subtitle="Филиалы, к которым вы привязаны">
          {branchesLoading ? (
            <LoadingSpinner size="medium" text="Загрузка филиалов..." />
          ) : myBranches.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {myBranches.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '8px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 999,
                    background: '#ffffff',
                    fontSize: 13,
                    color: '#374151',
                  }}
                  title={b.address || b.name}
                >
                  {b.name}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#6b7280', fontSize: 14 }}>Нет привязанных филиалов</div>
          )}
        </Card>

        <Card className="dashboard-filters">
          <div className="filters-grid">
            <Input
              type="month"
              label="Период"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <div className="filters-actions">
              <Button onClick={loadDashboard} variant="primary">Обновить</Button>
            </div>
          </div>
        </Card>

        <div className="dashboard-kpi">
          {kpi && (
            <>
              <KPICard
                title="Зарплата за период"
                value={formatCurrency(kpi.salary_sum)}
                subtitle="Предварительный расчёт"
                icon="💰"
                color="#059669"
              />
              <KPICard
                title="Занятий за период"
                value={formatNumber(kpi.lessons_count)}
                icon="📚"
                color="#0369a1"
              />
              <KPICard
                title="Всего детей"
                value={formatNumber(kpi.total_children_sum)}
                icon="👥"
                color="#7c3aed"
              />
            </>
          )}
          {total && (
            <KPICard
              title="Всего занятий проведено"
              value={formatNumber(total.total_lessons_count)}
              subtitle="Накопительно"
              icon="⭐"
              color="#ea580c"
            />
          )}
        </div>

        <Card title="График выплат" subtitle="Разбивка зарплаты на две части">
          <div className="salary-split">
            <div className="salary-split-item">
              <div className="salary-split-title">1–15</div>
              <div className="salary-split-value">{formatCurrency(salarySplit.first.sum)}</div>
              <div className="salary-split-meta">{salarySplit.first.count} занятий</div>
            </div>
            <div className="salary-split-item">
              <div className="salary-split-title">16–{lastDay || '…'}</div>
              <div className="salary-split-value">{formatCurrency(salarySplit.second.sum)}</div>
              <div className="salary-split-meta">{salarySplit.second.count} занятий</div>
            </div>
          </div>
        </Card>

        {lessonsLoading ? (
          <Card title="Мои занятия за период">
            <LoadingSpinner size="medium" text="Загрузка занятий..." />
          </Card>
        ) : lessons && lessons.length > 0 ? (
          <Card title="Мои занятия за период">
            <Table columns={tableColumns} data={lessons} mobileTitleKey="starts_at" />
          </Card>
        ) : (
          <Card>
            <div className="dashboard-empty">
              <p>Нет занятий за выбранный период</p>
              <Button onClick={() => window.location.href = '/lessons'}>Создать занятие</Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default TeacherDashboard;
