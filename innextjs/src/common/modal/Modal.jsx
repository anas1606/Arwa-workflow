import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

function getModalRoot() {
  if (typeof document === 'undefined') {
    return null;
  }
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
  return root;
}

const Modal = ({ open, title, children, onClose, footer, size = 'md' }) => {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  const root = getModalRoot();
  if (!root) return null;

  const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-[calc(100vw-2rem)]'
  };

  return createPortal(
    <div className="app-modal-layer" role="presentation">
      <button
        type="button"
        className="app-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-modal-panel glass-modal ${sizeClasses[size] || sizeClasses.md} w-full`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/40 px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-black">
            {title}
          </h2>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-xl p-0 flex items-center justify-center transition-colors hover:bg-white/55 text-ink-500 hover:text-ink-900"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/40 px-4 py-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    root
  );
};

export default Modal;
