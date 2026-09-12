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
import TeacherPasswordReset from './TeacherPasswordReset';
import './TeacherAccounts.css';

const TeacherAccounts = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

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
    if (creating) return;
    setIsModalOpen(false);
    setSelectedTeacher(null);
  };

  const handleCreated = () => {
    setIsModalOpen(false);
    setSelectedTeacher(null);
    setCreating(false);
    setNotice('Учётная запись создана. Передайте преподавателю пароль отдельно.');
    loadAccounts();
  };

  const copyToClipboard = async (text, successMessage) => {
    setError('');
    try {
      await navigator.clipboard.writeText(text);
      setNotice(successMessage);
    } catch (error) {
      setError('Не удалось скопировать. Проверьте разрешение на доступ к буферу обмена.');
    }
  };

  const buildInviteText = (row) => {
    return `Приглашение в систему АЙТИ КЛУБ
Ссылка для входа: https://it-club-system.tps-eco.ru/login
Логин: ${row.login}
Пароль администратор передаст отдельно.`;
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
                onClick={() => setPasswordTarget(row)}
                aria-label={`Изменить пароль: ${row.full_name}`}
              >
                Изменить пароль
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
            <h1 className="teacher-accounts-title">Учётные записи</h1>
            <div className="teacher-accounts-subtitle">
              Аккаунтов без учётки: {teachersWithoutAccount.length}
            </div>
          </div>
          <Button variant="primary" onClick={() => openCreate()}>
            Создать учетку
          </Button>
        </div>

        {notice && <p className="teacher-accounts-note" role="status">{notice}</p>}
        {error && <div className="form-error" role="alert">{error}</div>}
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
            onSavingChange={setCreating}
          />
        </Modal>
        {passwordTarget && <TeacherPasswordReset account={passwordTarget} onClose={() => setPasswordTarget(null)} onSuccess={() => {
          setPasswordTarget(null);
          setNotice('Пароль изменён. Передайте новый пароль преподавателю отдельно.');
        }} />}
      </div>
    </Layout>
  );
};

export default TeacherAccounts;
