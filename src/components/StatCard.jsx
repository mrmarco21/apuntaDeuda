import React from 'react';
import './StatCard.css';

export default function StatCard({ icon, label, value, detail, variant = 'default' }) {
  return (
    <div className={`stat-card stat-card-${variant}`}>
      {icon && <div className="stat-card-icon">{icon}</div>}
      <div className="stat-card-content">
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
        {detail && <p className="stat-card-detail">{detail}</p>}
      </div>
    </div>
  );
}
