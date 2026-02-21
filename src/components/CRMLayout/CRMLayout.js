import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  IconBuilding,
  IconChat,
  IconClipboardList,
  IconNotifications,
  IconSettings,
  IconAI,
  IconArrowBack,
  IconSun,
  IconMoon,
  IconMenu,
  IconChevronLeft,
  IconChevronRight,
} from '../Icons/SidebarIcons';
import './CRMLayout.css';

const CRM_SIDEBAR_STORAGE = 'crm-sidebar-expanded';

const CRMLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CRM_SIDEBAR_STORAGE);
      if (saved === 'false') setSidebarExpanded(false);
      if (saved === 'true') setSidebarExpanded(true);
    } catch (_) {}
  }, []);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileNavOpen(false);
      return;
    }
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CRM_SIDEBAR_STORAGE, String(next));
      } catch (_) {}
      return next;
    });
  };

  const menuItems = [
    { path: '/crm', label: 'Филиалы в CRM', Icon: IconBuilding },
    { path: '/crm/requests', label: 'Заявки', Icon: IconClipboardList },
    { path: '/crm/chats', label: 'Чаты', Icon: IconChat },
    { path: '/crm/nchats', label: 'ИИ-ассистент', Icon: IconAI },
    { path: '/crm/notifications', label: 'Уведомления', Icon: IconNotifications },
    { path: '/crm/settings', label: 'Настройки бота', Icon: IconSettings },
  ];

  return (
    <div className={`layout crm-layout ${!sidebarExpanded ? 'sidebar-collapsed' : ''}`}>
      <div className={`layout-overlay ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} />
      <aside className={`crm-sidebar ${mobileNavOpen ? 'open' : ''} ${!sidebarExpanded ? 'collapsed' : ''}`}>
        <div className="crm-sidebar-header">
          <h1 className="crm-sidebar-logo">CRM</h1>
          <p className="crm-sidebar-desc">Telegram-чаты филиалов</p>
        </div>
        <nav className="crm-sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`crm-sidebar-item ${location.pathname === item.path || (item.path === '/crm/chats' && location.pathname.startsWith('/crm/chats/')) || (item.path === '/crm/requests' && location.pathname.startsWith('/crm/requests')) || (item.path === '/crm/nchats' && location.pathname.startsWith('/crm/nchats')) ? 'active' : ''}`}
              onClick={() => setMobileNavOpen(false)}
            >
              <span className="crm-sidebar-icon">{item.Icon ? <item.Icon /> : null}</span>
              <span className="crm-sidebar-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="crm-sidebar-footer">
          <button
            type="button"
            className="crm-sidebar-toggle"
            onClick={handleToggleSidebar}
            title={sidebarExpanded ? 'Свернуть' : 'Развернуть'}
            aria-label={sidebarExpanded ? 'Свернуть сайдбар' : 'Развернуть сайдбар'}
          >
            <span className="crm-sidebar-toggle-icon">
              {sidebarExpanded ? <IconChevronLeft /> : <IconChevronRight />}
            </span>
            <span className="crm-sidebar-toggle-label">
              {sidebarExpanded ? 'Свернуть' : 'Развернуть'}
            </span>
          </button>
          <button
            type="button"
            className="crm-theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            <span className="crm-theme-toggle-icon" aria-hidden>
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </span>
            <span className="crm-theme-toggle-label">
              {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            </span>
          </button>
          <button
            type="button"
            className="crm-sidebar-back"
            onClick={() => { setMobileNavOpen(false); navigate('/dashboard'); }}
          >
            <span className="crm-sidebar-back-icon"><IconArrowBack /></span>
            <span className="crm-sidebar-back-label">Вернуться в систему управления</span>
          </button>
        </div>
      </aside>
      <main className={`layout-main ${location.pathname.match(/^\/crm\/chats(\/|$)/) ? 'layout-main-chat' : ''}`}>
        <div className="layout-mobile-header">
          <button
            type="button"
            className="layout-burger"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Открыть меню"
          >
            <IconMenu />
          </button>
          <div className="layout-mobile-title">CRM</div>
        </div>
        <div className={`layout-content ${location.pathname.match(/^\/crm\/chats(\/|$)/) ? 'layout-content-chat-view' : ''} ${location.pathname.startsWith('/crm/nchats') ? 'layout-content-nchats' : ''}`}>{children}</div>
      </main>
    </div>
  );
};

export default CRMLayout;
