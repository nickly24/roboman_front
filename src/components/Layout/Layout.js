import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { IconMenu } from '../Icons/SidebarIcons';
import './Layout.css';

const STORAGE_KEY = 'main-sidebar-expanded';

const Layout = ({ children }) => {
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

  return (
    <div className="layout">
      <div className={`layout-overlay ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} />
      <Sidebar
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        expanded={sidebarExpanded}
        onToggleCollapse={handleToggleSidebar}
      />
      <main className={`layout-main ${!sidebarExpanded ? 'sidebar-collapsed' : ''}`}>
        <div className="layout-mobile-header">
          <button
            type="button"
            className="layout-burger"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Открыть меню"
          >
            <IconMenu />
          </button>
          <div className="layout-mobile-title">RoboMan</div>
        </div>
        <div className="layout-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
