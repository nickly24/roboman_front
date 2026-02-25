import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { formatCurrency, formatDateTime, getCurrentMonth } from '../../utils/format';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Table from '../../components/Table/Table';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import Modal from '../../components/Modal/Modal';
import DepartmentSelector from '../../components/DepartmentSelector/DepartmentSelector';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import InvoiceModal from '../../components/InvoiceModal/InvoiceModal';
import LessonForm from './LessonForm';
import './Lessons.css';

const Lessons = () => {
  const { isOwner, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [viewMode, setViewMode] = useState('calendar');
  const [weekOffset, setWeekOffset] = useState(0);
  const [showInvoices, setShowInvoices] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filters, setFilters] = useState({
    branch_id: '',
    teacher_id: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [teacherBranches, setTeacherBranches] = useState([]);
  const [collapsedBranchIds, setCollapsedBranchIds] = useState(new Set());
  const [branchesOptions, setBranchesOptions] = useState([]);
  const [teachersOptions, setTeachersOptions] = useState([]);
  const [calendarEditMode, setCalendarEditMode] = useState(false);

  useEffect(() => {
    loadLessons();
  }, [month, filters, selectedDepartment]);

  useEffect(() => {
    if (isOwner) {
      Promise.all([
        apiClient.get(API_ENDPOINTS.BRANCHES),
        apiClient.get(API_ENDPOINTS.TEACHERS),
      ]).then(([brResp, teachResp]) => {
        if (brResp.data?.ok) {
          const data = brResp.data.data;
          const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
          setBranchesOptions([{ value: '', label: 'Все филиалы' }, ...list.map((b) => ({ value: String(b.id), label: b.name || `Филиал #${b.id}` }))]);
        }
        if (teachResp.data?.ok) {
          const data = teachResp.data.data;
          const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
          setTeachersOptions([{ value: '', label: 'Все преподаватели' }, ...list.filter((t) => t.status === 'working').map((t) => ({ value: String(t.id), label: t.full_name || `Преподаватель #${t.id}` }))]);
        }
      }).catch(() => {});
    }
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner && user?.profile?.id) {
      apiClient.get(API_ENDPOINTS.TEACHER_BRANCHES(user.profile.id)).then((resp) => {
        if (resp.data?.ok) {
          const data = resp.data.data;
          const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
          setTeacherBranches(list);
        }
      }).catch(() => setTeacherBranches([]));
    }
  }, [isOwner, user?.profile?.id]);

  useEffect(() => {
    setWeekOffset(0);
  }, [month]);

  const loadLessons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month, limit: '500', sort: 'starts_at', order: 'asc' });
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      if (filters.branch_id) params.append('branch_id', filters.branch_id);
      if (filters.teacher_id) params.append('teacher_id', filters.teacher_id);

      const response = await apiClient.get(`${API_ENDPOINTS.LESSONS}?${params}`);
      if (response.data.ok) {
        // Бэкенд возвращает {items: [...], limit, offset}
        const lessonsData = response.data.data;
        if (lessonsData && Array.isArray(lessonsData.items)) {
          setLessons(lessonsData.items);
        } else if (Array.isArray(lessonsData)) {
          // На случай, если бэкенд вернёт массив напрямую
          setLessons(lessonsData);
        } else {
          console.error('Неожиданный формат данных:', lessonsData);
          setLessons([]);
        }
      } else {
        console.error('Ошибка API:', response.data.error);
        setLessons([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки занятий:', error);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingLesson(null);
    setIsModalOpen(true);
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setIsModalOpen(true);
  };

  const handleDelete = async (lessonId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это занятие?')) {
      return;
    }

    try {
      await apiClient.delete(API_ENDPOINTS.LESSON(lessonId));
      loadLessons();
    } catch (error) {
      alert('Ошибка удаления занятия');
      console.error(error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingLesson(null);
    loadLessons();
  };

  const handleInvoice = (branchId, branchName) => {
    // Фильтруем занятия по филиалу
    const branchLessons = lessons.filter(l => l.branch_id === branchId || l.branch_id?.toString() === branchId?.toString());
    if (branchLessons.length > 0) {
      setInvoiceData({
        branchName,
        lessons: branchLessons,
        month,
      });
    }
  };

  const handleInvoiceClose = () => {
    setInvoiceData(null);
  };

  const handleSalaryToggle = async (lesson) => {
    if (!isOwner) return;
    const makeFree = !lesson.is_salary_free;
    const message = makeFree
      ? 'Сделать это занятие бесплатным (зарплата не начисляется)?'
      : 'Сделать это занятие платным (зарплата начисляется)?';
    if (!window.confirm(message)) return;
    try {
      const endpoint = makeFree
        ? API_ENDPOINTS.LESSON_SALARY_FREE(lesson.id)
        : API_ENDPOINTS.LESSON_SALARY_PAID(lesson.id);
      await apiClient.put(endpoint);
      loadLessons();
    } catch (error) {
      alert('Не удалось изменить оплату занятия');
      // eslint-disable-next-line no-console
      console.error(error);
    }
  };

  const isCurrentMonth = (value) => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return value === current;
  };

  const getMonthStart = (value) => {
    const [year, mon] = value.split('-');
    const d = new Date(Number(year), Number(mon) - 1, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getMonthEndExclusive = (value) => {
    const [year, mon] = value.split('-');
    const d = new Date(Number(year), Number(mon), 1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const weekIntersectsMonth = (weekStartDate, monthStartDate, monthEndDateExclusive) => {
    const weekEndDateExclusive = addDays(weekStartDate, 7);
    return weekStartDate < monthEndDateExclusive && weekEndDateExclusive > monthStartDate;
  };

  const formatWeekRange = (startDate) => {
    const endDate = addDays(startDate, 6);
    const fmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });
    return `${fmt.format(startDate)} – ${fmt.format(endDate)}`;
  };

  const toLocalDateKey = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const getDayTotals = (dayLessons) => {
    const revenueSum = dayLessons.reduce((sum, lesson) => sum + Number(lesson.revenue || 0), 0);
    const salarySum = dayLessons.reduce((sum, lesson) => sum + Number(lesson.teacher_salary || 0), 0);
    return {
      revenueSum,
      salarySum,
      profit: revenueSum - salarySum,
    };
  };

  // Для преподавателя — уникальные отделы: названия из занятий (department_name), затем из филиалов
  const teacherDepartments = React.useMemo(() => {
    const map = new Map();
    lessons.forEach((l) => {
      if (l.department_id != null && !map.has(l.department_id)) {
        const name = l.department_name && String(l.department_name).trim();
        map.set(l.department_id, { value: String(l.department_id), label: name || `Отдел #${l.department_id}` });
      }
    });
    teacherBranches.forEach((b) => {
      if (b.department_id != null && !map.has(b.department_id)) {
        const name = (b.department_name && String(b.department_name).trim()) || null;
        map.set(b.department_id, { value: String(b.department_id), label: name || `Отдел #${b.department_id}` });
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  }, [lessons, teacherBranches]);

  // Группируем занятия по филиалам для кнопок "Выставить счет"
  const branchesWithLessons = React.useMemo(() => {
    const branchesMap = new Map();
    lessons.forEach(lesson => {
      const branchId = lesson.branch_id;
      const branchName = lesson.branch_name || `Филиал #${branchId}`;
      if (!branchesMap.has(branchId)) {
        branchesMap.set(branchId, {
          id: branchId,
          name: branchName,
          lessonsCount: 0,
        });
      }
      branchesMap.get(branchId).lessonsCount += 1;
    });
    return Array.from(branchesMap.values());
  }, [lessons]);

  const baseDate = React.useMemo(() => {
    if (isCurrentMonth(month)) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      now.setDate(now.getDate() + weekOffset * 7);
      return now;
    }
    const [year, mon] = month.split('-');
    const d = new Date(Number(year), Number(mon) - 1, 1);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [month, weekOffset]);

  const weekStart = React.useMemo(() => getWeekStart(baseDate), [baseDate]);
  const weekEndExclusive = React.useMemo(() => addDays(weekStart, 7), [weekStart]);
  const monthStart = React.useMemo(() => getMonthStart(month), [month]);
  const monthEndExclusive = React.useMemo(() => getMonthEndExclusive(month), [month]);

  const canGoPrevWeek = React.useMemo(() => {
    const prevWeekStart = addDays(weekStart, -7);
    return weekIntersectsMonth(prevWeekStart, monthStart, monthEndExclusive);
  }, [weekStart, monthStart, monthEndExclusive]);

  const canGoNextWeek = React.useMemo(() => {
    const nextWeekStart = addDays(weekStart, 7);
    return weekIntersectsMonth(nextWeekStart, monthStart, monthEndExclusive);
  }, [weekStart, monthStart, monthEndExclusive]);

  const weekDays = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' });
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        key: toLocalDateKey(date),
        label: fmt.format(date),
        isOutsideMonth: date < monthStart || date >= monthEndExclusive,
      };
    });
  }, [weekStart, monthStart, monthEndExclusive]);

  const weekLessonsByDay = React.useMemo(() => {
    const map = new Map();
    weekDays.forEach((day) => map.set(day.key, []));
    lessons
      .filter((lesson) => {
        const dt = new Date(lesson.starts_at);
        return dt >= weekStart && dt < weekEndExclusive;
      })
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .forEach((lesson) => {
        const dt = new Date(lesson.starts_at);
        const key = toLocalDateKey(dt);
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key).push(lesson);
      });
    return map;
  }, [lessons, weekDays, weekStart, weekEndExclusive]);

  const weekTotals = React.useMemo(() => {
    const all = [];
    weekLessonsByDay.forEach((dayLessons) => all.push(...dayLessons));
    return getDayTotals(all);
  }, [weekLessonsByDay]);

  const weeklyChartData = React.useMemo(() => {
    const result = [];
    let wStart = getWeekStart(new Date(monthStart));
    const end = new Date(monthEndExclusive);
    while (wStart < end) {
      if (weekIntersectsMonth(wStart, monthStart, monthEndExclusive)) {
        const wEnd = addDays(wStart, 7);
        const weekLessons = lessons.filter((l) => {
          const dt = new Date(l.starts_at);
          return dt >= wStart && dt < wEnd;
        });
        const t = getDayTotals(weekLessons);
        result.push({
          weekKey: wStart.getTime(),
          label: formatWeekRange(wStart),
          revenue: Number(t.revenueSum) || 0,
          salary: Number(t.salarySum) || 0,
          profit: Number(t.profit) || 0,
        });
      }
      wStart = addDays(wStart, 7);
    }
    return result;
  }, [lessons, monthStart, monthEndExclusive]);

  const groupedLessons = React.useMemo(() => {
    const branchesMap = new Map();
    lessons.forEach((lesson) => {
      const branchId = lesson.branch_id ?? 'unknown';
      const branchName = lesson.branch_name || `Филиал #${branchId}`;
      if (!branchesMap.has(branchId)) {
        branchesMap.set(branchId, {
          id: branchId,
          name: branchName,
          lessons: [],
        });
      }
      branchesMap.get(branchId).lessons.push(lesson);
    });
    return Array.from(branchesMap.values());
  }, [lessons]);

  const columns = isOwner
    ? [
        { key: 'starts_at', title: 'Дата/Время', render: (value) => formatDateTime(value) },
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
        {
          key: 'is_salary_free',
          title: 'Оплата',
          render: (value) => (
            <span className={`lesson-badge ${value ? 'lesson-badge-free' : 'lesson-badge-paid'}`}>
              {value ? 'Бесплатное' : 'Платное'}
            </span>
          ),
          align: 'center',
        },
        { key: 'revenue', title: 'Выручка', render: (value) => value ? `${value.toLocaleString('ru-RU')} ₽` : '-', align: 'right' },
        { 
          key: 'profit', 
          title: 'Прибыль', 
          render: (_, row) => {
            const revenue = row.revenue || 0;
            const salary = row.teacher_salary || 0;
            const profit = revenue - salary;
            return (
              <span style={{ color: profit >= 0 ? '#059669' : '#dc2626', fontWeight: 500 }}>
                {profit.toLocaleString('ru-RU')} ₽
              </span>
            );
          }, 
          align: 'right' 
        },
        {
          key: 'actions',
          title: 'Действия',
          render: (_, row) => (
            <div className="table-actions">
              <Button size="small" className="lessons-btn-edit" variant="secondary" onClick={() => handleEdit(row)}>
                Редактировать
              </Button>
              <Button size="small" variant="secondary" onClick={() => handleSalaryToggle(row)}>
                {row.is_salary_free ? 'Сделать платным' : 'Сделать бесплатным'}
              </Button>
              <Button size="small" variant="danger" onClick={() => handleDelete(row.id)}>
                Удалить
              </Button>
            </div>
          ),
        },
      ]
    : [
        { key: 'starts_at', title: 'Дата/Время', render: (value) => formatDateTime(value) },
        { key: 'branch_name', title: 'Филиал' },
        { key: 'paid_children', title: 'Платные', align: 'center' },
        { key: 'trial_children', title: 'Пробные', align: 'center' },
        { key: 'total_children', title: 'Всего', align: 'center' },
        {
          key: 'instruction',
          title: 'Инструкция',
          render: (_, row) => {
            if (row.is_creative) return 'Творческое';
            return row.instruction_name || 'По инструкции';
          },
        },
        {
          key: 'is_salary_free',
          title: 'Оплата',
          render: (value) => (
            <span className={`lesson-badge ${value ? 'lesson-badge-free' : 'lesson-badge-paid'}`}>
              {value ? 'Бесплатное' : 'Платное'}
            </span>
          ),
          align: 'center',
        },
        { key: 'teacher_salary', title: 'Зарплата', render: (value) => value ? `${value.toLocaleString('ru-RU')} ₽` : '-', align: 'right' },
        {
          key: 'actions',
          title: 'Действия',
          render: (_, row) => (
            <div className="table-actions">
              <Button size="small" className="lessons-btn-edit" variant="secondary" onClick={() => handleEdit(row)}>
                Редактировать
              </Button>
            </div>
          ),
        },
      ];

  const groupedColumns = React.useMemo(() => columns.filter((col) => col.key !== 'branch_name'), [columns]);

  return (
    <Layout>
      <div className="lessons-page">
        <div className="lessons-header">
          <h1 className="lessons-title">{isOwner ? 'Занятия' : 'Мои занятия'}</h1>
          <div className="lessons-header-actions">
            <Button onClick={handleCreate} variant="primary">
              Создать занятие
            </Button>
          </div>
        </div>

        <Card className="lessons-filters">
          <div className="filters-grid">
            <Input
              type="month"
              label="Период"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            {isOwner && (
              <>
                <DepartmentSelector
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  label="Отдел"
                />
                <Select
                  label="Филиал"
                  value={filters.branch_id}
                  onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
                  options={branchesOptions}
                  placeholder="Все филиалы"
                />
                <Select
                  label="Преподаватель"
                  value={filters.teacher_id}
                  onChange={(e) => setFilters({ ...filters, teacher_id: e.target.value })}
                  options={teachersOptions}
                  placeholder="Все преподаватели"
                />
              </>
            )}
            {!isOwner && teacherDepartments.length > 0 && (
              <div className="department-selector">
                <Select
                  label="Отдел"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  options={teacherDepartments}
                  placeholder="Все отделы"
                />
              </div>
            )}
            <div className="filters-actions">
              <Button onClick={loadLessons} variant="primary">Применить</Button>
              <Button
                onClick={() => {
                  setFilters({ branch_id: '', teacher_id: '' });
                  setSelectedDepartment('');
                  setMonth(getCurrentMonth());
                }}
                variant="secondary"
              >
                Сбросить
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          {loading ? (
            <LoadingSpinner size="medium" text="Загрузка занятий..." />
          ) : viewMode === 'calendar' ? (
            <div className="lessons-calendar">
              <div className="lessons-calendar-toolbar">
                <div className="lessons-view-toggle lessons-view-toggle-inline">
                  <Button
                    size="small"
                    variant={viewMode === 'calendar' ? 'primary' : 'secondary'}
                    onClick={() => setViewMode('calendar')}
                  >
                    Календарь
                  </Button>
                  <Button
                    size="small"
                    variant={viewMode === 'list' ? 'primary' : 'secondary'}
                    onClick={() => setViewMode('list')}
                  >
                    Список
                  </Button>
                </div>
                <div className="lessons-calendar-edit-mode">
                  <Button
                    size="small"
                    className="lessons-btn-edit"
                    variant={calendarEditMode ? 'primary' : 'secondary'}
                    onClick={() => setCalendarEditMode(!calendarEditMode)}
                  >
                    Редактировать
                  </Button>
                  {calendarEditMode && (
                    <span className="lessons-calendar-edit-hint">
                      Выберите занятие для редактирования
                      <button type="button" className="lessons-calendar-edit-cancel" onClick={() => setCalendarEditMode(false)}>
                        Отмена
                      </button>
                    </span>
                  )}
                </div>
              </div>
              <div className="lessons-calendar-header">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  disabled={!canGoPrevWeek}
                >
                  ← Неделя
                </Button>
                <div className="lessons-calendar-range">{formatWeekRange(weekStart)}</div>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  disabled={!canGoNextWeek}
                >
                  Неделя →
                </Button>
              </div>
              <div className="lessons-calendar-grid">
                {weekDays.map((day) => {
                  const dayLessons = weekLessonsByDay.get(day.key) || [];
                  const totals = getDayTotals(dayLessons);
                  return (
                    <div
                      key={day.key}
                      className={`lessons-calendar-day${day.isOutsideMonth ? ' lessons-calendar-day-outside' : ''}`}
                    >
                      <div className="lessons-calendar-day-header">{day.label}</div>
                      <div className="lessons-calendar-events">
                        {dayLessons.length === 0 ? (
                          <div className="lessons-calendar-empty">
                            {day.isOutsideMonth
                              ? day.date < monthStart
                                ? 'Предыдущий месяц'
                                : 'Следующий месяц'
                              : 'Нет занятий'}
                          </div>
                        ) : (
                          dayLessons.map((lesson) => {
                            const raw = lesson.teacher_color ?? lesson.teacherColor;
                            const barColor = (typeof raw === 'string' && raw.trim())
                              ? (raw.trim().startsWith('#') ? raw.trim() : `#${raw.trim()}`)
                              : '#94a3b8';
                            return (
                            <div
                              key={lesson.id}
                              className={`lessons-calendar-event${calendarEditMode ? ' lessons-calendar-event-selectable' : ''}`}
                              role={calendarEditMode ? 'button' : undefined}
                              tabIndex={calendarEditMode ? 0 : undefined}
                              onClick={calendarEditMode ? () => handleEdit(lesson) : undefined}
                              onKeyDown={calendarEditMode ? (e) => e.key === 'Enter' && handleEdit(lesson) : undefined}
                            >
                              <div
                                className="lessons-calendar-event-bar"
                                style={{ backgroundColor: barColor }}
                                aria-hidden
                              />
                              <div className="lessons-calendar-event-time">
                                {formatTime(lesson.starts_at)}
                              </div>
                              <div className="lessons-calendar-event-branch">
                                {lesson.branch_name || 'Филиал'}
                              </div>
                              <div className="lessons-calendar-event-teacher">
                                {lesson.teacher_name || 'Преподаватель'}
                              </div>
                              {lesson.is_salary_free ? (
                                <div className="lessons-calendar-event-badge">Бесплатное занятие</div>
                              ) : null}
                              <div className="lessons-calendar-event-stats">
                                <span className="lessons-calendar-event-stat lessons-calendar-event-stat-paid">
                                  <span className="lessons-calendar-event-stat-label">Платные</span>
                                  <span className="lessons-calendar-event-stat-value">{lesson.paid_children ?? 0}</span>
                                </span>
                                <span className="lessons-calendar-event-stat lessons-calendar-event-stat-trial">
                                  <span className="lessons-calendar-event-stat-label">пробные</span>
                                  <span className="lessons-calendar-event-stat-value">{lesson.trial_children ?? 0}</span>
                                </span>
                                <span className="lessons-calendar-event-stat lessons-calendar-event-stat-total">
                                  <span className="lessons-calendar-event-stat-label">всего</span>
                                  <span className="lessons-calendar-event-stat-value">{lesson.total_children ?? 0}</span>
                                </span>
                              </div>
                              {isOwner && (
                                <div className="lessons-calendar-event-finance">
                                  <div className="lessons-calendar-event-finance-row lessons-calendar-event-finance-revenue">
                                    <span className="lessons-calendar-event-finance-label">Выручка</span>
                                    <span className="lessons-calendar-event-finance-value">{formatCurrency(lesson.revenue)}</span>
                                  </div>
                                  <div className="lessons-calendar-event-finance-row lessons-calendar-event-finance-salary">
                                    <span className="lessons-calendar-event-finance-label">Зарплата</span>
                                    <span className="lessons-calendar-event-finance-value">{formatCurrency(lesson.teacher_salary)}</span>
                                  </div>
                                  <div className={`lessons-calendar-event-finance-row lessons-calendar-event-finance-profit ${((lesson.revenue || 0) - (lesson.teacher_salary || 0)) >= 0 ? 'lessons-calendar-event-finance-profit-positive' : 'lessons-calendar-event-finance-profit-negative'}`}>
                                    <span className="lessons-calendar-event-finance-label">Прибыль</span>
                                    <span className="lessons-calendar-event-finance-value">{formatCurrency((lesson.revenue || 0) - (lesson.teacher_salary || 0))}</span>
                                  </div>
                                </div>
                              )}
                              {!isOwner && (
                                <div className="lessons-calendar-event-finance">
                                  <div className="lessons-calendar-event-finance-row lessons-calendar-event-finance-salary">
                                    <span className="lessons-calendar-event-finance-label">Зарплата</span>
                                    <span className="lessons-calendar-event-finance-value">{formatCurrency(lesson.teacher_salary)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })
                        )}
                      </div>
                      {dayLessons.length > 0 && (
                        <div className="lessons-calendar-summary">
                          {isOwner ? (
                            <>
                              <div className="lessons-calendar-summary-row lessons-calendar-summary-row-revenue">
                                <span>Выручка</span>
                                <span>{formatCurrency(totals.revenueSum)}</span>
                              </div>
                              <div className="lessons-calendar-summary-row lessons-calendar-summary-row-salary">
                                <span>Зарплаты</span>
                                <span>{formatCurrency(totals.salarySum)}</span>
                              </div>
                              <div className={`lessons-calendar-summary-row lessons-calendar-summary-row-profit ${totals.profit >= 0 ? 'lessons-calendar-summary-profit-positive' : 'lessons-calendar-summary-profit-negative'}`}>
                                <span>Прибыль</span>
                                <span>{formatCurrency(totals.profit)}</span>
                              </div>
                            </>
                          ) : (
                            <div className="lessons-calendar-summary-row lessons-calendar-summary-row-salary">
                              <span>Зарплата</span>
                              <span>{formatCurrency(totals.salarySum)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="lessons-calendar-week-summary">
                <div className="lessons-calendar-week-summary-title">Итого за неделю</div>
                {isOwner ? (
                  <div className="lessons-calendar-week-summary-rows">
                    <div className="lessons-calendar-summary-row lessons-calendar-summary-row-revenue">
                      <span>Выручка</span>
                      <span>{formatCurrency(weekTotals.revenueSum)}</span>
                    </div>
                    <div className="lessons-calendar-summary-row lessons-calendar-summary-row-salary">
                      <span>Зарплаты</span>
                      <span>{formatCurrency(weekTotals.salarySum)}</span>
                    </div>
                    <div className={`lessons-calendar-summary-row lessons-calendar-summary-row-profit ${weekTotals.profit >= 0 ? 'lessons-calendar-summary-profit-positive' : 'lessons-calendar-summary-profit-negative'}`}>
                      <span>Прибыль</span>
                      <span>{formatCurrency(weekTotals.profit)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="lessons-calendar-week-summary-rows">
                    <div className="lessons-calendar-summary-row lessons-calendar-summary-row-salary">
                      <span>Зарплата</span>
                      <span>{formatCurrency(weekTotals.salarySum)}</span>
                    </div>
                  </div>
                )}
              </div>
              {weeklyChartData.length > 0 && (() => {
                const maxRevenue = Math.max(...weeklyChartData.map((w) => w.revenue), 1);
                const maxSalary = Math.max(...weeklyChartData.map((w) => w.salary), 1);
                const maxProfit = Math.max(...weeklyChartData.map((w) => Math.abs(w.profit)), 1);
                return (
                <div className="lessons-calendar-weekly-chart">
                  <div className="lessons-calendar-week-summary-title">Понедельные итоги</div>
                  <div className="lessons-weekly-bars">
                    {isOwner && (
                      <div className="lessons-weekly-bar-row lessons-weekly-bar-header">
                        <div className="lessons-weekly-bar-label" />
                        <div className="lessons-weekly-bar-cols">
                          <div className="lessons-weekly-bar-cell">
                            <span className="lessons-weekly-bar-col-label">Выручка</span>
                          </div>
                          <div className="lessons-weekly-bar-cell">
                            <span className="lessons-weekly-bar-col-label">Зарплаты</span>
                          </div>
                          <div className="lessons-weekly-bar-cell">
                            <span className="lessons-weekly-bar-col-label">Прибыль</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {!isOwner && (
                      <div className="lessons-weekly-bar-row lessons-weekly-bar-header">
                        <div className="lessons-weekly-bar-label" />
                        <div className="lessons-weekly-bar-cols">
                          <div className="lessons-weekly-bar-cell">
                            <span className="lessons-weekly-bar-col-label">Зарплата</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {weeklyChartData.map((week) => (
                      <div key={week.weekKey} className="lessons-weekly-bar-row">
                        <div className="lessons-weekly-bar-label">{week.label}</div>
                        <div className="lessons-weekly-bar-cols">
                          {isOwner && (
                            <>
                              <div className="lessons-weekly-bar-cell">
                                <div className="lessons-weekly-bar-track">
                                  <div
                                    className="lessons-weekly-bar-fill lessons-weekly-bar-revenue"
                                    style={{ width: `${(week.revenue / maxRevenue) * 100}%` }}
                                  />
                                </div>
                                <span className="lessons-weekly-bar-value">{formatCurrency(week.revenue)}</span>
                              </div>
                              <div className="lessons-weekly-bar-cell">
                                <div className="lessons-weekly-bar-track">
                                  <div
                                    className="lessons-weekly-bar-fill lessons-weekly-bar-salary"
                                    style={{ width: `${(week.salary / maxSalary) * 100}%` }}
                                  />
                                </div>
                                <span className="lessons-weekly-bar-value">{formatCurrency(week.salary)}</span>
                              </div>
                              <div className="lessons-weekly-bar-cell">
                                <div className="lessons-weekly-bar-track">
                                  <div
                                    className={`lessons-weekly-bar-fill ${week.profit >= 0 ? 'lessons-weekly-bar-profit-pos' : 'lessons-weekly-bar-profit-neg'}`}
                                    style={{ width: `${(Math.abs(week.profit) / maxProfit) * 100}%` }}
                                  />
                                </div>
                                <span className={`lessons-weekly-bar-value ${week.profit >= 0 ? 'profit-pos' : 'profit-neg'}`}>
                                  {formatCurrency(week.profit)}
                                </span>
                              </div>
                            </>
                          )}
                          {!isOwner && (
                            <div className="lessons-weekly-bar-cell">
                              <div className="lessons-weekly-bar-track">
                                <div
                                  className="lessons-weekly-bar-fill lessons-weekly-bar-salary"
                                  style={{ width: `${(week.salary / maxSalary) * 100}%` }}
                                />
                              </div>
                              <span className="lessons-weekly-bar-value">{formatCurrency(week.salary)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })()}
            </div>
          ) : lessons.length === 0 ? (
            <Table
              columns={groupedColumns}
              data={[]}
              loading={false}
              emptyMessage="Нет занятий за выбранный период"
            />
          ) : (
            <div className="lessons-groups">
              <div className="lessons-view-toggle lessons-view-toggle-inline">
                <Button
                  size="small"
                  variant={viewMode === 'calendar' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('calendar')}
                >
                  Календарь
                </Button>
                <Button
                  size="small"
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('list')}
                >
                  Список
                </Button>
              </div>
              {groupedLessons.map((group) => {
                const groupKey = String(group.id);
                const isCollapsed = collapsedBranchIds.has(groupKey);
                const groupSalary = group.lessons.reduce((s, l) => s + Number(l.teacher_salary ?? 0), 0);
                return (
                  <div key={groupKey} className="lessons-group">
                    <button
                      type="button"
                      className={`lessons-group-header lessons-group-header-clickable ${isCollapsed ? 'lessons-group-header-collapsed' : ''}`}
                      onClick={() => setCollapsedBranchIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(groupKey)) next.delete(groupKey);
                        else next.add(groupKey);
                        return next;
                      })}
                    >
                      <span className="lessons-group-title">{group.name}</span>
                      <span className="lessons-group-meta">
                        <span className="lessons-group-count">{group.lessons.length} занятий</span>
                        {!isOwner && groupSalary > 0 && (
                          <span className="lessons-group-salary">{formatCurrency(groupSalary)}</span>
                        )}
                        <span className="lessons-group-toggle" aria-hidden>{isCollapsed ? '▼' : '▲'}</span>
                      </span>
                    </button>
                    {!isCollapsed && (
                      <Table
                        columns={groupedColumns}
                        data={group.lessons}
                        loading={false}
                        emptyMessage="Нет занятий"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {isOwner && branchesWithLessons.length > 0 && (
          <Card title="Выставить счета по филиалам">
            <div className="lessons-invoices-toggle">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setShowInvoices((prev) => !prev)}
              >
                {showInvoices ? 'Скрыть список' : 'Показать список'}
              </Button>
            </div>
            {showInvoices && (
              <div className="branches-invoices">
                {branchesWithLessons.map(branch => (
                  <div key={branch.id} className="branch-invoice-item">
                    <div className="branch-invoice-info">
                      <strong>{branch.name}</strong>
                      <span className="branch-invoice-count">{branch.lessonsCount} занятий</span>
                    </div>
                    <Button
                      size="small"
                      variant="primary"
                      onClick={() => handleInvoice(branch.id, branch.name)}
                    >
                      📄 Выставить счёт
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          title={editingLesson ? 'Редактировать занятие' : 'Создать занятие'}
          size="medium"
        >
          <LessonForm
            lesson={editingLesson}
            onSuccess={handleModalClose}
            onCancel={handleModalClose}
          />
        </Modal>

        {invoiceData && (
          <InvoiceModal
            isOpen={!!invoiceData}
            onClose={handleInvoiceClose}
            branchName={invoiceData.branchName}
            lessons={invoiceData.lessons}
            month={invoiceData.month}
          />
        )}
      </div>
    </Layout>
  );
};

export default Lessons;
