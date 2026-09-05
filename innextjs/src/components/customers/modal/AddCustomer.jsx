import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';

function getModalRoot() {
  if (typeof document === 'undefined') return null;
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
  return root;
}

export default function AddCustomer({ open, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState(null);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    let timer;
    if (open) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, shouldRender]);

  const reset = () => {
    setName('');
    setCode('');
    setRegion('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!shouldRender) return;
    
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [shouldRender]);

  const submit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedRegion = region.trim();
    if (!trimmedName) {
      setError('Customer name is required.');
      return;
    }
    if (!trimmedCode) {
      setError('Customer code is required.');
      return;
    }
    if (!trimmedRegion) {
      setError('Region is required.');
      return;
    }
    onAdd({
      id: `c${Date.now()}`,
      name: trimmedName,
      code: trimmedCode,
      region: trimmedRegion,
      brands: [],
    });
    reset();
  };

  if (!shouldRender) return null;
  const root = getModalRoot();
  if (!root) return null;

  return createPortal(
    <div className="app-modal-layer" role="presentation">
      <button
        type="button"
        className={`app-modal-backdrop ${isAnimatingOut ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}`}
        aria-label="Close dialog"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-modal-panel bg-white shadow-2xl rounded-md border border-ink-200 ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-lg w-full`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ink-200 px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-ink-900">
            Add customer
          </h2>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-md p-0 flex items-center justify-center transition-colors hover:bg-ink-50 text-ink-500 hover:text-ink-900"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <form id="customers-add-form" className="flex flex-col gap-4" onSubmit={submit}>
            <Input
              type="text"
              id="customers-name"
              label="Customer name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Manufacturing"
              autoFocus
            />
            <Input
              type="text"
              id="customers-code"
              label="Code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. APEX"
              maxLength={8}
              className="font-mono uppercase"
            />
            <Input
              type="text"
              id="customers-region"
              label="Region"
              required
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Midwest"
            />
            {error ? (
              <p className="text-sm font-medium text-danger-700" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-ink-200 px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" />
          <Button variant="primary" type="submit" form="customers-add-form" className="flex-1" text="Add customer" />
        </div>
      </div>
    </div>,
    root
  );
}
