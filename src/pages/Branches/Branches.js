import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { formatCurrency } from '../../utils/format';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/Card/Card';
import Table from '../../components/Table/Table';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import DepartmentSelector from '../../components/DepartmentSelector/DepartmentSelector';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import ActionMenu from '../../components/ActionMenu/ActionMenu';
import BranchForm from './BranchForm';
import BranchTeachersModal from './BranchTeachersModal';
import './Branches.css';

const Branches = () => {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [teachersBranch, setTeachersBranch] = useState(null);

  useEffect(() => {
    loadBranches();
  }, [selectedDepartment]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      // Всегда загружаем ВСЕ филиалы (активные + архивные),
      // а отображение/фильтрацию делаем на фронте.
      // - если выбран отдел → ручка /departments/{id}/branches (она реально фильтрует по отделу)
      // - иначе → /branches?include_inactive=true
      const url = selectedDepartment
        ? API_ENDPOINTS.DEPARTMENT_BRANCHES(selectedDepartment)
        : `${API_ENDPOINTS.BRANCHES}?${new URLSearchParams({
            include_inactive: 'true',
            // В бэке max_limit=500 (см. _paginate), иначе будет 400 BAD REQUEST
            limit: '500',
            offset: '0',
          }).toString()}`;
      
      const response = await apiClient.get(url);
      if (response.data.ok) {
        const data = response.data.data;
        setBranches(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      }
    } catch (error) {
      console.error('Ошибка загрузки филиалов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (branchId) => {
    try {
      await apiClient.put(API_ENDPOINTS.BRANCH_ACTIVATE(branchId));
      loadBranches();
    } catch (error) {
      alert('Ошибка активации филиала');
      console.error(error);
    }
  };

  const handleDeactivate = async (branchId) => {
    try {
      await apiClient.put(API_ENDPOINTS.BRANCH_DEACTIVATE(branchId));
      loadBranches();
    } catch (error) {
      alert('Ошибка деактивации филиала');
      console.error(error);
    }
  };

  const handleCreate = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleTeachers = (branch) => {
    setTeachersBranch(branch);
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот филиал?')) {
      return;
    }

    try {
      await apiClient.delete(API_ENDPOINTS.BRANCH(branchId));
      loadBranches();
    } catch (error) {
      alert('Ошибка удаления филиала');
      console.error(error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    loadBranches();
  };

  const handleTeachersClose = ({ saved } = {}) => {
    setTeachersBranch(null);
    if (saved) loadBranches();
  };

  const activeBranches = branches.filter((b) => Number(b?.is_active) === 1);
  const inactiveBranches = branches.filter((b) => Number(b?.is_active) !== 1);

  const columnsActive = [
    { key: 'name', title: 'Название' },
    { key: 'address', title: 'Адрес' },
    { key: 'metro', title: 'Метро' },
    { key: 'price_per_child', title: 'Цена за ребёнка', render: (value) => formatCurrency(value), align: 'right' },
    { key: 'department_name', title: 'Отдел' },
    {
      key: 'actions',
      title: '',
      align: 'right',
      width: 190,
      render: (_, row) => (
        <div className="row-actions">
          <Button size="small" variant="secondary" onClick={() => handleEdit(row)}>
            Редактировать
          </Button>
          <ActionMenu
            items={[
              { label: 'Преподаватели', icon: '👥', onClick: () => handleTeachers(row) },
              { type: 'divider' },
              { label: 'В архив', icon: '📦', onClick: () => handleDeactivate(row.id) },
              { label: 'Удалить', icon: '🗑️', danger: true, onClick: () => handleDelete(row.id) },
            ]}
          />
        </div>
      ),
    },
  ];

  const columnsArchive = [
    { key: 'name', title: 'Название' },
    { key: 'address', title: 'Адрес' },
    { key: 'metro', title: 'Метро' },
    { key: 'price_per_child', title: 'Цена за ребёнка', render: (value) => formatCurrency(value), align: 'right' },
    { key: 'department_name', title: 'Отдел' },
    {
      key: 'actions',
      title: '',
      align: 'right',
      width: 190,
      render: (_, row) => (
        <div className="row-actions">
          <Button size="small" variant="primary" onClick={() => handleActivate(row.id)}>
            Активировать
          </Button>
          <ActionMenu
            items={[
              { label: 'Преподаватели', icon: '👥', onClick: () => handleTeachers(row) },
              { label: 'Редактировать', icon: '✏️', onClick: () => handleEdit(row) },
              { type: 'divider' },
              { label: 'Удалить', icon: '🗑️', danger: true, onClick: () => handleDelete(row.id) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="branches-page">
        <div className="branches-header">
          <h1 className="branches-title">Филиалы</h1>
          <Button onClick={handleCreate} variant="primary">
            Создать филиал
          </Button>
        </div>

        <Card className="branches-filters">
          <DepartmentSelector
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            label="Отдел"
          />
        </Card>

        <Card>
          {loading ? (
            <LoadingSpinner size="medium" text="Загрузка филиалов..." />
          ) : (
            <Table
              columns={columnsActive}
              data={activeBranches}
              loading={false}
              emptyMessage="Нет активных филиалов"
            />
          )}
        </Card>

        <Card style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Архив</div>
              <div style={{ opacity: 0.7, fontSize: 13 }}>Неактивные филиалы: {inactiveBranches.length}</div>
            </div>
            <Button variant="ghost" onClick={() => setShowArchive((v) => !v)}>
              {showArchive ? 'Скрыть' : 'Показать'}
            </Button>
          </div>

          {showArchive && (
            <div style={{ marginTop: 12 }}>
              <Table
                columns={columnsArchive}
                data={inactiveBranches}
                loading={false}
                emptyMessage="Архив пуст"
              />
            </div>
          )}
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          title={editingBranch ? 'Редактировать филиал' : 'Создать филиал'}
          size="medium"
        >
          <BranchForm
            branch={editingBranch}
            onSuccess={handleModalClose}
            onCancel={handleModalClose}
          />
        </Modal>

        <BranchTeachersModal
          isOpen={!!teachersBranch}
          onClose={handleTeachersClose}
          branch={teachersBranch}
        />
      </div>
    </Layout>
  );
};

export default Branches;
