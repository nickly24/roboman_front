import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { formatCurrency, formatNumber, getCurrentMonth } from '../../utils/format';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import DepartmentSelector from '../../components/DepartmentSelector/DepartmentSelector';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import useMediaQuery from '../../hooks/useMediaQuery';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import './Analytics.css';

const TABS = [
  { id: 'revenue', label: 'Выручка' },
  { id: 'attendance', label: 'Посещаемость' },
  { id: 'branches', label: 'Филиалы' },
  { id: 'teachers', label: 'Преподаватели' },
  { id: 'coefficients', label: 'Коэффициенты' },
  { id: 'modeling', label: 'Бизнес-моделирование' },
];

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const buildPeriodParams = (periodMode, month, rangeStart, rangeEnd) => {
  const params = new URLSearchParams();
  if (periodMode === 'range' && rangeStart && rangeEnd) {
    params.append('start', `${rangeStart}-01T00:00:00`);
    const [ey, em] = rangeEnd.split('-').map(Number);
    const endDate = new Date(Date.UTC(ey, em || 1, 1));
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    params.append('end', endDate.toISOString().slice(0, 19));
  } else {
    params.append('month', month || getCurrentMonth());
  }
  return params;
};

const SliderControl = ({ label, value, min, max, step = 1, unit = '', onChange, format = (v) => v }) => (
  <div className="analytics-slider-group">
    <div className="analytics-slider-label">
      <span>{label}</span>
      <span className="analytics-slider-value">{format(value)}{unit}</span>
    </div>
    <div className="analytics-slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  </div>
);

