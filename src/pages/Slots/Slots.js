import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Select from '../../components/Select/Select';
import Input from '../../components/Input/Input';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import ActionMenu from '../../components/ActionMenu/ActionMenu';
import useMediaQuery from '../../hooks/useMediaQuery';
import './Slots.css';

const WEEKDAYS = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 7, label: 'Воскресенье' },
];

const DAY_TABS = [
  { value: '', label: 'Все слоты' },
  ...WEEKDAYS,
];

const pad2 = (n) => String(Number(n) || 0).padStart(2, '0');
const formatTimeRange = (startTime) => {
  if (!startTime) return '';
  const parts = String(startTime).split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  const totalMin = h * 60 + m + 60;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${pad2(h)}:${pad2(m)} – ${pad2(endH)}:${pad2(endM)}`;
};

const SlotForm = ({ initialData, fixedDayOfWeek, onSubmit, onCancel, saving, isAdmin, teachers = [] }) => {
  const [form, setForm] = useState({
    teacher_id: initialData?.teacher_id != null ? String(initialData.teacher_id) : '',
    day_of_week: initialData?.day_of_week != null ? String(initialData.day_of_week) : (fixedDayOfWeek != null ? String(fixedDayOfWeek) : ''),
    start_time: initialData?.start_time ? String(initialData.start_time).slice(0, 5) : '',
  });

  const weekdayOptions = WEEKDAYS.map((d) => ({ value: String(d.value), label: d.label }));
  const teacherOptions = teachers.map((t) => ({ value: String(t.id), label: t.full_name }));

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    const payload = { day_of_week: form.day_of_week, start_time: form.start_time };
    if (isAdmin && !initialData?.id) payload.teacher_id = form.teacher_id;
    onSubmit(payload);
  };

  return (
    <form className="slots-form" onSubmit={handleSubmit}>
      {isAdmin && (
        initialData?.id ? (
          <div className="slots-form-field">
            <label className="slots-form-label">Преподаватель</label>
            <div className="slots-form-readonly">{initialData.teacher_name || '—'}</div>
          </div>
        ) : (
          <Select
            label="Преподаватель"
            value={form.teacher_id}
            onChange={handleChange('teacher_id')}
            options={teacherOptions}
            placeholder="Выберите преподавателя"
            required
          />
        )
      )}
      <Select
        label="День недели"
        value={form.day_of_week}
        onChange={handleChange('day_of_week')}
        options={weekdayOptions}
        placeholder="Выберите день"
        required
        disabled={fixedDayOfWeek != null}
      />
      <Input
        label="Время начала (слот 1 час)"
        type="time"
        value={form.start_time}
        onChange={handleChange('start_time')}
        required
      />
      <div className="slots-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
};

const Slots = () => {
  const { isOwner } = useAuth();
  const isMobile = useMediaQuery('(max-width: 720px)');
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [activeDay, setActiveDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [createDefaultDay, setCreateDefaultDay] = useState(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeDay !== '' && activeDay != null) params.append('day_of_week', activeDay);
      const response = await apiClient.get(`${API_ENDPOINTS.SLOTS}?${params.toString()}`);
      if (response.data.ok) {
        const list = response.data.data?.items ?? [];
        setSlots(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Ошибка загрузки слотов:', err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [activeDay]);

  useEffect(() => {
    if (isOwner) {
      apiClient.get(`${API_ENDPOINTS.TEACHERS}?limit=500&offset=0`).then((r) => {
        if (r.data?.ok && r.data?.data?.items) setTeachers(r.data.data.items);
      }).catch(() => {});
      apiClient.get(API_ENDPOINTS.DEPARTMENTS).then((r) => {
        if (r.data?.ok && r.data?.data?.items) setDepartments(r.data.data.items);
      }).catch(() => {});
    }
  }, [isOwner]);

  const openCreate = () => {
    setEditingSlot(null);
    setCreateDefaultDay(activeDay);
    setIsModalOpen(true);
  };

  const openEdit = (slot) => {
    setEditingSlot(slot);
    setCreateDefaultDay(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSlot(null);
    setCreateDefaultDay(null);
    setSavingSlot(false);
  };

  const handleSave = async (payload) => {
    if (savingSlot) return;
    setSavingSlot(true);
    try {
      const body = { day_of_week: Number(payload.day_of_week), start_time: payload.start_time };
      if (editingSlot) {
        await apiClient.patch(API_ENDPOINTS.SLOT(editingSlot.id), body);
      } else {
        if (isOwner && payload.teacher_id) body.teacher_id = Number(payload.teacher_id);
        await apiClient.post(API_ENDPOINTS.SLOTS, body);
      }
      closeModal();
      loadSlots();
    } catch (err) {
      const msg = err.response?.data?.description || err.message || 'Не удалось сохранить слот';
      alert(msg);
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm('Удалить этот слот?')) return;
    try {
      await apiClient.delete(API_ENDPOINTS.SLOT(slotId));
      loadSlots();
    } catch (err) {
      alert('Не удалось удалить слот');
    }
  };

  const handleStatusChange = async (slotId, status, occupiedByDepartmentId = null) => {
    try {
      const body = { status };
      if (isOwner && occupiedByDepartmentId !== undefined) body.occupied_by_department_id = occupiedByDepartmentId || null;
      await apiClient.patch(API_ENDPOINTS.SLOT(slotId), body);
      loadSlots();
    } catch (err) {
      alert(err.response?.data?.description || 'Не удалось изменить статус');
    }
  };

  const slotStatusLabel = (slot) => {
    if (slot.status === 'occupied') {
      return slot.occupied_by_department_name ? `Занят (${slot.occupied_by_department_name})` : 'Занят';
    }
    return 'Свободен';
  };

  const slotsForDay = useMemo(() => {
    const list = activeDay !== '' && activeDay != null
      ? slots.filter((s) => Number(s.day_of_week) === Number(activeDay))
      : [...slots];
    return list.sort((a, b) => {
      const dayCmp = Number(a.day_of_week) - Number(b.day_of_week);
      return dayCmp !== 0 ? dayCmp : String(a.start_time).localeCompare(String(b.start_time));
    });
  }, [slots, activeDay]);

  const slotsByTimeForAdmin = useMemo(() => {
    const byTime = new Map();
    slotsForDay.forEach((s) => {
      const t = String(s.start_time).slice(0, 5);
      if (!byTime.has(t)) byTime.set(t, []);
      byTime.get(t).push(s);
    });
    return Array.from(byTime.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [slotsForDay]);

  const slotsGroupedByDay = useMemo(() => {
    const byDay = new Map();
    WEEKDAYS.forEach((d) => byDay.set(d.value, []));
    slots.forEach((s) => {
      const day = Number(s.day_of_week);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(s);
    });
    byDay.forEach((list) => list.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
    return byDay;
  }, [slots]);

  return (
    <Layout>
      <div className="slots-page">
        <div className="slots-header">
          <h1 className="slots-title">
            {isOwner ? 'Слоты преподавателей' : 'Мои слоты'}
          </h1>
          <div className="slots-header-actions">
            {loading && (
              <span className="slots-loading-badge">Идёт загрузка...</span>
            )}
            <Button variant="primary" onClick={openCreate} disabled={loading}>
              Добавить слот
            </Button>
          </div>
        </div>

        <p className="slots-description">
          {isOwner
            ? 'Свободные часы преподавателей по дням недели (один слот = 1 час). Выберите день.'
            : 'Укажите, в какие часы вы свободны для занятий. Один слот — один час.'}
        </p>

        <Card className="slots-day-tabs-card">
          <div className="slots-day-tabs">
            {DAY_TABS.map((d) => (
              <button
                key={d.value === '' ? 'all' : d.value}
                type="button"
                className={`slots-day-tab ${activeDay === d.value ? 'active' : ''}`}
                onClick={() => setActiveDay(d.value)}
              >
                {isMobile && d.value !== '' ? d.label.slice(0, 2) : d.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="slots-content-card">
          {loading ? (
            <LoadingSpinner size="medium" text="Загрузка слотов..." />
          ) : isOwner ? (
            <div className="slots-admin-view">
              {activeDay === '' ? (
                slotsGroupedByDay.size === 0 || [...slotsGroupedByDay.values()].every((arr) => arr.length === 0) ? (
                  <div className="slots-empty">Нет слотов</div>
                ) : (
                  <div className="slots-all-by-day">
                    {WEEKDAYS.map((d) => {
                      const daySlots = slotsGroupedByDay.get(d.value) || [];
                      if (daySlots.length === 0) return null;
                      const byTime = new Map();
                      daySlots.forEach((s) => {
                        const t = String(s.start_time).slice(0, 5);
                        if (!byTime.has(t)) byTime.set(t, []);
                        byTime.get(t).push(s);
                      });
                      const timeEntries = Array.from(byTime.entries()).sort(([a], [b]) => a.localeCompare(b));
                      return (
                        <section key={d.value} className="slots-day-section">
                          <h3 className="slots-day-section-title">{d.label}</h3>
                          <ul className="slots-time-list">
                            {timeEntries.map(([time, list]) => (
                              <li key={time} className="slots-time-row">
                                <span className="slots-time-label">{formatTimeRange(time)}</span>
                                <div className="slots-teacher-chips">
                                  {list.map((s) => (
                                    <span key={s.id} className="slots-teacher-chip-wrap">
                                      <span
                                        className="slots-teacher-chip"
                                        style={{ borderLeftColor: s.teacher_color || '#64748b' }}
                                      >
                                        {s.teacher_name}
                                        <span className={`slots-status-badge slots-status-${s.status || 'free'}`}>
                                          {slotStatusLabel(s)}
                                        </span>
                                      </span>
                                      <ActionMenu
                                        items={[
                                          ...(s.status === 'occupied'
                                            ? [{ label: 'Освободить', icon: '🟢', onClick: () => handleStatusChange(s.id, 'free') }]
                                            : [
                                                { label: 'Занять (без привязки)', icon: '🔴', onClick: () => handleStatusChange(s.id, 'occupied', null) },
                                                ...departments.map((d) => ({
                                                  label: `Занять (${d.name})`,
                                                  icon: '🔴',
                                                  onClick: () => handleStatusChange(s.id, 'occupied', d.id),
                                                })),
                                              ]
                                          ),
                                          { label: 'Редактировать', icon: '✏️', onClick: () => openEdit(s) },
                                          { label: 'Удалить', icon: '🗑️', danger: true, onClick: () => handleDelete(s.id) },
                                        ]}
                                      />
                                    </span>
                                  ))}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                )
              ) : slotsByTimeForAdmin.length === 0 ? (
                <div className="slots-empty">В этот день нет свободных слотов</div>
              ) : (
                <ul className="slots-time-list">
                  {slotsByTimeForAdmin.map(([time, list]) => (
                    <li key={time} className="slots-time-row">
                      <span className="slots-time-label">{formatTimeRange(time)}</span>
                      <div className="slots-teacher-chips">
                        {list.map((s) => (
                          <span key={s.id} className="slots-teacher-chip-wrap">
                            <span
                              className="slots-teacher-chip"
                              style={{ borderLeftColor: s.teacher_color || '#64748b' }}
                            >
                              {s.teacher_name}
                              <span className={`slots-status-badge slots-status-${s.status || 'free'}`}>
                                {slotStatusLabel(s)}
                              </span>
                            </span>
                            <ActionMenu
                              items={[
                                ...(s.status === 'occupied'
                                  ? [{ label: 'Освободить', icon: '🟢', onClick: () => handleStatusChange(s.id, 'free') }]
                                  : [
                                      { label: 'Занять (без привязки)', icon: '🔴', onClick: () => handleStatusChange(s.id, 'occupied', null) },
                                      ...departments.map((d) => ({
                                        label: `Занять (${d.name})`,
                                        icon: '🔴',
                                        onClick: () => handleStatusChange(s.id, 'occupied', d.id),
                                      })),
                                    ]
                                ),
                                { label: 'Редактировать', icon: '✏️', onClick: () => openEdit(s) },
                                { label: 'Удалить', icon: '🗑️', danger: true, onClick: () => handleDelete(s.id) },
                              ]}
                            />
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="slots-teacher-view">
              {activeDay === '' ? (
                (() => {
                  const hasAny = [...slotsGroupedByDay.values()].some((arr) => arr.length > 0);
                  if (!hasAny) {
                    return (
                      <div className="slots-empty">
                        Нет слотов. Нажмите «Добавить слот».
                      </div>
                    );
                  }
                  return (
                    <div className="slots-all-by-day">
                      {WEEKDAYS.map((d) => {
                        const daySlots = slotsGroupedByDay.get(d.value) || [];
                        if (daySlots.length === 0) return null;
                        return (
                          <section key={d.value} className="slots-day-section">
                            <h3 className="slots-day-section-title">{d.label}</h3>
                            <ul className="slots-my-list">
                              {daySlots.map((slot) => (
                                <li key={slot.id} className="slots-my-item">
                                  <span className="slots-my-time">{formatTimeRange(slot.start_time)}</span>
                                  <span className={`slots-status-badge slots-status-${slot.status || 'free'}`}>
                                    {slotStatusLabel(slot)}
                                  </span>
                                  <div className="slots-my-actions">
                                    <ActionMenu
                                      items={[
                                        ...(slot.status === 'occupied'
                                          ? [{ label: 'Освободить', icon: '🟢', onClick: () => handleStatusChange(slot.id, 'free') }]
                                          : [{ label: 'Занять', icon: '🔴', onClick: () => handleStatusChange(slot.id, 'occupied', null) }]
                                        ),
                                        { label: 'Редактировать', icon: '✏️', onClick: () => openEdit(slot) },
                                        { label: 'Удалить', icon: '🗑️', danger: true, onClick: () => handleDelete(slot.id) },
                                      ]}
                                    />
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </section>
                        );
                      })}
                      <Button variant="secondary" className="slots-add-more" onClick={openCreate} disabled={loading}>
                        + Добавить слот
                      </Button>
                    </div>
                  );
                })()
              ) : slotsForDay.length === 0 ? (
                <div className="slots-empty">
                  Нет слотов на этот день. Нажмите «Добавить слот».
                </div>
              ) : (
                <>
                  <ul className="slots-my-list">
                    {slotsForDay.map((slot) => (
                      <li key={slot.id} className="slots-my-item">
                        <span className="slots-my-time">{formatTimeRange(slot.start_time)}</span>
                        <span className={`slots-status-badge slots-status-${slot.status || 'free'}`}>
                          {slotStatusLabel(slot)}
                        </span>
                        <div className="slots-my-actions">
                          <ActionMenu
                            items={[
                              ...(slot.status === 'occupied'
                                ? [{ label: 'Освободить', icon: '🟢', onClick: () => handleStatusChange(slot.id, 'free') }]
                                : [{ label: 'Занять', icon: '🔴', onClick: () => handleStatusChange(slot.id, 'occupied', null) }]
                              ),
                              { label: 'Редактировать', icon: '✏️', onClick: () => openEdit(slot) },
                              { label: 'Удалить', icon: '🗑️', danger: true, onClick: () => handleDelete(slot.id) },
                            ]}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button variant="secondary" className="slots-add-more" onClick={openCreate} disabled={loading}>
                    + Добавить ещё слот
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={() => { if (!savingSlot) closeModal(); }}
          title={editingSlot ? 'Редактировать слот' : 'Добавить слот'}
          size="medium"
        >
          <SlotForm
            initialData={editingSlot || (createDefaultDay != null ? { day_of_week: createDefaultDay, start_time: '' } : null)}
            fixedDayOfWeek={null}
            onSubmit={handleSave}
            onCancel={closeModal}
            saving={savingSlot}
            isAdmin={isOwner}
            teachers={teachers}
          />
        </Modal>
      </div>
    </Layout>
  );
};

export default Slots;
