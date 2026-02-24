import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../components/Button/Button';
import './InstructionCard.css';

const DESCRIPTION_MAX_LENGTH = 120;

function formatLastAt(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Карточка инструкции. Запрашивает фото только при появлении в viewport (Intersection Observer).
 * Для преподавателей (isTeacher) показываем «Не был в: …» — только по филиалам, где они закреплены (myBranches).
 */
const InstructionCard = ({
  instruction,
  sectionName,
  branchesBuiltAt = [],
  myBranches = [],
  isTeacher,
  photoUrl,
  onRequestPhoto,
  onOpen,
  onEdit,
  isOwner,
}) => {
  const cardRef = useRef(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  const branchesNotBuilt = useMemo(() => {
    if (!isTeacher || myBranches.length === 0) return [];
    const builtIds = new Set((branchesBuiltAt || []).map((b) => b.branch_id));
    return myBranches.filter((b) => !builtIds.has(b.id));
  }, [isTeacher, myBranches, branchesBuiltAt]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !instruction?.has_photo || photoUrl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setHasBeenVisible(true);
          onRequestPhoto?.(instruction.id);
        }
      },
      { rootMargin: '100px', threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [instruction?.id, instruction?.has_photo, photoUrl, onRequestPhoto]);

  const description = instruction?.description?.trim() || '';
  const truncated =
    description.length > DESCRIPTION_MAX_LENGTH
      ? description.slice(0, DESCRIPTION_MAX_LENGTH).trim() + '…'
      : description;

  return (
    <article ref={cardRef} className="instruction-card">
      <div className="instruction-card__media">
        {!instruction?.has_photo && (
          <div className="instruction-card__placeholder">Нет фото</div>
        )}
        {instruction?.has_photo && !photoUrl && (
          <div className="instruction-card__placeholder instruction-card__placeholder--loading">
            Загрузка…
          </div>
        )}
        {instruction?.has_photo && photoUrl && (
          <img
            src={photoUrl}
            alt=""
            className="instruction-card__img"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
      <div className="instruction-card__body">
        <h3 className="instruction-card__title">{instruction?.name || '—'}</h3>
        {sectionName && (
          <span className="instruction-card__section">{sectionName}</span>
        )}
        {truncated && (
          <p className="instruction-card__description">{truncated}</p>
        )}
        {branchesBuiltAt.length > 0 ? (
          <div className="instruction-card__built">
            <span className="instruction-card__built-label">Собиралась:</span>{' '}
            {branchesBuiltAt.slice(0, 3).map((b, i) => (
              <span key={b.branch_id}>
                {i > 0 && ', '}
                <span className="instruction-card__built-item">
                  {b.branch_name}
                  {b.last_at ? ` (${formatLastAt(b.last_at)})` : ''}
                </span>
              </span>
            ))}
            {branchesBuiltAt.length > 3 && (
              <span className="instruction-card__built-more">, и ещё {branchesBuiltAt.length - 3}</span>
            )}
          </div>
        ) : (
          <div className="instruction-card__built instruction-card__built--none">Ни разу не собиралась</div>
        )}
        {isTeacher && branchesNotBuilt.length > 0 && (
          <div className="instruction-card__not-built">
            <span className="instruction-card__not-built-label">Не был в:</span>{' '}
            {branchesNotBuilt.slice(0, 5).map((b, i) => (
              <span key={b.id}>
                {i > 0 && ', '}
                <span className="instruction-card__not-built-item">{b.name || `#${b.id}`}</span>
              </span>
            ))}
            {branchesNotBuilt.length > 5 && (
              <span className="instruction-card__not-built-more"> и ещё {branchesNotBuilt.length - 5}</span>
            )}
          </div>
        )}
        <div className="instruction-card__actions">
          <Button size="small" variant="primary" onClick={() => onOpen?.(instruction)}>
            Открыть
          </Button>
          {isOwner && (
            <Button size="small" variant="secondary" onClick={() => onEdit?.(instruction)}>
              Редактировать
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export default InstructionCard;
