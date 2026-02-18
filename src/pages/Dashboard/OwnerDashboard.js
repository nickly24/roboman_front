import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { formatCurrency, formatNumber, getCurrentMonth } from '../../utils/format';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import KPICard from '../../components/KPICard/KPICard';
import Table from '../../components/Table/Table';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import DepartmentSelector from '../../components/DepartmentSelector/DepartmentSelector';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import useMediaQuery from '../../hooks/useMediaQuery';
import {
  IconRevenue,
  IconProfit,
  IconPeople,
  IconTarget,
  IconChartBar,
  IconLessons,
  IconChartLine,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
} from '../../components/Icons/SidebarIcons';
import {
  Line,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './Dashboard.css';

// Функция для расчёта KPI из списка занятий (fallback)
const calculateKPIFromLessons = (lessons) => {
  if (!lessons || lessons.length === 0) {
    return { revenue: 0, paid_children: 0, trial_children: 0, total_children: 0, salary: 0 };
  }
  
  let revenue = 0;
  let paid_children = 0;
  let trial_children = 0;
  let total_children = 0;
  let salary = 0;
  
  lessons.forEach((lesson) => {
    const paid = lesson.paid_children || 0;
    const trial = lesson.trial_children || 0;
    const total = paid + trial;
    
    paid_children += paid;
    trial_children += trial;
    total_children += total;
    
    // Выручка = платные * цена (если есть price_snapshot или revenue)
    if (lesson.revenue !== undefined && lesson.revenue !== null) {
      revenue += lesson.revenue;
    } else if (lesson.price_snapshot && paid > 0) {
      revenue += lesson.price_snapshot * paid;
    }
    
    // Зарплата преподавателя
    if (lesson.teacher_salary !== undefined && lesson.teacher_salary !== null) {
      salary += lesson.teacher_salary;
    }
  });
  
  return { revenue, paid_children, trial_children, total_children, salary };
};

const OwnerDashboard = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [periodMode, setPeriodMode] = useState('month'); // month | range
  const [month, setMonth] = useState(getCurrentMonth());
  const [rangeStartMonth, setRangeStartMonth] = useState(''); // YYYY-MM
  const [rangeEndMonth, setRangeEndMonth] = useState(''); // YYYY-MM
  const [filters, setFilters] = useState({
    department_id: '',
    branch_id: '',
    teacher_id: '',
  });
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState(new Set());

  useEffect(() => {
    loadDashboard();
  }, [month, rangeStartMonth, rangeEndMonth, periodMode, filters, selectedDepartment]);

  const kpi = dashboardData?.kpi;
  const series_by_month = dashboardData?.series_by_month || [];
  const top_branches = dashboardData?.top_branches || [];
  const top_teachers = dashboardData?.top_teachers || [];
  const lessonsFromData = dashboardData?.lessons || [];
  const lessons = Array.isArray(lessonsFromData?.items)
    ? lessonsFromData.items
    : Array.isArray(lessonsFromData)
      ? lessonsFromData
      : [];

  // Группировка занятий по филиалам с выручкой и прибылью (хук должен вызываться до любых return)
  const lessonsByBranch = useMemo(() => {
    if (!lessons || lessons.length === 0) return [];
    const map = new Map();
    lessons.forEach((lesson) => {
      const branchId = lesson.branch_id ?? '';
      const branchName = lesson.branch_name || 'Без филиала';
      const branchKey = String(branchId || branchName);
      if (!map.has(branchKey)) {
        map.set(branchKey, { branchId, branchName, lessons: [], revenue: 0, profit: 0 });
      }
      const row = map.get(branchKey);
      row.lessons.push(lesson);
      const rev = Number(lesson.revenue) || (lesson.price_snapshot && lesson.paid_children ? lesson.price_snapshot * (lesson.paid_children || 0) : 0);
      const sal = Number(lesson.teacher_salary) || 0;
      row.revenue += rev;
      row.profit += rev - sal;
    });
    return Array.from(map.values()).sort((a, b) => (a.branchName || '').localeCompare(b.branchName || ''));
  }, [lessons]);

  // Линейный график роста выручки, зарплат и прибыли по дням (с первого по последний)
  const revenueSalaryProfitChartData = useMemo(() => {
    if (!lessons || lessons.length === 0) return [];

    const getDateKey = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Суммы по каждому дню
    const byDay = new Map(); // dateKey -> { revenue, salary, profit }

    lessons.forEach((lesson) => {
      const dateKey = getDateKey(lesson.starts_at || lesson.date || lesson.scheduled_at);
      if (!dateKey) return;

      const revenue = Number(lesson.revenue) || (lesson.price_snapshot && lesson.paid_children
        ? lesson.price_snapshot * (lesson.paid_children || 0)
        : 0);
      const salary = Number(lesson.teacher_salary) || 0;
      const profit = revenue - salary;

      if (!byDay.has(dateKey)) {
        byDay.set(dateKey, { dateKey, revenue: 0, salary: 0, profit: 0 });
      }
      const row = byDay.get(dateKey);
      row.revenue += revenue;
      row.salary += salary;
      row.profit += profit;
    });

    const sortedDays = Array.from(byDay.keys()).sort();
    if (sortedDays.length === 0) return [];

    // Нарастающий итог: для каждого дня — сумма с начала по этот день
    let cumRevenue = 0;
    let cumSalary = 0;
    let cumProfit = 0;
    const result = sortedDays.map((dateKey) => {
      const day = byDay.get(dateKey);
      cumRevenue += day.revenue;
      cumSalary += day.salary;
      cumProfit += day.profit;
      return {
        dateKey,
        revenue: cumRevenue,
        salary: cumSalary,
        profit: cumProfit,
      };
    });

    return result;
  }, [lessons]);

  const formatPeriodLabel = (period) => {
    const s = String(period || '');
    const [y, m] = s.split('-').map(Number);
    if (!y || !m) return s;
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
  };

  const formatChartDateLabel = (dateKey) => {
    const s = String(dateKey || '');
    const parts = s.split('-').map(Number);
    if (parts.length < 3) return s;
    const [y, m, day] = parts;
    const d = new Date(y, m - 1, day);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const buildPeriodParams = () => {
    const params = new URLSearchParams();

    if (periodMode === 'range' && rangeStartMonth && rangeEndMonth) {
      // На UI выбираем месяц-диапазон, на API отправляем start/end ISO datetime
      // start = 1-е число стартового месяца 00:00
      // end = 1-е число месяца ПОСЛЕ конечного 00:00 (эксклюзивно)
      const startIso = `${rangeStartMonth}-01T00:00:00`;
      const [endY, endM] = rangeEndMonth.split('-').map(Number);
      const endDate = new Date(Date.UTC(endY, (endM || 1) - 1, 1, 0, 0, 0));
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);
      const endIso = endDate.toISOString().slice(0, 19);

      params.append('start', startIso);
      params.append('end', endIso);
      return params;
    }

    // по умолчанию — месяц
    params.append('month', month);
    return params;
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const params = buildPeriodParams();
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.branch_id) params.append('branch_id', filters.branch_id);
      if (filters.teacher_id) params.append('teacher_id', filters.teacher_id);

      const response = await apiClient.get(`${API_ENDPOINTS.DASHBOARD_OWNER}?${params}`);
      if (response.data.ok) {
        const data = response.data.data;
        console.log('Dashboard data from backend:', data); // Для отладки
        
        // Загружаем также список занятий для fallback расчёта (опционально, не ломаем дашборд при ошибке)
        let lessonsList = [];
        try {
          const lessonsParams = buildPeriodParams();
          lessonsParams.append('limit', '100'); // max_limit=500; нам хватит
          if (selectedDepartment) lessonsParams.append('department_id', selectedDepartment);
          if (filters.department_id) lessonsParams.append('department_id', filters.department_id);
          if (filters.branch_id) lessonsParams.append('branch_id', filters.branch_id);
          if (filters.teacher_id) lessonsParams.append('teacher_id', filters.teacher_id);
          
          const lessonsResponse = await apiClient.get(`${API_ENDPOINTS.LESSONS}?${lessonsParams}`);
          if (lessonsResponse.data.ok) {
            const lessonsData = lessonsResponse.data.data;
            lessonsList = Array.isArray(lessonsData?.items) ? lessonsData.items : (Array.isArray(lessonsData) ? lessonsData : []);
          }
        } catch (lessonsError) {
          console.warn('Не удалось загрузить занятия для fallback расчёта (это не критично):', lessonsError.response?.data || lessonsError.message);
          // Продолжаем работу без списка занятий - дашборд всё равно покажет KPI с бэкенда
        }
        
        // Fallback расчёт если KPI пустые или нулевые, но есть занятия
        if (data.kpi && lessonsList.length > 0) {
          const calculatedKpi = calculateKPIFromLessons(lessonsList);
          // Используем расчётные значения если бэкенд вернул нули
          if ((!data.kpi.revenue_sum || data.kpi.revenue_sum === 0) && calculatedKpi.revenue > 0) {
            console.warn('Backend returned zero revenue, using calculated value:', calculatedKpi);
            data.kpi = {
              ...data.kpi,
              revenue_sum: calculatedKpi.revenue,
              paid_sum: calculatedKpi.paid_children,
              trial_sum: calculatedKpi.trial_children,
            };
          }
        }
        
        // Сохраняем список занятий для расчёта прибыли
        setDashboardData({ ...data, lessons: lessonsList });
      }
    } catch (error) {
      console.error('Ошибка загрузки дашборда:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <Layout>
        <LoadingSpinner size="large" text="Загрузка дашборда..." />
      </Layout>
    );
  }

  if (!dashboardData) {
    return (
      <Layout>
        <div className="dashboard-error">Не удалось загрузить данные дашборда</div>
      </Layout>
    );
  }
  
  // Расчёт прибыли из занятий (выручка - зарплаты)
  const calculateProfit = () => {
    if (!lessons || lessons.length === 0) {
      // Если занятий нет, пытаемся использовать KPI с бэкенда
      if (kpi && kpi.revenue_sum !== undefined) {
        // Но зарплаты в KPI нет, поэтому вернём только выручку как fallback
        return kpi.revenue_sum || 0;
      }
      return 0;
    }
    
    let totalRevenue = 0;
    let totalSalary = 0;
    
    lessons.forEach((lesson) => {
      if (lesson.revenue !== undefined && lesson.revenue !== null) {
        totalRevenue += lesson.revenue;
      }
      if (lesson.teacher_salary !== undefined && lesson.teacher_salary !== null) {
        totalSalary += lesson.teacher_salary;
      }
    });
    
    return totalRevenue - totalSalary;
  };
  
  const profit = calculateProfit();

  const toggleBranch = (branchKey) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branchKey)) next.delete(branchKey);
      else next.add(branchKey);
      return next;
    });
  };

  const tableColumns = [
    { key: 'starts_at', title: 'Дата/Время', render: (value) => new Date(value).toLocaleString('ru-RU') },
    { key: 'branch_name', title: 'Филиал' },
    { key: 'teacher_name', title: 'Преподаватель' },
    { key: 'paid_children', title: 'Платные', align: 'center' },
    { key: 'trial_children', title: 'Пробные', align: 'center' },
    { key: 'total_children', title: 'Всего', align: 'center' },
    {
      key: 'instruction',
      title: 'Инструкция',
      render: (_, row) => {
        if (row.is_creative) return 'Творческое';
        return row.instruction_name || '—';
      },
    },
    { key: 'revenue', title: 'Выручка', render: (value) => formatCurrency(value || 0), align: 'right' },
    { 
      key: 'profit', 
      title: 'Прибыль', 
      render: (_, row) => {
        const revenue = row.revenue || 0;
        const salary = row.teacher_salary || 0;
        const profit = revenue - salary;
        return (
          <span style={{ color: profit >= 0 ? '#059669' : '#dc2626' }}>
            {formatCurrency(profit)}
          </span>
        );
      }, 
      align: 'right' 
    },
  ];

  // Колонки таблицы без филиала (для блока внутри филиала)
  const tableColumnsWithoutBranch = tableColumns.filter((col) => col.key !== 'branch_name');

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Дашборд</h1>
        </div>

        <div className="dashboard-filters-wrap">
          <button
            type="button"
            className="dashboard-filters-toggle"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="dashboard-filters-content"
          >
            <span className="dashboard-filters-toggle-icon"><IconFilter /></span>
            <span className="dashboard-filters-toggle-label">Фильтр</span>
            <span className={`dashboard-filters-toggle-chevron ${filtersOpen ? 'open' : ''}`}>
              {filtersOpen ? <IconChevronUp /> : <IconChevronDown />}
            </span>
          </button>
          <div id="dashboard-filters-content" className={`dashboard-filters-content ${filtersOpen ? 'open' : ''}`}>
            <Card className="dashboard-filters">
              <div className="filters-grid">
                <div className="period-mode">
              <div className="period-mode-label">Период</div>
              <div className="period-mode-buttons">
                <button
                  type="button"
                  className={`period-btn ${periodMode === 'month' ? 'active' : ''}`}
                  onClick={() => setPeriodMode('month')}
                >
                  Месяц
                </button>
                <button
                  type="button"
                  className={`period-btn ${periodMode === 'range' ? 'active' : ''}`}
                  onClick={() => setPeriodMode('range')}
                >
                  Диапазон
                </button>
              </div>
            </div>

            {periodMode === 'month' ? (
              <Input
                type="month"
                label="Месяц"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            ) : (
              <>
                <Input
                  type="month"
                  label="Месяц начала"
                  value={rangeStartMonth}
                  onChange={(e) => setRangeStartMonth(e.target.value)}
                />
                <Input
                  type="month"
                  label="Месяц конца"
                  value={rangeEndMonth}
                  onChange={(e) => setRangeEndMonth(e.target.value)}
                />
              </>
            )}
            <DepartmentSelector
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              label="Отдел"
            />
            <Input
              type="text"
              label="Филиал ID"
              value={filters.branch_id}
              onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
              placeholder="Опционально"
            />
            <Input
              type="text"
              label="Преподаватель ID"
              value={filters.teacher_id}
              onChange={(e) => setFilters({ ...filters, teacher_id: e.target.value })}
              placeholder="Опционально"
            />
            <div className="filters-actions">
              <Button onClick={loadDashboard} variant="primary">Применить</Button>
              <Button
                onClick={() => {
                  setFilters({ department_id: '', branch_id: '', teacher_id: '' });
                  setSelectedDepartment('');
                  setPeriodMode('month');
                  setRangeStartMonth('');
                  setRangeEndMonth('');
                  setMonth(getCurrentMonth());
                }}
                variant="secondary"
              >
                Сбросить
              </Button>
            </div>
              </div>
            </Card>
          </div>
        </div>

        {kpi && (
          <div className="dashboard-kpi">
            <KPICard
              title="Выручка"
              value={formatCurrency(kpi.revenue_sum || kpi.revenue || 0)}
              icon={<IconRevenue />}
              color="#059669"
            />
            <KPICard
              title="Прибыль"
              value={formatCurrency(profit)}
              subtitle={profit >= 0 ? 'Выручка - зарплаты' : 'Отрицательная'}
              icon={<IconProfit />}
              color={profit >= 0 ? "#10b981" : "#ef4444"}
            />
            <KPICard
              title="Платные дети"
              value={formatNumber(kpi.paid_sum || kpi.paid_children_sum || kpi.paid_children || 0)}
              icon={<IconPeople />}
              color="#0369a1"
            />
            <KPICard
              title="Пробные дети"
              value={formatNumber(kpi.trial_sum || kpi.trial_children_sum || kpi.trial_children || 0)}
              icon={<IconTarget />}
              color="#7c3aed"
            />
            <KPICard
              title="Всего детей"
              value={formatNumber(kpi.total_children_sum || kpi.total_children || 0)}
              icon={<IconChartBar />}
              color="#dc2626"
            />
            <KPICard
              title="Занятий"
              value={formatNumber(kpi.lessons_count || 0)}
              icon={<IconLessons />}
              color="#ea580c"
            />
            <KPICard
              title="Среднее на занятие"
              value={kpi.avg_children_per_lesson ? formatNumber(kpi.avg_children_per_lesson.toFixed(1)) : 
                     (kpi.lessons_count && kpi.lessons_count > 0 && kpi.total_children_sum ? 
                      formatNumber((kpi.total_children_sum / kpi.lessons_count).toFixed(1)) : '0')}
              icon={<IconChartLine />}
              color="#0891b2"
            />
          </div>
        )}

        {revenueSalaryProfitChartData.length > 0 && (
          <Card title="Рост выручки, зарплат и прибыли">
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
              <ComposedChart data={revenueSalaryProfitChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="dateKey"
                  tickFormatter={formatChartDateLabel}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(value), name]}
                  labelFormatter={formatChartDateLabel}
                />
                {!isMobile && <Legend />}
                <Line type="monotone" dataKey="revenue" stroke="#059669" name="Выручка" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="salary" stroke="#ea580c" name="Зарплаты" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="profit" stroke="#0369a1" name="Прибыль" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        )}

        <div className="dashboard-grid">
          {top_branches && top_branches.length > 0 && (
            <Card title="Топ филиалов">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={top_branches.map(item => ({
                  name: item.branch_name || item.name,
                  revenue: item.revenue_sum || item.revenue || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#059669" name="Выручка" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {top_teachers && top_teachers.length > 0 && (
            <Card title="Топ преподавателей">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={top_teachers.map(item => ({
                  name: item.teacher_name || item.name,
                  lessons_count: item.lessons_count || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="lessons_count" fill="#0369a1" name="Занятий" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {lessonsByBranch.length > 0 && (
          <Card title="Занятия за период">
            <div className="lessons-by-branch">
              {lessonsByBranch.map((group) => {
                const branchKey = String(group.branchId || group.branchName);
                const isOpen = expandedBranches.has(branchKey);
                return (
                  <div key={branchKey} className="lessons-branch-group">
                    <button
                      type="button"
                      className={`lessons-branch-header ${isOpen ? 'open' : ''}`}
                      onClick={() => toggleBranch(branchKey)}
                      aria-expanded={isOpen}
                    >
                      <span className="lessons-branch-chevron">
                        {isOpen ? <IconChevronUp /> : <IconChevronDown />}
                      </span>
                      <span className="lessons-branch-name">{group.branchName}</span>
                      <span className="lessons-branch-stats">
                        <span className="lessons-branch-stat">
                          <span className="lessons-branch-stat-label">Выручка</span>
                          <span className="lessons-branch-stat-value lessons-branch-revenue">
                            {formatCurrency(group.revenue)}
                          </span>
                        </span>
                        <span className="lessons-branch-stat">
                          <span className="lessons-branch-stat-label">Прибыль</span>
                          <span className={`lessons-branch-stat-value lessons-branch-profit ${group.profit >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(group.profit)}
                          </span>
                        </span>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="lessons-branch-body">
                        <Table columns={tableColumnsWithoutBranch} data={group.lessons} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default OwnerDashboard;
