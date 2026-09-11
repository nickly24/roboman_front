import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { TEACHER_STATUS_LABELS } from '../../utils/constants';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Table from '../../components/Table/Table';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import ActionMenu from '../../components/ActionMenu/ActionMenu';
import TeacherForm from './TeacherForm';
import './Teachers.css';

const Teachers = () => {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.TEACHERS}?limit=500&offset=0`);
      if (response.data.ok) {
        const data = response.data.data;
        const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setTeachers(list);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Ошибка загрузки преподавателей:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeTeachers = useMemo(
    () => teachers.filter((t) => t.status === 'working'),
    [teachers]
  );
  const archiveTeachers = useMemo(
    () => teachers.filter((t) => t.status !== 'working'),
    [teachers]
  );

  const openCreate = () => {
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const openEdit = (teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  const handleSaved = () => {
    closeModal();
    loadTeachers();
  };

  const setStatus = async (teacherId, status) => {
    try {
      await apiClient.put(API_ENDPOINTS.TEACHER_STATUS(teacherId), { status });
      loadTeachers();
    } catch (error) {
      alert('Не удалось изменить статус преподавателя');
      // eslint-disable-next-line no-console
      console.error(error);
    }
  };

  const toggleSalaryFree = async (teacher) => {
    const makeFree = !teacher.is_salary_free;
    const message = makeFree
      ? `Сделать преподавателя "${teacher.full_name}" бесплатным?`
      : `Сделать преподавателя "${teacher.full_name}" платным?`;
    if (!window.confirm(message)) return;
    try {
      await apiClient.put(API_ENDPOINTS.TEACHER(teacher.id), { is_salary_free: makeFree });
      loadTeachers();
    } catch (error) {
      alert('Не удалось изменить настройку оплаты');
      // eslint-disable-next-line no-console
      console.error(error);
    }
  };

  const columnsActive = [
    { key: 'full_name', title: 'ФИО' },
    {
      key: 'color',
      title: 'Цвет',
      render: (value) => (
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: value,
            border: '1px solid var(--color-border)',
          }}
        />
      ),
      align: 'center',
      width: 80,
    },
    {
      key: 'status',
      title: 'Статус',
      render: (value) => TEACHER_STATUS_LABELS[value] || value,
      width: 140,
    },
    {
      key: 'is_salary_free',
      title: 'Оплата',
      render: (value) => (
        <span className={`teacher-badge ${value ? 'teacher-badge-free' : 'teacher-badge-paid'}`}>
          {value ? 'Бесплатно' : 'Платно'}
        </span>
      ),
      align: 'center',
      width: 140,
    },
    {
      key: 'actions',
      title: '',
      align: 'right',
      width: 280,
      render: (_, row) => (
        <div className="row-actions">
          <Button size="small" variant="secondary" onClick={() => openEdit(row)}>
            Редактировать
          </Button>
          <ActionMenu
            items={[
              {
                label: row.is_salary_free ? 'Сделать платным' : 'Сделать бесплатным',
                icon: row.is_salary_free ? '💳' : '🆓',
                onClick: () => toggleSalaryFree(row),
              },
              { label: 'В отпуск', icon: '🏖️', onClick: () => setStatus(row.id, 'vacation') },
              { label: 'В архив', icon: '📦', danger: true, onClick: () => setStatus(row.id, 'fired') },
            ]}
          />
        </div>
      ),
    },
  ];

  const columnsArchive = [
    { key: 'full_name', title: 'ФИО' },
    {
      key: 'color',
      title: 'Цвет',
      render: (value) => (
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: value,
            border: '1px solid var(--color-border)',
          }}
        />
      ),
      align: 'center',
      width: 80,
    },
    {
      key: 'status',
      title: 'Статус',
      render: (value) => TEACHER_STATUS_LABELS[value] || value,
      width: 140,
    },
    {
      key: 'is_salary_free',
      title: 'Оплата',
      render: (value) => (
        <span className={`teacher-badge ${value ? 'teacher-badge-free' : 'teacher-badge-paid'}`}>
          {value ? 'Бесплатно' : 'Платно'}
        </span>
      ),
      align: 'center',
      width: 140,
    },
    {
      key: 'actions',
      title: '',
      align: 'right',
      width: 260,
      render: (_, row) => (
        <div className="row-actions">
          <Button size="small" variant="primary" onClick={() => setStatus(row.id, 'working')}>
            Вернуть
          </Button>
          <ActionMenu
            items={[
              { label: 'Редактировать', icon: '✏️', onClick: () => openEdit(row) },
              {
                label: row.is_salary_free ? 'Сделать платным' : 'Сделать бесплатным',
                icon: row.is_salary_free ? '💳' : '🆓',
                onClick: () => toggleSalaryFree(row),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="teachers-page">
        <div className="teachers-header">
          <div><h1 className="teachers-title">Преподаватели</h1><p className="page-description">Команда, занятость и условия работы</p></div>
          <Button variant="primary" onClick={openCreate}>
            Создать преподавателя
          </Button>
        </div>

        <Card>
          {loading ? (
            <LoadingSpinner size="medium" text="Загрузка преподавателей..." />
          ) : (
            <Table
              columns={columnsActive}
              data={activeTeachers}
              loading={false}
              emptyMessage="Нет активных преподавателей"
            />
          )}
        </Card>

        <Card style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Архив</div>
              <div style={{ opacity: 0.7, fontSize: 13 }}>Неактивные преподаватели: {archiveTeachers.length}</div>
            </div>
            <Button variant="ghost" onClick={() => setShowArchive((v) => !v)}>
              {showArchive ? 'Скрыть' : 'Показать'}
            </Button>
          </div>

          {showArchive && (
            <div style={{ marginTop: 12 }}>
              <Table
                columns={columnsArchive}
                data={archiveTeachers}
                loading={false}
                emptyMessage="Архив пуст"
              />
            </div>
          )}
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingTeacher ? 'Редактировать преподавателя' : 'Создать преподавателя'}
          size="medium"
        >
          <TeacherForm teacher={editingTeacher} onSuccess={handleSaved} onCancel={closeModal} />
        </Modal>
      </div>
    </Layout>
  );
};

export default Teachers;
