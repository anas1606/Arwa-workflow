import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { toast } from 'sonner';
import { createUnitApi } from '@/lib/fetcher';

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

export default function AddUnit({ open, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setShortName('');
    setQuantityUnit('');
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

  const submit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !shortName.trim() || !quantityUnit.trim()) {
      setError('All fields are required.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: trimmedName,
        shortName: shortName.trim(),
        quantityUnit: parseInt(quantityUnit, 10),
      };
      const res = await createUnitApi(payload);
      if (res.data?.success) {
        toast.success('Unit created successfully');
        reset();
        onAdd();
      } else {
        setError(res.data?.message || 'Failed to create unit');
        toast.error(res.data?.message || 'Failed to create unit');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'An unexpected error occurred.');
      toast.error(err?.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
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
        className={`app-modal-panel bg-white shadow-2xl rounded-md border border-grey-border ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-lg w-full`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-grey-border px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-grey-text-strong">
            Add new unit
          </h2>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-md p-0 flex items-center justify-center transition-colors hover:bg-grey-bg text-grey-muted hover:text-grey-text-strong"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <form id="unit-add-form" className="flex flex-col gap-4" onSubmit={submit}>
            <Input
              type="text"
              id="unit-name"
              label={<span>Unit name <span className="text-danger-main">*</span></span>}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dozen"
              autoFocus
            />
            <Input
              type="text"
              id="unit-shortname"
              label={<span>Short name <span className="text-danger-main">*</span></span>}
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. DOZ"
            />
            <Input
              type="number"
              id="unit-quantity"
              label={<span>Quantity unit <span className="text-danger-main">*</span></span>}
              value={quantityUnit}
              onChange={(e) => setQuantityUnit(e.target.value)}
              placeholder="e.g. 12"
              min="1"
            />
            {error ? (
              <p className="text-sm font-medium text-danger-dark" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" />
          <Button variant="primary" type="submit" form="unit-add-form" className="flex-1" text={isSubmitting ? "Adding..." : "Add unit"} disabled={isSubmitting} />
        </div>
      </div>
    </div>,
    root
  );
}
