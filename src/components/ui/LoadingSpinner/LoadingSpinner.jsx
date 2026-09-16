import React from 'react';
import './LoadingSpinner.css';

export default function LoadingSpinner({ text = 'Cargando...', size = 'medium' }) {
  return (
    <div className="loading-container">
      <div className={`spinner spinner-${size}`}></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}
