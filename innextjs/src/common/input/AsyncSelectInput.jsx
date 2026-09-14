import React, { useId, useCallback, useRef } from 'react';
import AsyncSelect from 'react-select/async';
import clsx from 'clsx';

export default function AsyncSelectInput({
  id: providedId,
  label,
  required,
  error,
  className = '',
  loadOptions,
  defaultOptions = true,
  placeholder = 'Select...',
  value,
  onChange,
  ...props
}) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const debounceTimeout = useRef(null);

  const debouncedLoadOptions = useCallback((inputValue, callback) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      const result = loadOptions(inputValue);
      if (result && typeof result.then === 'function') {
        result.then(callback);
      } else {
        callback(result);
      }
    }, 500); // 500ms debounce
  }, [loadOptions]);

  // Custom styling to match Input.jsx
  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '44px',
      borderRadius: '0.375rem',
      backgroundColor: state.isFocused ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
      backdropFilter: 'blur(12px)',
      border: state.isFocused ? '1px solid var(--color-primary-muted)' : '1px solid #e5e7eb',
      borderColor: state.isFocused ? 'var(--color-primary-muted)' : '#e5e7eb',
      boxShadow: state.isFocused ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'inset 0 2px 4px rgba(15,23,42,0.04)',
      '&:hover': {
        borderColor: state.isFocused ? 'var(--color-primary-muted)' : '#cbd5e1',
      },
      transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 12px',
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      color: '#1e293b', // grey-text-strong
      fontSize: '0.875rem', // text-sm
    }),
    placeholder: (base) => ({
      ...base,
      color: '#94a3b8', // grey-icon
      fontSize: '0.875rem',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#1e293b',
      fontSize: '0.875rem',
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.375rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.875rem',
      backgroundColor: state.isSelected ? 'rgba(var(--color-primary), 0.1)' : state.isFocused ? '#f4f7fb' : 'white',
      color: state.isSelected ? 'var(--color-primary-dark)' : '#475569',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: '#e2e8f0',
      },
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-semibold text-grey-text-strong">
          {label} {required && <span className="text-danger-muted">*</span>}
        </label>
      )}
      <AsyncSelect
        inputId={id}
        cacheOptions
        defaultOptions={defaultOptions}
        loadOptions={debouncedLoadOptions}
        styles={customStyles}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        {...props}
      />
      {error && <span className="mt-1 block text-xs font-semibold text-danger-main">{error}</span>}
    </div>
  );
}
