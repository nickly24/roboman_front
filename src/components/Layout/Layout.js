import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Brand from '../Brand/Brand';
import { IconMenu, IconSun, IconMoon } from '../Icons/SidebarIcons';
import useMediaQuery from '../../hooks/useMediaQuery';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';
const SECTIONS = { dashboard: 'Обзор', lessons: 'Занятия', schedule: 'Календарь', calendar: 'Календарь', slots: 'Слоты', curriculum: 'Учебные планы', instructions: 'Инструкции', branches: 'Филиалы', branch: 'Кабинет сада', 'branch-accounts': 'Доступ садов', departments: 'Отделы', teachers: 'Преподаватели', 'teacher-accounts': 'Учётные записи', salary: 'Зарплата', accounting: 'Бухгалтерия', analytics: 'Аналитика', settings: 'Настройки' };
export default function Layout({ children, dashboard = false, headerTitle, className = '' }) {
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const page = document.scrollingElement || document.documentElement;
    page.scrollTop = 0;
    page.scrollLeft = 0;
  }, [pathname]);
  useEffect(() => { setMobileNavOpen(false); }, [pathname, isMobile]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const previous = document.body.style.overflow;
    const menuButton = menuRef.current;
    document.body.style.overflow = 'hidden';
    const aside = document.getElementById('app-navigation');
    const focusable = () => Array.from(aside.querySelectorAll('a, button')).filter(el => el.getClientRects().length);
    focusable()[0]?.focus();
    const onKey = e => {
      if (e.key === 'Escape') setMobileNavOpen(false);
      if (e.key === 'Tab') {
        const items = focusable(), first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey); menuButton?.focus(); };
  }, [mobileNavOpen]);
  return <div className={`layout ${dashboard ? 'layout-owner-dashboard' : className}`}>
    <a className="skip-link" href="#main-content">Перейти к содержимому</a>
    <div className={`layout-overlay ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
    <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} isMobile={isMobile} />
    <main className={`layout-main ${!isMobile ? 'sidebar-collapsed' : ''}`} inert={mobileNavOpen ? true : undefined}>
      <header className="app-topbar">
        <button ref={menuRef} type="button" className="icon-button layout-burger" onClick={() => setMobileNavOpen(true)} aria-label="Открыть меню" aria-expanded={mobileNavOpen} aria-controls="app-navigation"><IconMenu /></button>
        <div className="topbar-mobile-brand"><Brand /></div>
        {dashboard || headerTitle ? <h1 className="od-desktop-title">{headerTitle || 'Обзор клуба'}</h1> : <div className="topbar-breadcrumb"><span>Рабочее пространство</span><span aria-hidden="true">/</span><strong>{SECTIONS[pathname.split('/')[1]] || 'АЙТИ КЛУБ'}</strong></div>}
        <div className="topbar-actions">
          <span className="topbar-date">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
          <button type="button" className="icon-button theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>{theme === 'dark' ? <IconSun /> : <IconMoon />}</button>
        </div>
      </header>
      <div id="main-content" className="layout-content" tabIndex={-1}>{children}</div>
    </main>
  </div>;
}
