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
  isClearable = true,
  ...props
}) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const debounceTimeout = useRef(null);

  const debouncedLoadOptions = useCallback(
    (inputValue) =>
      new Promise((resolve) => {
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(async () => {
          try {
            const result = await loadOptions(inputValue);
            resolve(result);
          } catch (e) {
            resolve([]);
          }
        }, 500);
      }),
    [loadOptions]
  );

  const handleInputChange = (inputValue, actionMeta) => {
    // When the input is cleared, react-select (if defaultOptions=true) skips calling loadOptions.
    // This leaves the timeout for the last character running, which causes an unwanted API call.
    if (!inputValue && debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    if (props.onInputChange) {
      props.onInputChange(inputValue, actionMeta);
    }
  };

  // Custom styling to match Input.jsx
  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '44px',
      borderRadius: '0.67rem',
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
      borderRadius: '0px', // Sharp corners as seen in the image
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid var(--color-primary-muted)', // Blue border to match the focused input
      marginTop: '-1px', // Pull it up slightly so the borders merge nicely
      overflow: 'hidden',
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.875rem',
      padding: '8px 12px',
      backgroundColor: state.isSelected ? 'var(--color-primary)' : state.isFocused ? '#f1f5f9' : 'white',
      color: state.isSelected ? 'white' : '#1e293b',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: state.isSelected ? 'var(--color-primary)' : '#e2e8f0',
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
        onInputChange={handleInputChange}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        isClearable={isClearable}
        {...props}
      />
      {error && <span className="mt-1 block text-xs font-semibold text-danger-main">{error}</span>}
    </div>
  );
}
