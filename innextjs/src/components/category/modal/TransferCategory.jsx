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

export default function TransferCategory({ isOpen, onClose, onTransfer, category, categories }) {
  const [targetParentId, setTargetParentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    let timer;
    if (isOpen) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      setTargetParentId('');
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, shouldRender]);

  if (!category) return null;

  // Filter out the category itself and all its descendants to prevent circular hierarchy
  const getDescendants = (parentId, allCats) => {
    let descendants = new Set();
    const children = allCats.filter(c => c.parentId === parentId);
    children.forEach(c => {
      descendants.add(c.id);
      getDescendants(c.id, allCats).forEach(d => descendants.add(d));
    });
    return descendants;
  };

  const invalidParents = getDescendants(category.id, categories);
  invalidParents.add(category.id); // Cannot be its own parent

  const availableParents = categories.filter(c => !invalidParents.has(c.id));

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onTransfer(category.id, targetParentId || null);
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
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-modal-panel bg-white shadow-2xl rounded-md border border-grey-border ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-md w-full`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-grey-border px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-grey-text-strong">
            Transfer Category
          </h2>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-md p-0 flex items-center justify-center transition-colors hover:bg-grey-bg text-grey-muted hover:text-grey-text-strong"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="text-sm text-grey-text mb-4">Move <strong className="text-grey-text-strong">{category.name}</strong> under a new parent category.</p>
          <form id="category-transfer-form" className="flex flex-col gap-4" onSubmit={submit}>
            <Input
              type="select"
              id="transfer-parent"
              label="New Parent Category"
              value={targetParentId}
              onChange={(e) => setTargetParentId(e.target.value)}
              options={[
                { label: 'None (Make Root Category)', value: '' },
                ...availableParents.map(c => ({ label: c.name, value: c.id }))
              ]}
            />
          </form>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={onClose} text="Cancel" disabled={isSubmitting} />
          <Button variant="primary" type="submit" form="category-transfer-form" className="flex-1" text="Transfer" disabled={isSubmitting} />
        </div>
      </div>
    </div>,
    root
  );
}
