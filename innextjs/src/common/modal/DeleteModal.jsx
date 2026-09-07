import React, { useState, useEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
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

export default function DeleteModal({ open, onClose, onConfirm, item, itemNameKey = 'name', title = 'Delete item', itemType = 'item', verificationWord = 'DELETE' }) {
  const [verificationInput, setVerificationInput] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    let timer;
    if (open && item) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      setVerificationInput('');
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, shouldRender, item]);

  const reset = () => {
    setVerificationInput('');
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
    if (verificationInput !== verificationWord) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(item);
      reset();
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldRender || !item) return null;
  const root = getModalRoot();
  if (!root) return null;

  const isMatched = verificationInput === verificationWord;

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
        className={`app-modal-panel bg-white shadow-2xl rounded-xl border border-ink-200 ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-md w-full`}
      >
        <div className="flex shrink-0 items-center justify-between px-6 py-5">
          <h2 id={titleId} className="text-lg font-bold text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            className="btn-ghost h-8 w-8 min-h-0 rounded-md p-0 flex items-center justify-center transition-colors hover:bg-ink-100 text-ink-500 hover:text-ink-900"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
          <form id="generic-delete-form" className="flex flex-col gap-4" onSubmit={submit}>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink-700">
                Are you sure you want to delete the <strong>{item[itemNameKey]}</strong> {itemType}?
              </p>
              <p className="text-sm font-semibold text-danger-600">
                This can not be undone.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink-700">
                Type <strong>{verificationWord}</strong> to confirm.
              </p>
              <Input
                type="text"
                id="generic-delete-verify"
                required
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value)}
                autoFocus
              />
            </div>

            {error ? (
              <p className="text-sm font-medium text-danger-700" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-ink-200 px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" />
          <Button 
            variant="danger" 
            type="submit" 
            form="generic-delete-form" 
            className="flex-1" 
            text={isSubmitting ? "Deleting..." : title} 
            disabled={!isMatched || isSubmitting} 
          />
        </div>
      </div>
    </div>,
    root
  );
}
