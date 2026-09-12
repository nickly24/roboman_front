import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Brand from '../Brand/Brand';
import { IconDashboard, IconLessons, IconSchedule, IconSlots, IconBranches, IconDepartments,
  IconSalary, IconTeachers, IconTeacherAccounts, IconAnalytics, IconInstructions, IconSettings,
  IconAccounting, IconLogout, IconChevronDown } from '../Icons/SidebarIcons';
import './Sidebar.css';

export default function Sidebar({ isOpen = false, onClose, isMobile = false }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { user, logout, isOwner, isTeacher, isBranch } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const expanded = isMobile || hovered || focused;
  const [referencesOpen, setReferencesOpen] = useState(false);
  const links = isBranch ? [
    ['/branch/overview', 'Обзор', IconDashboard],
    ['/branch/lessons', 'Занятия', IconLessons],
    ['/branch/invoices', 'Счета', IconAccounting],
    ['/branch/analytics', 'Аналитика', IconAnalytics],
  ] : [
    ['/dashboard', 'Дашборд', IconDashboard],
    ['/lessons', isTeacher ? 'Мои занятия' : 'Занятия', IconLessons],
    ['/calendar', 'Календарь', IconSchedule],
    ['/slots', 'Слоты', IconSlots],
    ['/curriculum', 'Учебные планы', IconLessons],
    ['/instructions', 'Инструкции', IconInstructions],
  ];
  const references = [
    ['/branches', 'Филиалы', IconBranches], ['/departments', 'Отделы', IconDepartments],
    ['/teachers', 'Преподаватели', IconTeachers], ['/teacher-accounts', 'Учётные записи', IconTeacherAccounts],
    ['/branch-accounts', 'Доступ садов', IconBranches],
  ];
  const name = user?.profile?.full_name || user?.profile?.name || user?.user?.login || 'Пользователь';
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const closeAfterNavigation = () => { setHovered(false); setFocused(false); setReferencesOpen(false); onClose?.(); };
  const portalMonth = new URLSearchParams(search).get('month');
  const renderLink = ([path, label, Icon]) => <Link key={path} to={isBranch && portalMonth ? `${path}?month=${encodeURIComponent(portalMonth)}` : path} title={!expanded ? label : undefined}
    className={`sidebar-nav-item ${pathname === path || (path === '/accounting' && pathname.startsWith('/accounting/')) ? 'active' : ''}`}
    aria-current={pathname === path || (path === '/accounting' && pathname.startsWith('/accounting/')) ? 'page' : undefined} onClick={closeAfterNavigation}>
    <Icon /><span className="sidebar-nav-label">{label}</span>
  </Link>;
  return <aside id="app-navigation" className={`sidebar ${isOpen ? 'open' : ''} ${!expanded ? 'collapsed' : ''}`}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); if (!focused) setReferencesOpen(false); }}
    onFocusCapture={e => { if (e.target.matches(':focus-visible')) setFocused(true); }} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setFocused(false); if (!hovered) setReferencesOpen(false); } }}
    aria-label="Боковая панель" inert={isMobile && !isOpen ? true : undefined}>
    <div className="sidebar-header">
      <Link to={isBranch ? '/branch/overview' : '/dashboard'} className="sidebar-brand" onClick={closeAfterNavigation}><Brand compact={!expanded} /></Link>
      {isMobile && <button type="button" className="icon-button sidebar-close" aria-label="Закрыть меню" onClick={onClose}>×</button>}
    </div>
    <nav className="sidebar-nav" aria-label="Основная навигация">
      <div className="sidebar-section-label">{isBranch ? 'Кабинет сада' : 'Обучение'}</div>
      {links.map(renderLink)}
      {isOwner && <>
        <div className="sidebar-section-label">Управление</div>
        <button type="button" className="sidebar-group-toggle" title={!expanded ? 'Справочники' : undefined}
          aria-expanded={referencesOpen} aria-controls="sidebar-references"
          onClick={() => setReferencesOpen(!referencesOpen)}>
          <IconDepartments /><span className="sidebar-nav-label">Справочники</span>
          <span className={`sidebar-group-chevron ${referencesOpen ? 'expanded' : ''}`}><IconChevronDown /></span>
        </button>
        <div id="sidebar-references" className={`sidebar-references ${referencesOpen || !expanded ? 'open' : ''}`}>
          {references.map(renderLink)}
        </div>
        {[
          ['/salary', 'Зарплата', IconSalary], ['/accounting', 'Бухгалтерия', IconAccounting],
          ['/analytics', 'Аналитика', IconAnalytics], ['/settings', 'Настройки', IconSettings],
        ].map(renderLink)}
      </>}
    </nav>
    <div className="sidebar-footer">
      <div className="sidebar-account" title={name}>
        <span className="user-avatar">{initials}</span>
        <div className="sidebar-user"><span className="sidebar-user-name">{name}</span><span className="sidebar-user-role">{isOwner ? 'Владелец' : isBranch ? 'Кабинет сада' : 'Преподаватель'}</span></div>
        <button type="button" className="icon-button sidebar-logout" aria-label="Выйти" title="Выйти" onClick={async () => { await logout(); navigate('/login'); }}><IconLogout /></button>
      </div>

    </div>
  </aside>;
}