const Analytics = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(true);
  const [periodMode, setPeriodMode] = useState('year');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(getCurrentMonth());
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [branchesOptions, setBranchesOptions] = useState([]);
  const [teachersOptions, setTeachersOptions] = useState([]);
  const [branchesList, setBranchesList] = useState([]);

  const [dashboardData, setDashboardData] = useState(null);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [attendanceByMonth, setAttendanceByMonth] = useState([]);
  const [lessons, setLessons] = useState([]);

  // Моделирование: базовые значения для расчёта
  const [modelPrice, setModelPrice] = useState(1500);
  const [modelChildrenPct, setModelChildrenPct] = useState(100);
  const [modelBranchesPct, setModelBranchesPct] = useState(100);
  const [modelTrialPct, setModelTrialPct] = useState(100);
  const [modelSalaryPct, setModelSalaryPct] = useState(100);
  const [modelLessonsPct, setModelLessonsPct] = useState(100);
  const [modelExcludeBranchId, setModelExcludeBranchId] = useState('');

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (periodMode === 'year') {
      p.append('start', `${year}-01-01T00:00:00`);
      p.append('end', `${year + 1}-01-01T00:00:00`);
    } else {
      const base = buildPeriodParams(periodMode, month, rangeStart, rangeEnd);
      base.forEach((value, key) => p.append(key, value));
    }
    if (departmentId) p.append('department_id', departmentId);
    if (branchId) p.append('branch_id', branchId);
    if (teacherId) p.append('teacher_id', teacherId);
    return p;
  }, [periodMode, month, rangeStart, rangeEnd, year, departmentId, branchId, teacherId]);

  useEffect(() => {
    Promise.all([
      apiClient.get(API_ENDPOINTS.BRANCHES),
      apiClient.get(API_ENDPOINTS.TEACHERS),
    ]).then(([brResp, teachResp]) => {
      if (brResp.data?.ok) {
        const list = Array.isArray(brResp.data.data?.items) ? brResp.data.data.items : (Array.isArray(brResp.data.data) ? brResp.data.data : []);
        setBranchesList(list);
        setBranchesOptions([{ value: '', label: 'Все филиалы' }, ...list.map((b) => ({ value: String(b.id), label: b.name || `#${b.id}` }))]);
      }
      if (teachResp.data?.ok) {
        const list = Array.isArray(teachResp.data.data?.items) ? teachResp.data.data.items : (Array.isArray(teachResp.data.data) ? teachResp.data.data : []);
        setTeachersOptions([{ value: '', label: 'Все преподаватели' }, ...list.filter((t) => t.status === 'working').map((t) => ({ value: String(t.id), label: t.full_name || `#${t.id}` }))]);
      }
    }).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const lessonsParams = new URLSearchParams(params);
      lessonsParams.append('limit', '500');
      lessonsParams.append('sort', 'starts_at');
      lessonsParams.append('order', 'asc');

      const [dashResp, revResp, attResp, lessonsResp] = await Promise.all([
        apiClient.get(`${API_ENDPOINTS.DASHBOARD_OWNER}?${params}`),
        apiClient.get(`${API_ENDPOINTS.REPORTS_REVENUE_BY_MONTH}?${params}`),
        apiClient.get(`${API_ENDPOINTS.REPORTS_ATTENDANCE_BY_MONTH}?${params}`),
        apiClient.get(`${API_ENDPOINTS.LESSONS}?${lessonsParams}`),
      ]);

      if (dashResp.data?.ok) setDashboardData(dashResp.data.data);
      if (revResp.data?.ok) setRevenueByMonth(revResp.data.data?.items || []);
      if (attResp.data?.ok) setAttendanceByMonth(attResp.data.data?.items || []);
      if (lessonsResp.data?.ok) {
        const data = lessonsResp.data.data;
        setLessons(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error('Ошибка загрузки аналитики:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.toString()]);

  useEffect(() => {
    if (lessons.length > 0) {
      const avg = lessons.reduce((s, l) => s + Number(l.price_snapshot || 0), 0) / lessons.length;
      if (avg > 0) setModelPrice(Math.round(avg));
    }
  }, [lessons.length]);

  const kpi = dashboardData?.kpi;
  const topBranches = dashboardData?.top_branches || [];
  const topTeachers = dashboardData?.top_teachers || [];

  const totalRevenue = useMemo(() => {
    let s = 0;
    lessons.forEach((l) => { s += Number(l.revenue) || (l.price_snapshot && l.paid_children ? l.price_snapshot * l.paid_children : 0); });
    return s;
  }, [lessons]);
  const totalSalary = useMemo(() => {
    let s = 0;
    lessons.forEach((l) => { s += Number(l.teacher_salary) || 0; });
    return s;
  }, [lessons]);
  const totalProfit = totalRevenue - totalSalary;
  const totalChildren = useMemo(() => {
    let s = 0;
    lessons.forEach((l) => { s += Number(l.total_children) || 0; });
    return s;
  }, [lessons]);

  const revenueByDay = useMemo(() => {
    const byDay = new Map();
    lessons.forEach((l) => {
      const d = new Date(l.starts_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const rev = Number(l.revenue) || (l.price_snapshot && l.paid_children ? l.price_snapshot * l.paid_children : 0);
      if (!byDay.has(key)) byDay.set(key, { dateKey: key, revenue: 0, children: 0, lessons: 0 });
      const row = byDay.get(key);
      row.revenue += rev;
      row.children += Number(l.total_children) || 0;
      row.lessons += 1;
    });
    return Array.from(byDay.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [lessons]);

  const attendanceByMonthChart = useMemo(() => {
    return attendanceByMonth.map((a) => ({
      month: a.month,
      label: a.month ? new Date(a.month + '-01').toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }) : a.month,
      children: Number(a.total_children_sum) || 0,
      paid: Number(a.paid_sum) || 0,
      trial: Number(a.trial_sum) || 0,
    }));
  }, [attendanceByMonth]);

  const byDayOfMonth = useMemo(() => {
    const byDay = new Array(31).fill(0).map((_, i) => ({ day: i + 1, revenue: 0, children: 0, lessons: 0 }));
    lessons.forEach((l) => {
      const d = new Date(l.starts_at);
      const day = d.getDate();
      if (day >= 1 && day <= 31) {
        const idx = day - 1;
        byDay[idx].revenue += Number(l.revenue) || (l.price_snapshot && l.paid_children ? l.price_snapshot * l.paid_children : 0);
        byDay[idx].children += Number(l.total_children) || 0;
        byDay[idx].lessons += 1;
      }
    });
    return byDay;
  }, [lessons]);

  const byDayOfWeek = useMemo(() => {
    const byWday = WEEKDAYS.map((name, i) => ({ weekday: i, name, revenue: 0, children: 0, lessons: 0 }));
    lessons.forEach((l) => {
      const d = new Date(l.starts_at);
      const w = d.getDay();
      byWday[w].revenue += Number(l.revenue) || (l.price_snapshot && l.paid_children ? l.price_snapshot * l.paid_children : 0);
      byWday[w].children += Number(l.total_children) || 0;
      byWday[w].lessons += 1;
    });
    return byWday;
  }, [lessons]);

  const fillCoeffByBranch = useMemo(() => {
    const map = new Map();
    lessons.forEach((l) => {
      const bid = l.branch_id;
      const name = l.branch_name || `Филиал #${bid}`;
      if (!map.has(bid)) map.set(bid, { branch_id: bid, branch_name: name, totalChildren: 0, lessonsCount: 0 });
      const row = map.get(bid);
      row.totalChildren += Number(l.total_children) || 0;
      row.lessonsCount += 1;
    });
    return Array.from(map.values()).map((r) => ({
      ...r,
      avgPerLesson: r.lessonsCount ? (r.totalChildren / r.lessonsCount).toFixed(1) : 0,
    })).sort((a, b) => Number(b.avgPerLesson) - Number(a.avgPerLesson));
  }, [lessons]);

  const branchAvgChildren = useMemo(() => {
    const map = new Map();
    lessons.forEach((l) => {
      const bid = l.branch_id;
      const name = l.branch_name || `#${bid}`;
      if (!map.has(bid)) map.set(bid, { branch_id: bid, branch_name: name, totalChildren: 0, lessonsCount: 0 });
      const row = map.get(bid);
      row.totalChildren += Number(l.total_children) || 0;
      row.lessonsCount += 1;
    });
    const result = new Map();
    map.forEach((v, k) => {
      result.set(k, v.lessonsCount ? v.totalChildren / v.lessonsCount : 0);
    });
    return result;
  }, [lessons]);

  const teacherVsBranchAvg = useMemo(() => {
    const teacherMap = new Map();
    lessons.forEach((l) => {
      const key = `${l.teacher_id}-${l.branch_id}`;
      const tname = l.teacher_name || `#${l.teacher_id}`;
      const bname = l.branch_name || `#${l.branch_id}`;
      if (!teacherMap.has(key)) teacherMap.set(key, { teacher_id: l.teacher_id, teacher_name: tname, branch_id: l.branch_id, branch_name: bname, children: 0, lessons: 0 });
      const row = teacherMap.get(key);
      row.children += Number(l.total_children) || 0;
      row.lessons += 1;
    });
    return Array.from(teacherMap.values())
      .filter((r) => r.lessons >= 2)
      .map((r) => {
        const teacherAvg = r.children / r.lessons;
        const branchAvg = branchAvgChildren.get(r.branch_id) || 0;
        const diff = branchAvg ? ((teacherAvg - branchAvg) / branchAvg) * 100 : 0;
        return { ...r, teacherAvg: teacherAvg.toFixed(1), branchAvg: branchAvg.toFixed(1), diffPct: diff.toFixed(0) };
      })
      .sort((a, b) => Number(b.diffPct) - Number(a.diffPct));
  }, [lessons, branchAvgChildren]);

  const branchComparison = useMemo(() => {
    const map = new Map();
    lessons.forEach((l) => {
      const bid = l.branch_id;
      const name = l.branch_name || `#${bid}`;
      if (!map.has(bid)) map.set(bid, { branch_id: bid, name, revenue: 0, children: 0, lessons: 0, salary: 0 });
      const row = map.get(bid);
      row.revenue += Number(l.revenue) || (l.price_snapshot && l.paid_children ? l.price_snapshot * l.paid_children : 0);
      row.children += Number(l.total_children) || 0;
      row.lessons += 1;
      row.salary += Number(l.teacher_salary) || 0;
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [lessons]);

  const metrics = useMemo(() => {
    const revByMonth = revenueByMonth;
    const lastMonth = revByMonth[revByMonth.length - 1];
    const prevMonth = revByMonth[revByMonth.length - 2];
    const momGrowth = prevMonth && lastMonth && prevMonth.revenue_sum
      ? ((Number(lastMonth.revenue_sum) - Number(prevMonth.revenue_sum)) / Number(prevMonth.revenue_sum)) * 100
      : null;
    const avgPrice = totalChildren ? totalRevenue / totalChildren : 0;
    const margin = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;
    const revenuePerLesson = lessons.length ? totalRevenue / lessons.length : 0;
    return {
      momGrowth,
      avgPricePerChild: avgPrice,
      profitMargin: margin,
      revenuePerLesson,
    };
  }, [revenueByMonth, totalRevenue, totalChildren, totalProfit, lessons.length]);

  const modelingBase = useMemo(() => {
    const filtered = modelExcludeBranchId ? lessons.filter((l) => String(l.branch_id) !== modelExcludeBranchId) : lessons;
    let rev = 0, sal = 0;
    filtered.forEach((l) => {
      rev += Number(l.revenue) || (l.price_snapshot && l.paid_children ? l.price_snapshot * l.paid_children : 0);
      sal += Number(l.teacher_salary) || 0;
    });
    return { revenue: rev, salary: sal, lessonsCount: filtered.length };
  }, [lessons, modelExcludeBranchId]);

  const avgModelPrice = useMemo(() => {
    const filtered = modelExcludeBranchId ? lessons.filter((l) => String(l.branch_id) !== modelExcludeBranchId) : lessons;
    return filtered.length ? filtered.reduce((s, l) => s + Number(l.price_snapshot || 0), 0) / filtered.length : 1500;
  }, [lessons, modelExcludeBranchId]);

  const modelingResults = useMemo(() => {
    const { revenue: baseRev, salary: baseSal } = modelingBase;
    const r = baseRev * (modelPrice / Math.max(1, avgModelPrice)) * (modelChildrenPct / 100) * (modelBranchesPct / 100) * (modelTrialPct / 100) * (modelLessonsPct / 100);
    const s = baseSal * (modelSalaryPct / 100) * (modelLessonsPct / 100);
    return { revenue: r, profit: r - s, salary: s };
  }, [modelingBase, avgModelPrice, modelPrice, modelChildrenPct, modelBranchesPct, modelTrialPct, modelSalaryPct, modelLessonsPct]);

  const teacherVsBranchAvgChartData = useMemo(() => {
    return teacherVsBranchAvg.slice(0, 15).map((r) => ({
      ...r,
      label: `${(r.teacher_name || '').slice(0, 12)} / ${(r.branch_name || '').slice(0, 10)}`,
    }));
  }, [teacherVsBranchAvg]);

  const formatChartCurrency = (v) => `${(v / 1000).toFixed(0)}k`;
  const formatChartDate = (dateKey) => {
    const [y, m, d] = (dateKey || '').split('-').map(Number);
    if (!y) return dateKey;
    return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  if (loading && !dashboardData) {
    return (
      <Layout>
        <div className="analytics-loading">
          <LoadingSpinner size="large" text="Загрузка аналитики..." />
        </div>
      </Layout>
    );
  }

  const renderTabContent = () => {
    if (activeTab === 'revenue') {
      return (
        <>
          <div className="analytics-metrics-grid">
            <div className="analytics-metric-card">
              <div className="analytics-metric-label">Выручка</div>
              <div className="analytics-metric-value">{formatCurrency(totalRevenue)}</div>
            </div>
            <div className="analytics-metric-card">
              <div className="analytics-metric-label">Прибыль</div>
              <div className={`analytics-metric-value ${totalProfit >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(totalProfit)}</div>
            </div>
            <div className="analytics-metric-card">
              <div className="analytics-metric-label">Маржа прибыли</div>
              <div className={`analytics-metric-value ${metrics.profitMargin >= 0 ? 'positive' : 'negative'}`}>{metrics.profitMargin.toFixed(1)}%</div>
            </div>
            <div className="analytics-metric-card">
              <div className="analytics-metric-label">Рост MoM</div>
              <div className={`analytics-metric-value ${metrics.momGrowth != null ? (metrics.momGrowth >= 0 ? 'positive' : 'negative') : ''}`}>
                {metrics.momGrowth != null ? `${metrics.momGrowth >= 0 ? '+' : ''}${metrics.momGrowth.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="analytics-metric-card">
              <div className="analytics-metric-label">Выручка на ребёнка</div>
              <div className="analytics-metric-value">{formatCurrency(metrics.avgPricePerChild)}</div>
            </div>
          </div>

          {revenueByDay.length > 0 && (
            <Card title="Выручка по дням" subtitle="Линейный график с ежедневными точками">
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height={isMobile ? 280 : 360}>
                  <LineChart data={revenueByDay} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="dateKey" tickFormatter={formatChartDate} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} interval="preserveStartEnd" minTickGap={30} />
                    <YAxis tickFormatter={formatChartCurrency} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <Tooltip formatter={(v) => [formatCurrency(v), 'Выручка']} labelFormatter={formatChartDate} contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} name="Выручка" dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {byDayOfMonth.some((d) => d.revenue > 0) && (
            <Card title="Выручка по дням месяца" subtitle="Какой день месяца обычно прибыльнее">
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                  <BarChart data={byDayOfMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="day" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} interval={4} />
                    <YAxis tickFormatter={formatChartCurrency} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                    <Bar dataKey="revenue" fill="var(--color-info)" name="Выручка" radius={[2, 2, 0, 0]}>
                      {byDayOfMonth.map((_, i) => (
                        <Cell key={i} fill={byDayOfMonth[i].revenue > 0 ? 'var(--color-info)' : 'var(--color-bg-elevated)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {byDayOfWeek.some((d) => d.revenue > 0) && (
            <Card title="Выручка по дням недели" subtitle="Какой день недели приносит больше">
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                  <BarChart data={byDayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <YAxis tickFormatter={formatChartCurrency} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                    <Bar dataKey="revenue" fill="var(--color-success)" name="Выручка" radius={[4, 4, 0, 0]}>
                      {byDayOfWeek.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      );
    }

    if (activeTab === 'attendance') {
      return (
        <>
          {attendanceByMonthChart.length > 0 && (
            <Card title="Посещаемость по месяцам" subtitle="Дети (всего / платные / пробные)">
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height={isMobile ? 280 : 360}>
                  <LineChart data={attendanceByMonthChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <YAxis stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="children" stroke="#3b82f6" name="Всего детей" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="paid" stroke="#10b981" name="Платные" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="trial" stroke="#f59e0b" name="Пробные" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      );
    }

    if (activeTab === 'branches') {
      return (
        <>
          {topBranches.length > 0 && (
            <Card title="Топ филиалов по выручке" subtitle="Рейтинг филиалов">
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height={Math.min(40 * topBranches.length, 400)}>
                  <BarChart data={topBranches} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" tickFormatter={formatChartCurrency} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <YAxis type="category" dataKey="branch_name" width={95} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                    <Bar dataKey="revenue_sum" fill="var(--color-primary)" name="Выручка" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          {branchComparison.length > 0 && (
            <Card title="Сравнение филиалов" subtitle="Выручка и зарплаты">
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
                  <BarChart data={branchComparison} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                    <YAxis tickFormatter={formatChartCurrency} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Выручка" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="salary" fill="#f59e0b" name="Зарплаты" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      );
    }

    if (activeTab === 'teachers') {
      return (
        <>
          {topTeachers.length > 0 && (
            <Card title="Топ преподавателей по занятиям" subtitle="Кто проводит больше всего занятий">
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height={Math.min(40 * topTeachers.length, 400)}>
                  <BarChart data={topTeachers} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <YAxis type="category" dataKey="teacher_name" width={95} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                    <Bar dataKey="lessons_count" fill="var(--color-orange)" name="Занятий" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          {teacherVsBranchAvgChartData.length > 0 && (
            <Card
              title="Преподаватель vs среднее по филиалу"
              subtitle="Кто выше/ниже среднего детей на занятие в своём саду (зелёный — выше среднего, красный — ниже)"
            >
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height={Math.min(36 * teacherVsBranchAvgChartData.length, 450)}>
                  <BarChart data={teacherVsBranchAvgChartData} layout="vertical" margin={{ left: 100, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" domain={['auto', 'auto']} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={95} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                    <Tooltip
                      content={({ payload }) => (payload?.[0] ? (
                        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', padding: 12, borderRadius: 8 }}>
                          <div><strong>{payload[0].payload.teacher_name}</strong> в {payload[0].payload.branch_name}</div>
                          <div>Преподаватель: {payload[0].payload.teacherAvg} детей/занятие</div>
                          <div>Среднее по филиалу: {payload[0].payload.branchAvg}</div>
                          <div>Отклонение: {Number(payload[0].payload.diffPct) >= 0 ? '+' : ''}{payload[0].payload.diffPct}%</div>
                        </div>
                      ) : null)}
                    />
                    <ReferenceLine x={0} stroke="var(--color-border)" />
                    <Bar dataKey="diffPct" name="% от среднего по филиалу" radius={[0, 4, 4, 0]}>
                      {teacherVsBranchAvgChartData.map((row, i) => (
                        <Cell key={i} fill={Number(row.diffPct) >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Метрика: на сколько % среднее детей на занятие у преподавателя отличается от среднего по филиалу.
              </div>
            </Card>
          )}
        </>
      );
    }

    if (activeTab === 'coefficients') {
      return (
        <>
          <div className="analytics-metrics-grid">
            <div className="analytics-metric-card">
              <div className="analytics-metric-label">Среднее детей/занятие (общее)</div>
              <div className="analytics-metric-value">
                {lessons.length ? (totalChildren / lessons.length).toFixed(1) : '—'}
              </div>
            </div>
            <div className="analytics-metric-card">
              <div className="analytics-metric-label">Выручка на занятие</div>
              <div className="analytics-metric-value">{formatCurrency(metrics.revenuePerLesson)}</div>
            </div>
          </div>
          {fillCoeffByBranch.length > 0 && (
            <Card title="Коэффициент заполняемости по филиалам" subtitle="Среднее детей на занятие — чем выше, тем лучше загрузка">
              <div style={{ maxWidth: 500 }}>
                {fillCoeffByBranch.map((row) => (
                  <div key={row.branch_id} className="analytics-coef-row">
                    <span className="analytics-coef-label" title={row.branch_name}>{row.branch_name}</span>
                    <div className="analytics-coef-bar-wrap">
                      <div
                        className="analytics-coef-bar"
                        style={{ width: `${((Number(row.avgPerLesson) || 0) / Math.max(1, ...fillCoeffByBranch.map((r) => Number(r.avgPerLesson) || 0))) * 100}%` }}
                      />
                    </div>
                    <span className="analytics-coef-value">{row.avgPerLesson} детей</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      );
    }

    if (activeTab === 'modeling') {
      return (
        <div className="analytics-modeling">
          <Card title="Параметры сценария" subtitle="Крути ползунки — «Что если?»">
            <div className="analytics-sliders">
              <div className="analytics-slider-group">
                <label className="input-label">Исключить филиал из расчёта</label>
                <Select
                  value={modelExcludeBranchId}
                  onChange={(e) => setModelExcludeBranchId(e.target.value)}
                  options={[{ value: '', label: 'Не исключать' }, ...branchesOptions.filter((o) => o.value && o.value !== '')]}
                  placeholder="Все филиалы"
                />
                {modelExcludeBranchId && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Сценарий: «Что если убрать этот филиал?»
                  </span>
                )}
              </div>
              <SliderControl
                label="Цена за ребёнка"
                value={modelPrice}
                min={500}
                max={5000}
                step={100}
                unit=" ₽"
                format={(v) => v}
                onChange={setModelPrice}
              />
              <SliderControl
                label="Детей (множитель)"
                value={modelChildrenPct}
                min={50}
                max={150}
                step={5}
                unit="%"
                format={(v) => v}
                onChange={setModelChildrenPct}
              />
              <SliderControl
                label="Филиалов / точек"
                value={modelBranchesPct}
                min={50}
                max={150}
                step={5}
                unit="%"
                format={(v) => v}
                onChange={setModelBranchesPct}
              />
              <SliderControl
                label="Пробных занятий"
                value={modelTrialPct}
                min={50}
                max={150}
                step={5}
                unit="%"
                format={(v) => v}
                onChange={setModelTrialPct}
              />
              <SliderControl
                label="Зарплата преподавателей"
                value={modelSalaryPct}
                min={80}
                max={130}
                step={5}
                unit="%"
                format={(v) => v}
                onChange={setModelSalaryPct}
              />
              <SliderControl
                label="Количество занятий"
                value={modelLessonsPct}
                min={50}
                max={150}
                step={5}
                unit="%"
                format={(v) => v}
                onChange={setModelLessonsPct}
              />
            </div>
          </Card>
          <div className="analytics-modeling-results">
            <Card title="Результат сценария" subtitle="Как изменится выручка и прибыль">
              <div className="analytics-metrics-grid">
                <div className="analytics-metric-card">
                  <div className="analytics-metric-label">Выручка (прогноз)</div>
                  <div className="analytics-metric-value">{formatCurrency(modelingResults.revenue)}</div>
                </div>
                <div className="analytics-metric-card">
                  <div className="analytics-metric-label">Зарплаты (прогноз)</div>
                  <div className="analytics-metric-value">{formatCurrency(modelingResults.salary)}</div>
                </div>
                <div className="analytics-metric-card">
                  <div className="analytics-metric-label">Прибыль (прогноз)</div>
                  <div className={`analytics-metric-value ${modelingResults.profit >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(modelingResults.profit)}
                  </div>
                </div>
                <div className="analytics-metric-card">
                  <div className="analytics-metric-label">Отклонение от факта</div>
                  <div className={`analytics-metric-value ${modelingResults.revenue - modelingBase.revenue >= 0 ? 'positive' : 'negative'}`}>
                    {modelingBase.revenue ? `${(((modelingResults.revenue - modelingBase.revenue) / modelingBase.revenue) * 100).toFixed(0)}%` : '—'}
                  </div>
                </div>
              </div>
              <p style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Модель на текущих данных. «Цена» — базовая (средняя {formatCurrency(avgModelPrice)}). 
                Ползунки — % от текущего уровня. Выбери «Исключить филиал» — посмотри, как изменится прибыль без него.
              </p>
            </Card>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Layout>
      <div className="analytics-page">
        <div className="analytics-header">
          <h1 className="analytics-title">Аналитика</h1>
          <p className="analytics-subtitle">Отчёты, графики, метрики и бизнес-моделирование</p>
        </div>

        <Card className="analytics-filters">
          <div className="filters-grid">
            <div className="period-mode">
              <div className="period-mode-label" style={{ marginBottom: 8 }}>Период</div>
              <div className="period-mode-buttons" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['year', 'month', 'range'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`period-btn ${periodMode === mode ? 'active' : ''}`}
                    onClick={() => setPeriodMode(mode)}
                  >
                    {mode === 'year' ? 'Год' : mode === 'month' ? 'Месяц' : 'Диапазон'}
                  </button>
                ))}
              </div>
            </div>
            {periodMode === 'year' && (
              <div className="form-group">
                <label className="input-label">Год</label>
                <select className="select" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
                  {[2023, 2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
            {periodMode === 'month' && (
              <Input type="month" label="Месяц" value={month} onChange={(e) => setMonth(e.target.value)} />
            )}
            {periodMode === 'range' && (
              <>
                <Input type="month" label="Начало" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                <Input type="month" label="Конец" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
              </>
            )}
            <DepartmentSelector value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} label="Отдел" />
            <Select label="Филиал" value={branchId} onChange={(e) => setBranchId(e.target.value)} options={branchesOptions} placeholder="Все" />
            <Select label="Преподаватель" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} options={teachersOptions} placeholder="Все" />
            <div className="filters-actions" style={{ marginLeft: 'auto' }}>
              <Button variant="primary" onClick={loadData}>Применить</Button>
            </div>
          </div>
        </Card>

        <div className="analytics-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`analytics-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="analytics-widgets">
          {activeTab !== 'modeling' && !kpi && revenueByDay.length === 0 && lessons.length === 0 ? (
            <Card>
              <div className="analytics-empty">
                <p>Нет данных за выбранный период.</p>
                <p>Выберите другой период или сбросьте фильтры.</p>
              </div>
            </Card>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
