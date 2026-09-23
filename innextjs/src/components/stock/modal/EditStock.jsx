import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { updateBoxApi } from '@/lib/fetcher';
import { toast } from 'sonner';

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

export default function EditStock({ isOpen, onClose, box, onSuccess }) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    let timer;
    if (isOpen) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      if (box) {
        setName(box.name || '');
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
  }, [isOpen, shouldRender, box]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Box name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await updateBoxApi(box.id, { name });
      if (res.data?.success) {
        toast.success(res.data.message || 'Godown Box updated successfully');
        if (onSuccess) onSuccess(res.data.data);
        handleClose();
      } else {
        toast.error(res.data?.message || 'Failed to update Godown Box');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldRender) return null;
  const modalRoot = getModalRoot();
  if (!modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${
          isAnimatingOut ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] transition-all duration-200 ${
          isAnimatingOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-grey-border/60 shrink-0">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-grey-primary">Edit Godown Box</h2>
            <p className="text-sm text-grey-secondary mt-1">Update box details</p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-grey-secondary hover:text-brand-primary hover:bg-brand-light rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <form id="edit-godown-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-grey-primary mb-1.5">
                Box Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Reck 1"
                disabled={isSubmitting}
                className="w-full"
                required
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-grey-border/60 shrink-0 bg-grey-bg rounded-b-2xl">
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              text="Cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            />
            <Button
              variant="primary"
              text={isSubmitting ? 'Saving...' : 'Save Changes'}
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim()}
            />
          </div>
        </div>
      </div>
    </div>,
    modalRoot
  );
}
