import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import DepartmentSelector from '../../components/DepartmentSelector/DepartmentSelector';
import Select from '../../components/Select/Select';
import Input from '../../components/Input/Input';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import ActionMenu from '../../components/ActionMenu/ActionMenu';
import useMediaQuery from '../../hooks/useMediaQuery';
import './Schedule.css';

const WEEKDAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
];

const START_HOUR = 9;
const END_HOUR = 20;

const formatTimeShort = (value) => {
  if (!value) return '';
  const parts = String(value).split(':');
  return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : String(value);
};

const minutesToStr = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const parseTimeToMinutes = (value) => {
  if (!value) return 0;
  const parts = String(value).split(':');
  const hours = Number(parts[0] || 0);
  const minutes = Number(parts[1] || 0);
  return hours * 60 + minutes;
};

const ScheduleForm = ({ branches, initialData, onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    branch_id: initialData?.branch_id ? String(initialData.branch_id) : '',
    weekday: initialData?.weekday ? String(initialData.weekday) : '',
    starts_at: initialData?.starts_at ? formatTimeShort(initialData.starts_at) : '',
    duration_minutes: initialData?.duration_minutes ? String(initialData.duration_minutes) : '60',
    teacher_id: initialData?.teacher_id != null && initialData?.teacher_id !== '' ? String(initialData.teacher_id) : '',
  });
  const [branchTeachers, setBranchTeachers] = useState([]);

  useEffect(() => {
    if (!form.branch_id) {
      setBranchTeachers([]);
      return;
    }
    let cancelled = false;
    apiClient
      .get(API_ENDPOINTS.BRANCH_TEACHERS(form.branch_id))
      .then((res) => {
        if (cancelled || !res.data?.ok) return;
        const list = res.data.data?.items ?? [];
        setBranchTeachers(Array.isArray(list) ? list : []);
      })
      .catch(() => setBranchTeachers([]));
    return () => { cancelled = true; };
  }, [form.branch_id]);

  const branchOptions = branches.map((b) => ({ value: String(b.id), label: b.name }));
  const weekdayOptions = WEEKDAYS.map((d) => ({ value: String(d.value), label: d.label }));
  const teacherOptions = [
    { value: '', label: 'Не назначен' },
    ...branchTeachers.map((t) => ({ value: String(t.id), label: t.full_name || `ID ${t.id}` })),
  ];

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'branch_id') next.teacher_id = '';
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      branch_id: form.branch_id,
      weekday: form.weekday,
      starts_at: form.starts_at,
      duration_minutes: form.duration_minutes,
      teacher_id: form.teacher_id || undefined,
    });
  };

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <Select
        label="Филиал"
        value={form.branch_id}
        onChange={handleChange('branch_id')}
        options={branchOptions}
        placeholder="Выберите филиал"
        required
      />
      <Select
        label="Преподаватель"
        value={form.teacher_id}
        onChange={handleChange('teacher_id')}
        options={teacherOptions}
        placeholder="Выберите преподавателя филиала"
      />
      <Select
        label="День недели"
        value={form.weekday}
        onChange={handleChange('weekday')}
        options={weekdayOptions}
        placeholder="Выберите день"
        required
      />
      <Input
        label="Время начала"
        type="time"
        step="60"
        value={form.starts_at}
        onChange={handleChange('starts_at')}
        required
      />
      <Input
        label="Длительность (мин)"
        type="number"
        min="1"
        max="600"
        value={form.duration_minutes}
        onChange={handleChange('duration_minutes')}
        required
      />
      <div className="schedule-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" variant="primary">
          Сохранить
        </Button>
      </div>
    </form>
  );
};

/** По дням строим сегменты: свободные слоты + группы занятий (по одному времени начала) */
function buildDaySegments(daySlots) {
  const dayStart = START_HOUR * 60;
  const dayEnd = END_HOUR * 60;
  if (!daySlots.length) {
    return [{ type: 'free', startMin: dayStart, endMin: dayEnd }];
  }
  const withMin = daySlots.map((s) => ({
    ...s,
    startMin: parseTimeToMinutes(s.starts_at),
    endMin: parseTimeToMinutes(s.starts_at) + Number(s.duration_minutes || 0),
  }));
  withMin.sort((a, b) => a.startMin - b.startMin);

  const byStart = new Map();
  withMin.forEach((s) => {
    if (!byStart.has(s.startMin)) byStart.set(s.startMin, []);
    byStart.get(s.startMin).push(s);
  });
  const sortedStarts = Array.from(byStart.keys()).sort((a, b) => a - b);

  const segments = [];
  let current = dayStart;
  for (const startMin of sortedStarts) {
    if (current < startMin) {
      segments.push({ type: 'free', startMin: current, endMin: startMin });
    }
    const slots = byStart.get(startMin);
    const endMin = Math.max(...slots.map((s) => s.endMin));
    segments.push({ type: 'group', startMin, endMin, slots });
    current = endMin;
  }
  if (current < dayEnd) {
    segments.push({ type: 'free', startMin: current, endMin: dayEnd });
  }
  return segments;
}

