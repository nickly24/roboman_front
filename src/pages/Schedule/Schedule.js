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
const BASE_HOUR_HEIGHT = 90;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.6;

const formatTimeShort = (value) => {
  if (!value) return '';
  const parts = String(value).split(':');
  return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : String(value);
};

const parseTimeToMinutes = (value) => {
  if (!value) return 0;
  const parts = String(value).split(':');
  const hours = Number(parts[0] || 0);
  const minutes = Number(parts[1] || 0);
  return hours * 60 + minutes;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ScheduleForm = ({ branches, initialData, onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    branch_id: initialData?.branch_id ? String(initialData.branch_id) : '',
    weekday: initialData?.weekday ? String(initialData.weekday) : '',
    starts_at: initialData?.starts_at ? formatTimeShort(initialData.starts_at) : '',
    duration_minutes: initialData?.duration_minutes ? String(initialData.duration_minutes) : '60',
  });

  const branchOptions = branches.map((b) => ({ value: String(b.id), label: b.name }));
  const weekdayOptions = WEEKDAYS.map((d) => ({ value: String(d.value), label: d.label }));

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      branch_id: form.branch_id,
      weekday: form.weekday,
      starts_at: form.starts_at,
      duration_minutes: form.duration_minutes,
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
  const [flippedSlots, setFlippedSlots] = useState({});
  const [zoom, setZoom] = useState(1);

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

  const openEdit = (schedule) => {
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

  const handleDelete = async (scheduleId) => {
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

  const scheduleLayouts = useMemo(() => {
    const layouts = new Map();
    const dayMinutesStart = START_HOUR * 60;
    const dayMinutesEnd = END_HOUR * 60;

    WEEKDAYS.forEach((day) => {
      const slots = schedulesByDay.get(day.value) || [];
      const items = slots
        .map((slot) => {
          const startMin = parseTimeToMinutes(slot.starts_at);
          const duration = Number(slot.duration_minutes || 0);
          const endMin = startMin + duration;
          const displayStart = clamp(startMin, dayMinutesStart, dayMinutesEnd);
          const displayEnd = clamp(endMin, dayMinutesStart, dayMinutesEnd);
          if (displayEnd <= dayMinutesStart || displayStart >= dayMinutesEnd || duration <= 0) {
            return null;
          }
          return {
            slot,
            startMin,
            endMin,
            displayStart,
            displayEnd,
          };
        })
        .filter(Boolean);

      items.sort((a, b) => a.startMin - b.startMin);

      const groups = [];
      let currentGroup = [];
      let currentGroupEnd = null;

      items.forEach((item) => {
        if (currentGroup.length === 0) {
          currentGroup = [item];
          currentGroupEnd = item.endMin;
          return;
        }
        if (item.startMin >= currentGroupEnd) {
          groups.push(currentGroup);
          currentGroup = [item];
          currentGroupEnd = item.endMin;
        } else {
          currentGroup.push(item);
          currentGroupEnd = Math.max(currentGroupEnd, item.endMin);
        }
      });
      if (currentGroup.length) groups.push(currentGroup);

      groups.forEach((group) => {
        const active = [];
        const usedCols = [];
        let maxCols = 1;

        group.forEach((item) => {
          for (let i = active.length - 1; i >= 0; i -= 1) {
            if (active[i].endMin <= item.startMin) {
              usedCols[active[i].col] = false;
              active.splice(i, 1);
            }
          }

          let colIndex = usedCols.findIndex((v) => !v);
          if (colIndex === -1) {
            colIndex = usedCols.length;
            usedCols.push(true);
          } else {
            usedCols[colIndex] = true;
          }

          active.push({ endMin: item.endMin, col: colIndex });
          maxCols = Math.max(maxCols, usedCols.length);
          item.col = colIndex;
        });

        group.forEach((item) => {
          item.colCount = maxCols;
        });
      });

      layouts.set(day.value, items);
    });

    return layouts;
  }, [schedulesByDay]);

  const branchOptions = [
    { value: '', label: 'Все филиалы' },
    ...branches.map((b) => ({ value: String(b.id), label: b.name })),
  ];

  const hourHeight = Math.round(BASE_HOUR_HEIGHT * zoom);
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const gridHeight = (END_HOUR - START_HOUR) * hourHeight;
  const visibleDays = isMobile ? WEEKDAYS.filter((d) => d.value === activeDay) : WEEKDAYS;
  const dayColumnWidth = (dayValue) => {
    const daySlots = scheduleLayouts.get(dayValue) || [];
    const maxCols = daySlots.reduce((max, item) => Math.max(max, item.colCount || 1), 1);
    return Math.round((280 + (maxCols - 1) * 180) * zoom);
  };
  const totalDaysWidth = isMobile
    ? 0
    : visibleDays.reduce((sum, d) => sum + dayColumnWidth(d.value), 0) + (visibleDays.length - 1) * 12;

  const toggleSlotDetails = (slotId) => {
    setFlippedSlots((prev) => ({ ...prev, [slotId]: !prev[slotId] }));
  };

  const zoomIn = () => setZoom((prev) => Math.min(MAX_ZOOM, Math.round((prev + 0.1) * 10) / 10));
  const zoomOut = () => setZoom((prev) => Math.max(MIN_ZOOM, Math.round((prev - 0.1) * 10) / 10));

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

        <Card>
          {loading ? (
            <LoadingSpinner size="medium" text="Загрузка расписания..." />
          ) : (
            <div
              className="schedule-timeline"
              style={{
                '--hour-height': `${hourHeight}px`,
                '--zoom': zoom,
                gridTemplateColumns: `${Math.round(90 * zoom)}px 1fr`,
              }}
            >
              <div className="schedule-zoom-controls">
                <Button size="small" variant="secondary" onClick={zoomOut} disabled={zoom <= MIN_ZOOM}>
                  −
                </Button>
                <div className="schedule-zoom-value">{Math.round(zoom * 100)}%</div>
                <Button size="small" variant="secondary" onClick={zoomIn} disabled={zoom >= MAX_ZOOM}>
                  +
                </Button>
              </div>
              {isMobile && (
                <div className="schedule-day-switcher">
                  {WEEKDAYS.map((day) => (
                    <Button
                      key={day.value}
                      size="small"
                      variant={day.value === activeDay ? 'primary' : 'secondary'}
                      onClick={() => setActiveDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              )}
              <div className="schedule-time-column">
                <div className="schedule-time-header">Время</div>
                <div className="schedule-time-grid" style={{ height: gridHeight }}>
                  {hours.map((h) => (
                    <div key={h} className="schedule-time-cell" style={{ height: hourHeight }}>
                      {`${String(h).padStart(2, '0')}:00`}
                    </div>
                  ))}
                </div>
              </div>

              <div className="schedule-days" style={{ height: gridHeight + 32, minWidth: totalDaysWidth }}>
                {visibleDays.map((day) => {
                  const daySlots = scheduleLayouts.get(day.value) || [];
                  const columnWidth = dayColumnWidth(day.value);
                  return (
                    <div key={day.value} className="schedule-day-column" style={{ minWidth: `${columnWidth}px` }}>
                      <div className="schedule-day-header">{day.label}</div>
                      <div
                        className="schedule-day-grid"
                        style={{ height: gridHeight }}
                      >
                        {daySlots.length === 0 ? (
                          <div className="schedule-empty">Нет занятий</div>
                        ) : (
                          daySlots.map((item) => {
                            const top = ((item.displayStart - START_HOUR * 60) / 60) * hourHeight;
                            const height = Math.max(
                              24,
                              ((item.displayEnd - item.displayStart) / 60) * hourHeight
                            );
                            const width = 100 / item.colCount;
                            const left = item.col * width;
                            const slot = item.slot;
                            const teachers = slot.teachers || [];
                            const primaryTeacher = teachers[0];
                            const showDetails = !!flippedSlots[slot.id];
                            return (
                              <div
                                key={slot.id}
                                className="schedule-slot schedule-slot-absolute"
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  width: `calc(${width}% - 8px)`,
                                  left: `calc(${left}% + 3px)`,
                                }}
                                onClick={() => toggleSlotDetails(slot.id)}
                              >
                                {showDetails ? (
                                  <>
                                    <div className="schedule-slot-back-list">
                                      {teachers.length === 0 ? (
                                        <span className="schedule-slot-teacher-empty">Нет преподавателей</span>
                                      ) : (
                                        teachers.map((t) => (
                                          <span key={t.id} className="schedule-slot-teacher">
                                            <span
                                              className="schedule-slot-teacher-dot"
                                              style={{ backgroundColor: t.color || '#94a3b8' }}
                                            />
                                            {t.full_name}
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="schedule-slot-time">
                                      {formatTimeShort(slot.starts_at)} · {slot.duration_minutes} мин
                                    </div>
                                    <div className="schedule-slot-branch">{slot.branch_name || 'Филиал'}</div>
                                    <div className="schedule-slot-teachers">
                                      {primaryTeacher ? (
                                        <span className="schedule-slot-teacher">
                                          <span
                                            className="schedule-slot-teacher-dot"
                                            style={{ backgroundColor: primaryTeacher.color || '#94a3b8' }}
                                          />
                                          {primaryTeacher.full_name}
                                        </span>
                                      ) : (
                                        <span className="schedule-slot-teacher-empty">Нет преподавателей</span>
                                      )}
                                    </div>
                                  </>
                                )}
                                {isOwner && (
                                  <div className="schedule-slot-actions">
                                    <ActionMenu
                                      items={[
                                        { label: 'Редактировать', icon: '✏️', onClick: () => openEdit(slot) },
                                        { label: 'Удалить', icon: '🗑️', danger: true, onClick: () => handleDelete(slot.id) },
                                      ]}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
