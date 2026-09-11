import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';
const activeModals = [];
let originalOverflow = '';
export default function Modal({ isOpen, onClose, title, children, size = 'medium' }) {
  const id = useId();
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    if (!activeModals.length) { originalOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    activeModals.push(id);
    ref.current?.focus();
    const onKey = e => {
      if (activeModals[activeModals.length - 1] !== id) return;
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current?.(); }
      if (e.key === 'Tab') {
        const fields = Array.from(ref.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')).filter(el => el.getClientRects().length);
        const first = fields[0], last = fields[fields.length - 1];
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      const index = activeModals.indexOf(id); if (index !== -1) activeModals.splice(index, 1);
      if (!activeModals.length) document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, id]);
  if (!isOpen) return null;
  return createPortal(<div className="modal-overlay" onClick={onClose}>
    <section ref={ref} className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={title ? id : undefined} aria-label={title ? undefined : 'Диалог'} tabIndex={-1} onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        {title && <h2 id={id} className="modal-title">{title}</h2>}
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть окно">×</button>
      </div>
      <div className="modal-body">{children}</div>
    </section>
  </div>, document.body);
}