const Schedule = () => {
  const { isOwner } = useAuth();
  const isMobile = useMediaQuery('(max-width: 720px)');
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    loadSchedules();
  }, [selectedDepartment, selectedBranch]);

  useEffect(() => {
    loadBranches();
  }, [selectedDepartment]);

  useEffect(() => {
    const today = new Date().getDay();
    const weekday = today === 0 ? 7 : today;
    setActiveDay(weekday);
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      if (selectedBranch) params.append('branch_id', selectedBranch);
      const response = await apiClient.get(`${API_ENDPOINTS.SCHEDULES}?${params.toString()}`);
      if (response.data.ok) {
        const data = response.data.data;
        const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setSchedules(list);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Ошибка загрузки расписания:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const url = selectedDepartment
        ? API_ENDPOINTS.DEPARTMENT_BRANCHES(selectedDepartment)
        : `${API_ENDPOINTS.BRANCHES}?${new URLSearchParams({
            include_inactive: 'false',
            limit: '500',
            offset: '0',
          }).toString()}`;
      const response = await apiClient.get(url);
      if (response.data.ok) {
        const data = response.data.data;
        const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setBranches(list);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Ошибка загрузки филиалов:', error);
    }
  };

  const openCreate = () => {
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const openEdit = (schedule, e) => {
    if (e) e.stopPropagation();
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
  };

  const handleSave = async (payload) => {
    try {
      const body = {
        branch_id: payload.branch_id,
        weekday: payload.weekday,
        starts_at: payload.starts_at,
        duration_minutes: payload.duration_minutes,
        teacher_id: payload.teacher_id ?? null,
      };
      if (editingSchedule) {
        await apiClient.put(API_ENDPOINTS.SCHEDULE(editingSchedule.id), body);
      } else {
        await apiClient.post(API_ENDPOINTS.SCHEDULES, body);
      }
      closeModal();
      loadSchedules();
    } catch (error) {
      alert('Не удалось сохранить расписание');
      // eslint-disable-next-line no-console
      console.error(error);
    }
  };

  const handleDelete = async (scheduleId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Удалить этот слот расписания?')) return;
    try {
      await apiClient.delete(API_ENDPOINTS.SCHEDULE(scheduleId));
      loadSchedules();
    } catch (error) {
      alert('Не удалось удалить слот расписания');
      // eslint-disable-next-line no-console
      console.error(error);
    }
  };

  const schedulesByDay = useMemo(() => {
    const map = new Map();
    WEEKDAYS.forEach((d) => map.set(d.value, []));
    schedules.forEach((slot) => {
      const key = Number(slot.weekday);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(slot);
    });
    map.forEach((list) => list.sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at))));
    return map;
  }, [schedules]);

  const daySegments = useMemo(() => {
    const map = new Map();
    WEEKDAYS.forEach((d) => {
      const slots = schedulesByDay.get(d.value) || [];
      map.set(d.value, buildDaySegments(slots));
    });
    return map;
  }, [schedulesByDay]);

  const branchOptions = [
    { value: '', label: 'Все филиалы' },
    ...branches.map((b) => ({ value: String(b.id), label: b.name })),
  ];

  const visibleDays = isMobile ? WEEKDAYS.filter((d) => d.value === activeDay) : WEEKDAYS;

  const toggleGroup = (dayValue, startMin) => {
    const key = `${dayValue}-${startMin}`;
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSlotCard = (slot, compact = false) => {
    const assigned = slot.assigned_teacher;
    return (
      <div
        key={slot.id}
        className="schedule-slot-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="schedule-slot-card-main">
          <span className="schedule-slot-card-time">
            {formatTimeShort(slot.starts_at)} · {slot.duration_minutes} мин
          </span>
          <span className="schedule-slot-card-branch">{slot.branch_name || 'Филиал'}</span>
          {!compact && (
            <div className="schedule-slot-card-teachers">
              {assigned ? (
                <span className="schedule-slot-teacher">
                  <span
                    className="schedule-slot-teacher-dot"
                    style={{ backgroundColor: assigned.color || '#94a3b8' }}
                  />
                  {assigned.full_name}
                </span>
              ) : (
                <span className="schedule-slot-teacher-empty">Преподаватель не назначен</span>
              )}
            </div>
          )}
        </div>
        {isOwner && (
          <div className="schedule-slot-card-actions">
            <ActionMenu
              items={[
                { label: 'Редактировать', icon: '✏️', onClick: (e) => openEdit(slot, e) },
                { label: 'Удалить', icon: '🗑️', danger: true, onClick: (e) => handleDelete(slot.id, e) },
              ]}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="schedule-page">
        <div className="schedule-header">
          <h1 className="schedule-title">Расписание</h1>
          {isOwner && (
            <Button variant="primary" onClick={openCreate}>
              Добавить занятие
            </Button>
          )}
        </div>

        <Card className="schedule-filters">
          <div className="schedule-filters-grid">
            <DepartmentSelector
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedBranch('');
              }}
              label="Отдел"
            />
            <Select
              label="Филиал"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              options={branchOptions}
            />
          </div>
        </Card>

        <Card className="schedule-card">
          {loading ? (
            <LoadingSpinner size="medium" text="Загрузка расписания..." />
          ) : (
            <>
              {isMobile && (
                <div className="schedule-day-tabs">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      className={`schedule-day-tab ${day.value === activeDay ? 'active' : ''}`}
                      onClick={() => setActiveDay(day.value)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="schedule-days-list">
                {visibleDays.map((day) => {
                  const segments = daySegments.get(day.value) || [];
                  return (
                    <div key={day.value} className="schedule-day-block">
                      <div className="schedule-day-block-title">{day.label}</div>
                      <div className="schedule-day-segments">
                        {segments.length === 0 ? (
                          <div className="schedule-empty">Нет данных</div>
                        ) : (
                          segments.map((seg, idx) => {
                            if (seg.type === 'free') {
                              const duration = seg.endMin - seg.startMin;
                              if (duration < 15) return null;
                              return (
                                <div
                                  key={`free-${idx}`}
                                  className="schedule-segment schedule-segment-free"
                                >
                                  <span className="schedule-segment-free-label">
                                    {minutesToStr(seg.startMin)} – {minutesToStr(seg.endMin)}
                                  </span>
                                  <span className="schedule-segment-free-text">свободно</span>
                                </div>
                              );
                            }
                            const { startMin, endMin, slots } = seg;
                            const groupKey = `${day.value}-${startMin}`;
                            const isExpanded = expandedGroups[groupKey];
                            const isGroup = slots.length > 1;

                            if (isGroup && !isExpanded) {
                              return (
                                <div
                                  key={`group-${idx}`}
                                  className="schedule-segment schedule-segment-group schedule-segment-group-collapsed"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => toggleGroup(day.value, startMin)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      toggleGroup(day.value, startMin);
                                    }
                                  }}
                                >
                                  <span className="schedule-segment-group-time">
                                    {minutesToStr(startMin)}
                                  </span>
                                  <span className="schedule-segment-group-count">
                                    {slots.length} занятия
                                  </span>
                                  <span className="schedule-segment-group-chevron">▼</span>
                                </div>
                              );
                            }

                            if (isGroup && isExpanded) {
                              return (
                                <div key={`group-${idx}`} className="schedule-segment schedule-segment-group schedule-segment-group-expanded">
                                  <button
                                    type="button"
                                    className="schedule-segment-group-header"
                                    onClick={() => toggleGroup(day.value, startMin)}
                                  >
                                    <span className="schedule-segment-group-time">{minutesToStr(startMin)}</span>
                                    <span className="schedule-segment-group-count">{slots.length} занятия</span>
                                    <span className="schedule-segment-group-chevron">▲</span>
                                  </button>
                                  <div className="schedule-segment-group-cards">
                                    {slots.map((s) => renderSlotCard(s))}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={`slot-${idx}`} className="schedule-segment schedule-segment-slot">
                                {renderSlotCard(slots[0])}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {isOwner && (
          <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
            title={editingSchedule ? 'Редактировать слот' : 'Добавить слот'}
            size="medium"
          >
            <ScheduleForm
              branches={branches}
              initialData={editingSchedule}
              onSubmit={handleSave}
              onCancel={closeModal}
            />
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default Schedule;
