import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { IconMenu } from '../Icons/SidebarIcons';
import useMediaQuery from '../../hooks/useMediaQuery';
import './Layout.css';

const STORAGE_KEY = 'main-sidebar-expanded';

const Layout = ({ children }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'false') setSidebarExpanded(false);
      if (saved === 'true') setSidebarExpanded(true);
    } catch (_) {}
  }, []);

  const handleToggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch (_) {}
      return next;
    });
  };

  // На мобиле: кнопка «Свернуть» полностью закрывает сайдбар. На десктопе: сворачивает до иконок.
  const handleCollapseClick = () => {
    if (isMobile) setMobileNavOpen(false);
    else handleToggleSidebar();
  };

  return (
    <div className="layout">
      <div className={`layout-overlay ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} />
      <Sidebar
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        expanded={sidebarExpanded}
        onToggleCollapse={handleCollapseClick}
        isMobile={isMobile}
      />
      <main className={`layout-main ${!sidebarExpanded ? 'sidebar-collapsed' : ''}`}>
        <div className="layout-mobile-header">
          <button
            type="button"
            className="layout-burger"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            <IconMenu />
          </button>
          <div className="layout-mobile-logo" aria-hidden>
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="6" width="24" height="26" rx="4" stroke="currentColor" strokeWidth="2"/>
              <circle cx="15" cy="14" r="2" fill="currentColor"/>
              <circle cx="25" cy="14" r="2" fill="currentColor"/>
              <path d="M12 22h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M14 28h2v2h-2zM24 28h2v2h-2z" fill="currentColor"/>
              <path d="M18 6v2M22 6v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="layout-mobile-logo-text">RoboMan</span>
          </div>
        </div>
        <div className="layout-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
