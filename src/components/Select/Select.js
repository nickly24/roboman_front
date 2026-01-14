import React from 'react';
import './Select.css';

const Select = ({
  label,
  error,
  required,
  options = [],
  placeholder = 'Выберите...',
  className = '',
  ...props
}) => {
  return (
    <div className={`select-group ${className}`}>
      {label && (
        <label className="select-label">
          {label}
          {required && <span className="select-required">*</span>}
        </label>
      )}
      <select className={`select ${error ? 'select-error' : ''}`} {...props}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="select-error-message">{error}</span>}
    </div>
  );
};

export default Select;
