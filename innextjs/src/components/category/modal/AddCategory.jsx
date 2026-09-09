import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import { toast } from 'sonner';
import { createCategoryApi, getCategoriesApi } from '@/lib/fetcher';

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

export default function AddCategory({ isOpen, onClose, onAdd, categories, initialParentId }) {
  const [name, setName] = useState('');
  const [parentOption, setParentOption] = useState({ label: 'None', value: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    let timer;
    if (isOpen) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      if (initialParentId) {
        const initialCat = categories.find(c => c.id === initialParentId);
        setParentOption({ 
          label: initialCat ? initialCat.name : 'None', 
          value: initialParentId 
        });
      } else {
        setParentOption({ label: 'None', value: '' });
      }
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, shouldRender, initialParentId]);

  const reset = () => {
    setName('');
    setParentOption({ label: 'None', value: '' });
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

  const loadParentOptions = async (inputValue) => {
    try {
      const response = await getCategoriesApi(1, 100, inputValue, 'ALL');
      if (response?.data?.success) {
        const cats = response.data.data.data || [];
        const options = cats.map(c => ({ label: c.name, value: c.id }));
        
        if (!inputValue || 'none'.includes(inputValue.toLowerCase())) {
          return [{ label: 'None', value: '' }, ...options];
        }
        return options;
      }
      return !inputValue || 'none'.includes(inputValue.toLowerCase()) ? [{ label: 'None', value: '' }] : [];
    } catch (error) {
      return !inputValue || 'none'.includes(inputValue.toLowerCase()) ? [{ label: 'None', value: '' }] : [];
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        parentId: parentOption.value || null,
        isActive: true,
      };
      const response = await createCategoryApi(payload);

      if (response.data && response.data.success) {
        toast.success('Category added successfully');
        onAdd();
        handleClose();
      } else {
        toast.error(response.data?.message || 'Failed to add category');
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
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
            Add category
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
          <form id="category-add-form" className="flex flex-col gap-4" onSubmit={submit}>
            <Input
              type="text"
              id="category-name"
              label="Category Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics"
              autoFocus
            />

            <AsyncSelectInput
              id="category-parent"
              label="Parent Category (Optional)"
              value={parentOption}
              onChange={setParentOption}
              loadOptions={loadParentOptions}
              defaultOptions
            />
          </form>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" disabled={isSubmitting} />
          <Button variant="primary" type="submit" form="category-add-form" className="flex-1" text="Add category" disabled={isSubmitting} />
        </div>
      </div>
    </div>,
    root
  );
}
