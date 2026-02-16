import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './CRMLayout.css';

const CRMLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const menuItems = [
    { path: '/crm', label: 'Филиалы в CRM', icon: '🏢' },
    { path: '/crm/chats', label: 'Чаты', icon: '💬' },
    { path: '/crm/notifications', label: 'Уведомления', icon: '🔔' },
    { path: '/crm/settings', label: 'Настройки бота', icon: '⚙️' },
  ];

  return (
    <div className="layout crm-layout">
      <div className={`layout-overlay ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} />
      <aside className={`crm-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="crm-sidebar-header">
          <h1 className="crm-sidebar-logo">CRM</h1>
          <p className="crm-sidebar-desc">Telegram-чаты филиалов</p>
        </div>
        <nav className="crm-sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`crm-sidebar-item ${location.pathname === item.path || (item.path === '/crm/chats' && location.pathname.startsWith('/crm/chats/')) ? 'active' : ''}`}
              onClick={() => setMobileNavOpen(false)}
            >
              <span className="crm-sidebar-icon">{item.icon}</span>
              <span className="crm-sidebar-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="crm-sidebar-footer">
          <button
            type="button"
            className="crm-sidebar-back"
            onClick={() => { setMobileNavOpen(false); navigate('/dashboard'); }}
          >
            ← Вернуться в систему управления уроками
          </button>
        </div>
      </aside>
      <main className="layout-main">
        <div className="layout-mobile-header">
          <button
            type="button"
            className="layout-burger"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Открыть меню"
          >
            ☰
          </button>
          <div className="layout-mobile-title">CRM</div>
        </div>
        <div className="layout-content">{children}</div>
      </main>
    </div>
  );
};

export default CRMLayout;
