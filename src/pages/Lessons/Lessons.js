import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { formatDateTime, getCurrentMonth } from '../../utils/format';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Table from '../../components/Table/Table';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Modal from '../../components/Modal/Modal';
import DepartmentSelector from '../../components/DepartmentSelector/DepartmentSelector';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import InvoiceModal from '../../components/InvoiceModal/InvoiceModal';
import LessonForm from './LessonForm';
import './Lessons.css';

const Lessons = () => {
  const { isOwner } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filters, setFilters] = useState({
    branch_id: '',
    teacher_id: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);

  useEffect(() => {
    loadLessons();
  }, [month, filters, selectedDepartment]);

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

  return (
    <Layout>
      <div className="lessons-page">
        <div className="lessons-header">
          <h1 className="lessons-title">{isOwner ? 'Занятия' : 'Мои занятия'}</h1>
          <Button onClick={handleCreate} variant="primary">
            Создать занятие
          </Button>
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

        {isOwner && branchesWithLessons.length > 0 && (
          <Card title="Выставить счета по филиалам">
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
          </Card>
        )}

        <Card>
          {loading ? (
            <LoadingSpinner size="medium" text="Загрузка занятий..." />
          ) : (
            <Table
              columns={columns}
              data={lessons}
              loading={false}
              emptyMessage="Нет занятий за выбранный период"
            />
          )}
        </Card>

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
