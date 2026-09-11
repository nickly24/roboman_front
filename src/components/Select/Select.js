import React, { useId } from 'react';
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
  const generatedId = useId();
  const id = props.id || generatedId;
  const errorId = `${id}-error`;
  return (
    <div className={`select-group ${className}`}>
      {label && (
        <label className="select-label" htmlFor={id}>
          {label}
          {required && <span className="select-required">*</span>}
        </label>
      )}
      <select id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} required={required} className={`select ${error ? 'select-error' : ''}`} {...props}>
        <option value="">{placeholder}</option>
        {options.filter(option => String(option.value) !== '').map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span id={errorId} role="alert" className="select-error-message">{error}</span>}
    </div>
  );
};

export default Select;
