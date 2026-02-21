import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { IconMenu } from '../Icons/SidebarIcons';
import useMediaQuery from '../../hooks/useMediaQuery';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';

const BG_DARK = `${process.env.PUBLIC_URL || ''}/bg/dark-bg.jpg`;
const BG_LIGHT = `${process.env.PUBLIC_URL || ''}/bg/light-bg.jpg`;

const STORAGE_KEY = 'main-sidebar-expanded';

const Layout = ({ children }) => {
  const { theme } = useTheme();
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
      <main
          className={`layout-main ${!sidebarExpanded ? 'sidebar-collapsed' : ''} layout-main-with-bg`}
          style={{
            backgroundImage: `url(${theme === 'dark' ? BG_DARK : BG_LIGHT})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
        <div className="layout-mobile-header">
          <button
            type="button"
            className="layout-burger"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            <IconMenu />
          </button>
        </div>
        <div className="layout-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
