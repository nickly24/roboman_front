import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  IconAnalytics,
  IconInstructions,
  IconSettings,
  IconAccounting,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconSun,
  IconMoon,
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
  analytics: IconAnalytics,
  instructions: IconInstructions,
  settings: IconSettings,
  accounting: IconAccounting,
};

const STORAGE_GROUPS = 'sidebar-groups-expanded';

const Sidebar = ({ isOpen = false, onClose, expanded = true, onToggleCollapse, isMobile = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isOwner, isTeacher, crmAccess } = useAuth();
  const { theme, setTheme } = useTheme();

  const [groupsOpen, setGroupsOpen] = useState({
    lessons: true,
    references: true,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_GROUPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        setGroupsOpen((prev) => ({ ...prev, ...parsed }));
      }
    } catch (_) {}
  }, []);

  const setGroupOpen = (key, value) => {
    setGroupsOpen((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_GROUPS, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Управление занятиями: Занятия, Расписание, Слоты, Зарплата (owner), Инструкции
  const lessonsGroupPaths = ['/lessons', '/schedule', '/slots', '/instructions', '/salary'];
  const isLessonsActive = lessonsGroupPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  // Справочники: Филиалы, Отделы, Преподаватели, Создание учеток, Настройки
  const refsGroupPaths = ['/branches', '/departments', '/teachers', '/teacher-accounts', '/settings'];
  const isRefsActive = refsGroupPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  // Авто-раскрытие группы при навигации в её раздел
  useEffect(() => {
    if (!isLessonsActive && !isRefsActive) return;
    setGroupsOpen((prev) => {
      let changed = false;
      const next = { ...prev };
      if (isLessonsActive && !prev.lessons) { next.lessons = true; changed = true; }
      if (isRefsActive && !prev.references) { next.references = true; changed = true; }
      if (changed) {
        try { localStorage.setItem(STORAGE_GROUPS, JSON.stringify(next)); } catch (_) {}
        return next;
      }
      return prev;
    });
  }, [location.pathname, isLessonsActive, isRefsActive]);

  const lessonsGroupItems = [
    { path: '/lessons', label: isTeacher ? 'Мои занятия' : 'Занятия', iconKey: 'lessons' },
    { path: '/schedule', label: 'Расписание', iconKey: 'schedule' },
    { path: '/slots', label: 'Слоты', iconKey: 'slots' },
    ...(isOwner ? [{ path: '/salary', label: 'Зарплата', iconKey: 'salary' }] : []),
    { path: '/instructions', label: 'Инструкции', iconKey: 'instructions' },
  ];

  const refsGroupItems = [
    { path: '/branches', label: 'Филиалы', iconKey: 'branches' },
    { path: '/departments', label: 'Отделы', iconKey: 'departments' },
    { path: '/teachers', label: 'Преподаватели', iconKey: 'teachers' },
    { path: '/teacher-accounts', label: 'Создание учеток', iconKey: 'teacher-accounts' },
    { path: '/settings', label: 'Настройки', iconKey: 'settings' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${!expanded ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <img
          src={`${process.env.PUBLIC_URL || ''}/Heads/${expanded || isOpen ? 'full.svg' : 'min.svg'}`}
          alt="RoboMan"
          className="sidebar-logo"
        />
        <div className="sidebar-logo-divider" aria-hidden />
        <div className="sidebar-user">
          <span className="sidebar-user-name">{user?.profile?.full_name || user?.user?.login}</span>
          <span className={`sidebar-user-role-badge ${isOwner ? 'sidebar-user-role-owner' : 'sidebar-user-role-teacher'}`}>
            {isOwner ? 'Владелец' : 'Преподаватель'}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Дашборд */}
        <Link
          to="/dashboard"
          className={`sidebar-nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          onClick={() => onClose?.()}
        >
          <span className="sidebar-nav-icon"><IconDashboard /></span>
          <span className="sidebar-nav-label">Дашборд</span>
        </Link>

        {/* Управление занятиями */}
        <div className="sidebar-group">
          <button
            type="button"
            className={`sidebar-group-toggle ${isLessonsActive ? 'active' : ''}`}
            onClick={() => {
              if (!expanded) {
                onToggleCollapse?.();
              } else {
                setGroupOpen('lessons', !groupsOpen.lessons);
              }
            }}
            aria-expanded={groupsOpen.lessons}
            aria-controls="sidebar-group-lessons"
          >
            <span className="sidebar-nav-icon sidebar-group-icon">
              <IconLessons />
            </span>
            <span className="sidebar-nav-label">Управление занятиями</span>
            <span className="sidebar-group-chevron">
              {groupsOpen.lessons ? <IconChevronUp /> : <IconChevronDown />}
            </span>
          </button>
          <div id="sidebar-group-lessons" className={`sidebar-group-items ${groupsOpen.lessons ? 'open' : ''}`}>
            {lessonsGroupItems.map((item) => {
              const Icon = iconMap[item.iconKey];
              const isItemActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item sidebar-nav-subitem ${isItemActive ? 'active' : ''}`}
                  onClick={() => onClose?.()}
                >
                  <span className="sidebar-nav-icon">{Icon ? <Icon /> : null}</span>
                  <span className="sidebar-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Справочники (только owner) */}
        {isOwner && (
          <div className="sidebar-group">
            <button
              type="button"
              className={`sidebar-group-toggle ${isRefsActive ? 'active' : ''}`}
              onClick={() => {
                if (!expanded) {
                  onToggleCollapse?.();
                } else {
                  setGroupOpen('references', !groupsOpen.references);
                }
              }}
              aria-expanded={groupsOpen.references}
              aria-controls="sidebar-group-references"
            >
              <span className="sidebar-nav-icon sidebar-group-icon">
                <IconDepartments />
              </span>
              <span className="sidebar-nav-label">Справочники</span>
              <span className="sidebar-group-chevron">
                {groupsOpen.references ? <IconChevronUp /> : <IconChevronDown />}
              </span>
            </button>
            <div id="sidebar-group-references" className={`sidebar-group-items ${groupsOpen.references ? 'open' : ''}`}>
              {refsGroupItems.map((item) => {
                const Icon = iconMap[item.iconKey];
                const isItemActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`sidebar-nav-item sidebar-nav-subitem ${isItemActive ? 'active' : ''}`}
                    onClick={() => onClose?.()}
                  >
                    <span className="sidebar-nav-icon">{Icon ? <Icon /> : null}</span>
                    <span className="sidebar-nav-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* CRM (отдельная мини-система) */}
        {isOwner && crmAccess && (
          <Link
            to="/crm"
            className={`sidebar-nav-item sidebar-nav-item-crm ${location.pathname.startsWith('/crm') ? 'active' : ''}`}
            onClick={() => onClose?.()}
          >
            <span className="sidebar-nav-icon"><IconCRM /></span>
            <span className="sidebar-nav-label">CRM</span>
          </Link>
        )}

        {/* Бухгалтерия (только owner) */}
        {isOwner && (
          <Link
            to="/accounting"
            className={`sidebar-nav-item ${location.pathname.startsWith('/accounting') ? 'active' : ''}`}
            onClick={() => onClose?.()}
          >
            <span className="sidebar-nav-icon"><IconAccounting /></span>
            <span className="sidebar-nav-label">Бухгалтерия</span>
          </Link>
        )}

        {/* Аналитика (только owner) */}
        {isOwner && (
          <Link
            to="/analytics"
            className={`sidebar-nav-item ${location.pathname.startsWith('/analytics') ? 'active' : ''}`}
            onClick={() => onClose?.()}
          >
            <span className="sidebar-nav-icon"><IconAnalytics /></span>
            <span className="sidebar-nav-label">Аналитика</span>
          </Link>
        )}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          <span className="sidebar-theme-toggle-icon" aria-hidden>
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </span>
          <span className="sidebar-theme-toggle-label">
            {theme === 'dark' ? 'Светлая' : 'Тёмная'}
          </span>
        </button>
        {!isMobile && (
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
        )}
        <button onClick={handleLogout} className="sidebar-logout">
          <span className="sidebar-logout-icon"><IconLogout /></span>
          <span className="sidebar-logout-label">Выйти</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
