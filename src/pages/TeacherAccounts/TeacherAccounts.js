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
import TeacherAccountForm from './TeacherAccountForm';
import './TeacherAccounts.css';

const TeacherAccounts = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.TEACHER_ACCOUNTS}?limit=500&offset=0`);
      if (response.data.ok) {
        const data = response.data.data;
        const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setAccounts(list);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Ошибка загрузки учёток преподавателей:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const teachersWithoutAccount = useMemo(
    () => accounts.filter((item) => !item.user_id),
    [accounts]
  );

  const openCreate = (teacher = null) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTeacher(null);
  };

  const handleCreated = () => {
    closeModal();
    loadAccounts();
  };

  const copyToClipboard = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(successMessage);
    } catch (error) {
      alert('Не удалось скопировать');
    }
  };

  const buildInviteText = (row) => {
    return `Приглашение в систему АЙТИ КЛУБ
Ссылка для входа: https://it-club-system.tps-eco.ru/login
Логин: ${row.login}
Пароль: ${row.password}`;
  };

  const columns = [
    { key: 'full_name', title: 'Преподаватель' },
    {
      key: 'status',
      title: 'Статус',
      render: (value) => TEACHER_STATUS_LABELS[value] || value,
      width: 140,
    },
    {
      key: 'login',
      title: 'Логин',
      render: (value, row) => (row.user_id ? value : '—'),
    },
    {
      key: 'password',
      title: 'Пароль',
      render: (value, row) => (row.user_id ? value : '—'),
    },
    {
      key: 'actions',
      title: '',
      align: 'right',
      width: 320,
      render: (_, row) => (
        <div className="teacher-accounts-actions">
          {row.user_id ? (
            <>
              <Button
                size="small"
                variant="secondary"
                onClick={() => copyToClipboard(row.login, 'Логин скопирован')}
              >
                Копировать логин
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => copyToClipboard(row.password, 'Пароль скопирован')}
              >
                Копировать пароль
              </Button>
              <Button
                size="small"
                variant="primary"
                onClick={() => copyToClipboard(buildInviteText(row), 'Приглашение скопировано')}
              >
                Копировать приглашение
              </Button>
            </>
          ) : (
            <Button size="small" variant="primary" onClick={() => openCreate(row)}>
              Создать учетку
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="teacher-accounts-page">
        <div className="teacher-accounts-header">
          <div>
            <h1 className="teacher-accounts-title">Создание учеток для преподов</h1>
            <div className="teacher-accounts-subtitle">
              Аккаунтов без учётки: {teachersWithoutAccount.length}
            </div>
          </div>
          <Button variant="primary" onClick={() => openCreate()}>
            Создать учетку
          </Button>
        </div>

        <Card>
          {loading ? (
            <LoadingSpinner size="medium" text="Загрузка учёток..." />
          ) : (
            <Table
              columns={columns}
              data={accounts}
              loading={false}
              emptyMessage="Преподаватели не найдены"
            />
          )}
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title="Создать учетку преподавателя"
          size="medium"
        >
          <TeacherAccountForm
            teachers={teachersWithoutAccount}
            initialTeacher={selectedTeacher}
            onSuccess={handleCreated}
            onCancel={closeModal}
          />
        </Modal>
      </div>
    </Layout>
  );
};

export default TeacherAccounts;
