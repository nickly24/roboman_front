import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Button from '../Button/Button';
import './ActionMenu.css';

/**
 * Компактное меню действий (popover) для таблиц.
 * Попап рендерится в портал, чтобы не обрезаться контейнерами с overflow (карточки расписания и т.д.).
 * Использование:
 * <ActionMenu
 *   items={[{label:'Редактировать', onClick}, {type:'divider'}, {label:'Удалить', danger:true, onClick}]}
 * />
 */
const ActionMenu = ({ items = [], align = 'right', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      if (!open) setPopoverStyle(null);
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    const padding = 6;
    setPopoverStyle({
      position: 'fixed',
      top: rect.bottom + padding,
      left: align === 'right' ? undefined : rect.left,
      right: align === 'right' ? window.innerWidth - rect.right : undefined,
      zIndex: 10000,
    });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      const inTrigger = rootRef.current.contains(e.target);
      const inPopover = e.target.closest?.('[data-action-menu-popover]');
      if (!inTrigger && !inPopover) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const handleItemClick = (item) => {
    if (item.disabled) return;
    setOpen(false);
    item.onClick?.();
  };

  const popoverContent =
    open &&
    popoverStyle &&
    ReactDOM.createPortal(
      <div
        className={`action-menu-popover action-menu-popover-${align} action-menu-popover-portal`}
        style={popoverStyle}
        role="menu"
        data-action-menu-popover
      >
        {items.map((item, idx) => {
          if (item?.type === 'divider') return <div key={`d-${idx}`} className="action-menu-divider" />;
          return (
            <button
              key={item.key || idx}
              type="button"
              className={`action-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              role="menuitem"
            >
              {item.icon && <span className="action-menu-icon">{item.icon}</span>}
              <span className="action-menu-label">{item.label}</span>
            </button>
          );
        })}
      </div>,
      document.body
    );

  return (
    <div ref={rootRef} className="action-menu">
      <Button
        size="small"
        variant="ghost"
        className="action-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="Действия"
      >
        ⋯
      </Button>
      {popoverContent}
    </div>
  );
};

export default ActionMenu;

