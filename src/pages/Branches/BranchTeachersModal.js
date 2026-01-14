import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import Modal from '../../components/Modal/Modal';
import Button from '../../components/Button/Button';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import { TEACHER_STATUS_LABELS } from '../../utils/constants';
import './BranchTeachersModal.css';

const MAX_TEACHERS_PER_BRANCH = 3;

const BranchTeachersModal = ({ isOpen, onClose, branch }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const selectedSet = useMemo(() => new Set(selectedIds.map((id) => String(id))), [selectedIds]);
  const selectedCount = selectedIds.length;

  useEffect(() => {
    if (!isOpen || !branch?.id) return;
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, branch?.id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [allTeachersResp, branchTeachersResp] = await Promise.all([
        apiClient.get(`${API_ENDPOINTS.TEACHERS}?limit=500&offset=0`),
        apiClient.get(API_ENDPOINTS.BRANCH_TEACHERS(branch.id)),
      ]);

      const allTeachersData = allTeachersResp.data?.ok ? allTeachersResp.data.data : null;
      const branchTeachersData = branchTeachersResp.data?.ok ? branchTeachersResp.data.data : null;

      const allTeachers = Array.isArray(allTeachersData?.items)
        ? allTeachersData.items
        : Array.isArray(allTeachersData)
          ? allTeachersData
          : [];

      const currentTeachers = Array.isArray(branchTeachersData?.items)
        ? branchTeachersData.items
        : Array.isArray(branchTeachersData)
          ? branchTeachersData
          : [];

      // Не даём привязывать уволенных: они остаются в истории, но не участвуют в новых привязках.
      setTeachers(allTeachers.filter((t) => t.status !== 'fired'));
      setSelectedIds(currentTeachers.map((t) => t.id));
    } catch (e) {
      setError('Не удалось загрузить список преподавателей');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeacher = (teacherId) => {
    const id = String(teacherId);
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(Array.from(next.values()));
  };

  const handleSave = async () => {
    if (!branch?.id) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.put(API_ENDPOINTS.BRANCH_TEACHERS(branch.id), {
        teacher_ids: selectedIds.map((id) => Number(id)),
      });
      onClose?.({ saved: true });
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message;
      setError(msg || 'Не удалось сохранить привязки (ограничение: до 3 преподавателей на филиал)');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => onClose?.({ saved: false });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Преподаватели филиала: ${branch?.name || `#${branch?.id}`}`}
      size="large"
    >
      {loading ? (
        <LoadingSpinner size="medium" text="Загрузка преподавателей..." />
      ) : (
        <div className="branch-teachers">
          {error && <div className="branch-teachers-error">{error}</div>}

          <div className="branch-teachers-hint">
            Можно выбрать до {MAX_TEACHERS_PER_BRANCH} преподавателей. Сейчас выбрано: {selectedCount}.
          </div>

          <div className="branch-teachers-list">
            {teachers.map((t) => {
              const checked = selectedSet.has(String(t.id));
              const disabled = !checked && selectedCount >= MAX_TEACHERS_PER_BRANCH;
              return (
                <label key={t.id} className={`branch-teachers-item ${disabled ? 'disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled || saving}
                    onChange={() => toggleTeacher(t.id)}
                  />
                  <span className="branch-teachers-color" style={{ backgroundColor: t.color || '#e5e7eb' }} />
                  <span className="branch-teachers-name">{t.full_name}</span>
                  <span className="branch-teachers-status">{TEACHER_STATUS_LABELS[t.status] || t.status}</span>
                </label>
              );
            })}
          </div>

          <div className="branch-teachers-actions">
            <Button variant="secondary" onClick={handleClose} disabled={saving}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BranchTeachersModal;

