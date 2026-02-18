import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  IconDashboard,
  IconLessons,
  IconSchedule,
  IconSlots,
  IconBranches,
  IconDepartments,
  IconSalary,
  IconTeachers,
  IconTeacherAccounts,
  IconCRM,
  IconInstructions,
  IconSettings,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
} from '../Icons/SidebarIcons';
import './Sidebar.css';

const iconMap = {
  dashboard: IconDashboard,
  lessons: IconLessons,
  schedule: IconSchedule,
  slots: IconSlots,
  branches: IconBranches,
  departments: IconDepartments,
  salary: IconSalary,
  teachers: IconTeachers,
  'teacher-accounts': IconTeacherAccounts,
  crm: IconCRM,
  instructions: IconInstructions,
  settings: IconSettings,
};

const Sidebar = ({ isOpen = false, onClose, expanded = true, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isOwner, isTeacher, crmAccess } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const ownerMenuItems = [
    { path: '/dashboard', label: 'Дашборд', iconKey: 'dashboard' },
    { path: '/lessons', label: 'Занятия', iconKey: 'lessons' },
    { path: '/schedule', label: 'Расписание', iconKey: 'schedule' },
    { path: '/slots', label: 'Слоты', iconKey: 'slots' },
    { path: '/branches', label: 'Филиалы', iconKey: 'branches' },
    { path: '/departments', label: 'Отделы', iconKey: 'departments' },
    { path: '/salary', label: 'Зарплата', iconKey: 'salary' },
    { path: '/teachers', label: 'Преподаватели', iconKey: 'teachers' },
    { path: '/teacher-accounts', label: 'Создание учеток', iconKey: 'teacher-accounts' },
    ...(crmAccess ? [{ path: '/crm', label: 'CRM', iconKey: 'crm' }] : []),
    { path: '/instructions', label: 'Инструкции', iconKey: 'instructions' },
    { path: '/settings', label: 'Настройки', iconKey: 'settings' },
  ];

  const teacherMenuItems = [
    { path: '/dashboard', label: 'Дашборд', iconKey: 'dashboard' },
    { path: '/lessons', label: 'Мои занятия', iconKey: 'lessons' },
    { path: '/schedule', label: 'Расписание', iconKey: 'schedule' },
    { path: '/slots', label: 'Слоты', iconKey: 'slots' },
    { path: '/instructions', label: 'Инструкции', iconKey: 'instructions' },
  ];

  const menuItems = isOwner ? ownerMenuItems : teacherMenuItems;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${!expanded ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h1 className="sidebar-logo">RoboMan</h1>
        <div className="sidebar-user">
          <span className="sidebar-user-name">{user?.profile?.full_name || user?.user?.login}</span>
          <span className="sidebar-user-role">
            {isOwner ? 'Владелец' : 'Преподаватель'}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = iconMap[item.iconKey];
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => onClose?.()}
            >
              <span className="sidebar-nav-icon">{Icon ? <Icon /> : null}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title={expanded ? 'Свернуть' : 'Развернуть'}
          aria-label={expanded ? 'Свернуть сайдбар' : 'Развернуть сайдбар'}
        >
          <span className="sidebar-toggle-icon">
            {expanded ? <IconChevronLeft /> : <IconChevronRight />}
          </span>
          <span className="sidebar-toggle-label">
            {expanded ? 'Свернуть' : 'Развернуть'}
          </span>
        </button>
        <button onClick={handleLogout} className="sidebar-logout">
          <span className="sidebar-logout-icon"><IconLogout /></span>
          <span className="sidebar-logout-label">Выйти</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
