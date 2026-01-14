import React, { useEffect, useRef, useState } from 'react';
import Button from '../Button/Button';
import './ActionMenu.css';

/**
 * Компактное меню действий (popover) для таблиц.
 * Использование:
 * <ActionMenu
 *   items={[{label:'Редактировать', onClick}, {type:'divider'}, {label:'Удалить', danger:true, onClick}]}
 * />
 */
const ActionMenu = ({ items = [], align = 'right', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
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

      {open && (
        <div className={`action-menu-popover action-menu-popover-${align}`}>
          {items.map((item, idx) => {
            if (item?.type === 'divider') return <div key={`d-${idx}`} className="action-menu-divider" />;
            return (
              <button
                key={item.key || idx}
                type="button"
                className={`action-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
              >
                {item.icon && <span className="action-menu-icon">{item.icon}</span>}
                <span className="action-menu-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;

