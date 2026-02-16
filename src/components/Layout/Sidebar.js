import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isOwner, isTeacher, crmAccess } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const ownerMenuItems = [
    { path: '/dashboard', label: 'Дашборд', icon: '📊' },
    { path: '/lessons', label: 'Занятия', icon: '📚' },
    { path: '/schedule', label: 'Расписание', icon: '🗓️' },
    { path: '/slots', label: 'Слоты', icon: '🕐' },
    { path: '/branches', label: 'Филиалы', icon: '🏢' },
    { path: '/departments', label: 'Отделы', icon: '🏛️' },
    { path: '/salary', label: 'Зарплата', icon: '💰' },
    { path: '/teachers', label: 'Преподаватели', icon: '👥' },
    { path: '/teacher-accounts', label: 'Создание учеток', icon: '🧾' },
    ...(crmAccess ? [{ path: '/crm', label: 'CRM', icon: '💬' }] : []),
    { path: '/instructions', label: 'Инструкции', icon: '📖' },
    { path: '/settings', label: 'Настройки', icon: '⚙️' },
  ];

  const teacherMenuItems = [
    { path: '/dashboard', label: 'Дашборд', icon: '📊' },
    { path: '/lessons', label: 'Мои занятия', icon: '📚' },
    { path: '/schedule', label: 'Расписание', icon: '🗓️' },
    { path: '/slots', label: 'Слоты', icon: '🕐' },
    { path: '/instructions', label: 'Инструкции', icon: '📖' },
  ];

  const menuItems = isOwner ? ownerMenuItems : teacherMenuItems;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
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
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => onClose?.()}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="sidebar-logout">
          Выйти
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
