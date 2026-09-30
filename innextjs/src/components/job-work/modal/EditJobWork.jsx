import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { toast } from 'sonner';
import { updateJobWorkApi, getJobWorkByIdApi } from '@/lib/fetcher';

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

export default function EditJobWorkModal({ isOpen, onClose, onEdit, jobWork }) {
  const [quantity, setQuantity] = useState('');
  const [status, setStatus] = useState('CREATED');
  const [productName, setProductName] = useState('');
  const [jobWorkNumber, setJobWorkNumber] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const statuses = [
    { value: 'CREATED', label: 'Created' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'PAUSED', label: 'Paused' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  useEffect(() => {
    let timer;
    if (isOpen) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      if (jobWork) {
        setIsLoading(true);
        getJobWorkByIdApi(jobWork.id).then(res => {
          if (res.data?.success) {
            const data = res.data.data;
            setProductName(data.product?.name || '');
            setJobWorkNumber(data.jobWorkNumber || '');
            setQuantity(data.quantity || '');
            setStatus(data.status || 'CREATED');
          }
        }).catch(err => console.error("Failed to fetch job work by ID", err))
        .finally(() => setIsLoading(false));
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
  }, [isOpen, shouldRender, jobWork]);

  const reset = () => {
    setQuantity('');
    setStatus('CREATED');
    setProductName('');
    setJobWorkNumber('');
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
    setIsSubmitting(true);
    
    try {
      const response = await updateJobWorkApi(jobWork.id, {
        quantity: parseFloat(quantity),
        status: status
      });

      if (response.data?.success) {
        toast.success('Job Work updated successfully');
        onEdit();
        handleClose();
      } else {
        toast.error(response.data?.message || 'Failed to update job work');
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
        className={`app-modal-panel bg-white shadow-2xl rounded-xl sm:rounded-2xl border border-grey-border ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-lg w-full`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-grey-border px-4 py-3">
          <h2 id={titleId} className="text-[17px] font-semibold text-grey-text-strong">
            {isLoading ? 'Edit Job Work' : `Edit Job Work ${jobWorkNumber?.substring(0,8).toUpperCase()}`}
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
          {isLoading ? (
            <div className="flex flex-col gap-5 animate-pulse">
              <div className="flex flex-col gap-2">
                <div className="h-4 w-1/4 bg-gray-200 rounded" />
                <div className="h-[42px] w-full bg-gray-200 rounded-lg" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-4 w-1/4 bg-gray-200 rounded" />
                <div className="h-[42px] w-full bg-gray-200 rounded-lg" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-4 w-1/4 bg-gray-200 rounded" />
                <div className="h-[42px] w-full bg-gray-200 rounded-lg" />
              </div>
            </div>
          ) : (
            <form id="jobwork-edit-form" className="flex flex-col gap-4" onSubmit={submit}>
              <div>
                <label className="block text-sm font-semibold text-grey-text-strong mb-1">Target Product</label>
                <Input value={productName} disabled className="bg-grey-bg" />
              </div>
              
              <Input
                type="number"
                id="edit-quantity"
                label="Quantity"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />

              <div>
                <label className="block text-sm font-semibold text-grey-text-strong mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-[42px] px-3 border border-grey-border rounded-lg bg-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                >
                  {statuses.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </form>
          )}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" disabled={isSubmitting || isLoading} />
          <Button variant="primary" type="submit" form="jobwork-edit-form" className="flex-1" text="Save Changes" disabled={isSubmitting || isLoading} />
        </div>
      </div>
    </div>,
    root
  );
}
