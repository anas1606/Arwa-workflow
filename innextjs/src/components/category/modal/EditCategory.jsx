import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { toast } from 'sonner';
import { updateCategoryApi, getCategoryByIdApi } from '@/lib/fetcher';

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

export default function EditCategory({ isOpen, onClose, onEdit, category, categories }) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    let timer;
    if (isOpen) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      if (category) {
        setName(category.name || '');
        setParentId(category.parentId || '');
        setIsActive(category.isActive !== false);

        // Fetch full category details by ID
        getCategoryByIdApi(category.id).then(res => {
          if (res.data && res.data.success) {
            const fetchedCat = res.data.data;
            setName(fetchedCat.name || '');
            setParentId(fetchedCat.parentId || '');
            setIsActive(fetchedCat.isActive !== false);
          }
        }).catch(err => console.error("Failed to fetch category by ID", err));
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
  }, [isOpen, shouldRender, category]);

  const reset = () => {
    setName('');
    setParentId('');
    setIsActive(true);
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

  // Filter out the category itself and its descendants from available parents
  const getDescendants = (catId, allCats) => {
    let descendants = new Set();
    const children = allCats.filter(c => c.parentId === catId);
    children.forEach(c => {
      descendants.add(c.id);
      getDescendants(c.id, allCats).forEach(d => descendants.add(d));
    });
    return descendants;
  };

  const invalidParents = category ? getDescendants(category.id, categories) : new Set();
  if (category) invalidParents.add(category.id); // Cannot be its own parent

  const availableParents = categories.filter(c => !invalidParents.has(c.id));

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await updateCategoryApi(category.id, {
        name: name.trim(),
        parentId: parentId || null,
        isActive
      });

      if (response.data && response.data.success) {
        toast.success('Category updated successfully');
        onEdit();
        handleClose();
      } else {
        toast.error(response.data?.message || 'Failed to update category');
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
            Edit category
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
          <form id="category-edit-form" className="flex flex-col gap-4" onSubmit={submit}>
            <Input
              type="text"
              id="edit-category-name"
              label="Category Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics"
              autoFocus
            />

            <Input
              type="select"
              id="edit-category-parent"
              label="Parent Category (Optional)"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              options={[
                { label: 'None (Root Category)', value: '' },
                ...availableParents.map(c => ({ label: c.name, value: c.id }))
              ]}
            />

            <div className="flex items-center justify-between mt-2">
              <label htmlFor="edit-status-toggle" className="text-sm font-medium text-grey-text cursor-pointer">
                Status: {isActive ? <span className="text-success-main font-semibold">Active</span> : <span className="text-grey-muted">Inactive</span>}
              </label>
              <button
                type="button"
                id="edit-status-toggle"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-primary' : 'bg-grey-border'}`}
                aria-pressed={isActive}
              >
                <span className="sr-only">Toggle status</span>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </form>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" disabled={isSubmitting} />
          <Button variant="primary" type="submit" form="category-edit-form" className="flex-1" text="Save Changes" disabled={isSubmitting} />
        </div>
      </div>
    </div>,
    root
  );
}
