import React from 'react';
import './KPICard.css';

const KPICard = ({ title, value, subtitle, trend, icon, color = '#0369a1' }) => {
  return (
    <div className="kpi-card" style={{ '--accent-color': color }}>
      <div className="kpi-card-content">
        <div className="kpi-card-header">
          <span className="kpi-card-title">{title}</span>
          {icon && <span className="kpi-card-icon">{icon}</span>}
        </div>
        <div className="kpi-card-value">{value}</div>
        {subtitle && <div className="kpi-card-subtitle">{subtitle}</div>}
        {trend && (
          <div className={`kpi-card-trend ${trend.type}`}>
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
