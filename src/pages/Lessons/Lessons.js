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
  const [viewMode, setViewMode] = useState('list');
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

  useEffect(() => {
    loadLessons();
  }, [month, filters, selectedDepartment]);

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
      const params = new URLSearchParams({ month, limit: '100' });
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
        key: date.toISOString().slice(0, 10),
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
        const key = dt.toISOString().slice(0, 10);
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key).push(lesson);
      });
    return map;
  }, [lessons, weekDays, weekStart, weekEndExclusive]);

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
              <Button size="small" variant="ghost" onClick={() => handleEdit(row)}>
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
              <Button size="small" variant="ghost" onClick={() => handleEdit(row)}>
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
              <div className="lessons-view-toggle lessons-view-toggle-inline">
                <Button
                  size="small"
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('list')}
                >
                  Список
                </Button>
                <Button
                  size="small"
                  variant={viewMode === 'calendar' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('calendar')}
                >
                  Календарь
                </Button>
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
                  const profitClass =
                    dayLessons.length > 0 && isOwner
                      ? totals.profit < 0
                        ? ' lessons-calendar-summary-negative'
                        : ' lessons-calendar-summary-positive'
                      : '';
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
                          dayLessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="lessons-calendar-event"
                              style={{ borderLeftColor: lesson.teacher_color || '#94a3b8' }}
                            >
                              <div className="lessons-calendar-event-time">
                                {formatTime(lesson.starts_at)}
                              </div>
                              <div className="lessons-calendar-event-title">
                                {lesson.teacher_name || 'Преподаватель'}
                              </div>
                              <div className="lessons-calendar-event-meta">
                                {lesson.branch_name || 'Филиал'}
                              </div>
                              {lesson.is_salary_free ? (
                                <div className="lessons-calendar-event-badge">Бесплатное занятие</div>
                              ) : null}
                              <div className="lessons-calendar-event-meta">
                                Платные {lesson.paid_children ?? 0}, пробные {lesson.trial_children ?? 0}, всего {lesson.total_children ?? 0}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {dayLessons.length > 0 && (
                        <div className={`lessons-calendar-summary${profitClass}`}>
                          {isOwner ? (
                            <>
                              <div className="lessons-calendar-summary-row">
                                <span>Выручка</span>
                                <span>{formatCurrency(totals.revenueSum)}</span>
                              </div>
                              <div className="lessons-calendar-summary-row">
                                <span>Зарплаты</span>
                                <span>{formatCurrency(totals.salarySum)}</span>
                              </div>
                              <div className="lessons-calendar-summary-row lessons-calendar-summary-profit">
                                <span>Прибыль</span>
                                <span>{formatCurrency(totals.profit)}</span>
                              </div>
                            </>
                          ) : (
                            <div className="lessons-calendar-summary-row">
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
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('list')}
                >
                  Список
                </Button>
                <Button
                  size="small"
                  variant={viewMode === 'calendar' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('calendar')}
                >
                  Календарь
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
