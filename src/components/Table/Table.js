import React from 'react';
import LoadingSpinner from '../Loading/LoadingSpinner';
import useMediaQuery from '../../hooks/useMediaQuery';
import './Table.css';

const Table = ({ 
  columns, 
  data, 
  loading = false, 
  emptyMessage = 'Нет данных',
  onRowClick,
  className = '',
  mobileMode = 'cards', // cards | table
  mobileTitleKey,
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (loading) {
    return (
      <div className="table-container">
        <LoadingSpinner size="medium" text="Загрузка данных..." />
      </div>
    );
  }

  // Проверяем, что data - это массив
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="table-container">
        <div className="table-empty">{emptyMessage}</div>
      </div>
    );
  }

  // Мобильный режим: карточки вместо таблицы
  if (isMobile && mobileMode === 'cards') {
    const nonActionColumns = columns.filter((c) => c.key !== 'actions');
    const actionCol = columns.find((c) => c.key === 'actions');

    return (
      <div className={`table-cards ${className}`}>
        {data.map((row, index) => {
          const titleKey = mobileTitleKey || nonActionColumns[0]?.key;
          const titleValue = titleKey ? (row?.[titleKey] ?? '') : '';

          return (
            <div
              key={row.id || index}
              className={`table-card ${onRowClick ? 'table-card-clickable' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              <div className="table-card-header">
                <div className="table-card-title">{String(titleValue || '')}</div>
                {row.id !== undefined && row.id !== null && (
                  <div className="table-card-id">#{row.id}</div>
                )}
              </div>

              <div className="table-card-body">
                {nonActionColumns.map((col) => {
                  const value = col.render ? col.render(row[col.key], row) : row[col.key];
                  // не дублируем заголовок
                  if (col.key === titleKey) return null;
                  return (
                    <div key={col.key} className="table-card-row">
                      <div className="table-card-label">{col.title}</div>
                      <div className="table-card-value">{value ?? '—'}</div>
                    </div>
                  );
                })}
              </div>

              {actionCol && (
                <div className="table-card-actions" onClick={(e) => e.stopPropagation()}>
                  {actionCol.render ? actionCol.render(row[actionCol.key], row) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`table-container ${className}`}>
      <table className="table">
        <thead className="table-header">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="table-header-cell"
                style={{ width: col.width, textAlign: col.align || 'left' }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body">
          {data.map((row, index) => (
            <tr
              key={row.id || index}
              className={`table-row ${onRowClick ? 'table-row-clickable' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="table-cell"
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
