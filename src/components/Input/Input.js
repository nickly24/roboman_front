import React, { useId } from 'react';
import './Input.css';

const Input = ({
  label,
  error,
  required,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const id = props.id || generatedId;
  const errorId = `${id}-error`;
  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label className="input-label" htmlFor={id}>
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} required={required} className={`input ${error ? 'input-error' : ''}`} {...props} />
      {error && <span id={errorId} role="alert" className="input-error-message">{error}</span>}
    </div>
  );
};

export default Input;
