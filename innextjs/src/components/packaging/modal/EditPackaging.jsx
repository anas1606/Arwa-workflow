import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import { toast } from 'sonner';
import { updatePackagingApi, getCustomersApi, getPackagingByIdApi } from '@/lib/fetcher';

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

export default function EditPackaging({ open, onClose, onEdit, packaging }) {
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    let timer;
    if (open) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      if (packaging) {
        const fetchPackaging = async () => {
          setIsLoading(true);
          try {
            const res = await getPackagingByIdApi(packaging.id);
            if (res.data && res.data.success) {
              const data = res.data.data;
              setName(data.name || '');
              if (data.customer) {
                setCustomer({ label: data.customer.name, value: data.customer.id });
              } else if (data.customerId) {
                setCustomer({ label: 'Unknown Customer', value: data.customerId });
              } else {
                setCustomer(null);
              }
            } else {
              toast.error(res.data?.message || 'Failed to fetch packaging details');
            }
          } catch (e) {
            console.error(e);
            toast.error('Failed to load packaging details');
          } finally {
            setIsLoading(false);
          }
        };
        fetchPackaging();
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
  }, [open, shouldRender, packaging]);

  const loadCustomerOptions = async (inputValue) => {
    try {
      const res = await getCustomersApi(1, 20, inputValue, 'ALL', true);
      if (res.data && res.data.success) {
        return res.data.data.data.map(c => ({ label: c.name, value: c.id }));
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch customers', error);
      return [];
    }
  };

  const handleClose = () => {
    setError(null);
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
    if (!trimmedName || !customer) {
      setError('All fields are required.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: trimmedName,
        customerId: customer.value,
      };
      const res = await updatePackagingApi(packaging.id, payload);
      if (res.data && res.data.success) {
        toast.success('Packaging updated successfully');
        onEdit();
        handleClose();
      } else {
        const errorMsg = res.error?.message || res.data?.message || 'Failed to update packaging';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'An unexpected error occurred.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldRender || !packaging) return null;
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
          <h2 id={titleId} className="text-base font-bold text-grey-text-strong">
            Edit packaging
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
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="flex flex-col gap-2">
                <div className="h-4 w-32 bg-grey-bg rounded"></div>
                <div className="h-10 w-full bg-grey-bg rounded-md"></div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-4 w-28 bg-grey-bg rounded"></div>
                <div className="h-10 w-full bg-grey-bg rounded-md"></div>
              </div>
            </div>
          ) : (
            <form id="packaging-edit-form" className="flex flex-col gap-4" onSubmit={submit}>
              <Input
                type="text"
                id="edit-packaging-name"
                label={<span>Packaging name <span className="text-danger-main">*</span></span>}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Box"
                autoFocus
              />
              <AsyncSelectInput
                id="edit-packaging-customer"
                label={<span>Customer <span className="text-danger-main">*</span></span>}
                value={customer}
                onChange={(selected) => setCustomer(selected)}
                loadOptions={loadCustomerOptions}
                defaultOptions={true}
                placeholder="Select a customer"
              />
              {error ? (
                <p className="text-sm font-medium text-danger-dark" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          )}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" disabled={isLoading} />
          <Button variant="primary" type="submit" form="packaging-edit-form" className="flex-1" text={isSubmitting ? "Saving..." : "Save packaging"} disabled={isSubmitting || isLoading} />
        </div>
      </div>
    </div>,
    root
  );
}
