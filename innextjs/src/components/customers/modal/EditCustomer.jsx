import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { updateCustomerApi, getCustomerByIdApi } from '@/lib/fetcher';
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

export default function EditCustomer({ open, onClose, onEdit, customer }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let timer;
    if (open && customer?.id) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      
      const fetchCustomer = async () => {
        setIsLoading(true);
        try {
          const res = await getCustomerByIdApi(customer.id);
          if (res.data && res.data.success) {
            const fetchedCustomer = res.data.data;
            setName(fetchedCustomer.name || '');
            setEmail(fetchedCustomer.email || '');
            setPhone(fetchedCustomer.phone || '');
            setBalance(fetchedCustomer.balance || '');
            setCode(fetchedCustomer.code || '');
            setRegion(fetchedCustomer.region || '');
          } else {
            toast.error('Failed to load customer details');
          }
        } catch (err) {
          toast.error('Error fetching customer details');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchCustomer();
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, shouldRender, customer]);

  const reset = () => {
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
    if (!trimmedName) {
      setError('Customer name is required.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await updateCustomerApi(customer.id, {
        name: trimmedName,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        balance: balance !== '' ? parseFloat(balance) : 0,
        code: code.trim() || undefined,
        region: region.trim() || undefined
      });
      
      if (res.error || (res.data && !res.data.success)) {
        const errorMsg = res.error?.message || res.data?.message || 'Failed to update customer';
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        onEdit(res.data.data); // pass the updated customer object
        toast.success('Customer updated successfully');
        reset();
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldRender || !customer) return null;
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
            Edit customer
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
            <div className="flex flex-col gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-4 w-24 bg-grey-border rounded animate-pulse opacity-50"></div>
                  <div className="h-10 w-full bg-grey-border rounded-md animate-pulse opacity-50"></div>
                </div>
              ))}
            </div>
          ) : (
            <form id="customers-edit-form" className="flex flex-col gap-4" onSubmit={submit}>
            <Input
              type="text"
              id="customers-edit-name"
              label="Customer name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Manufacturing"
              autoFocus
            />
            <Input
              type="email"
              id="customers-edit-email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. hello@apex.com"
            />
            <Input
              type="tel"
              id="customers-edit-phone"
              label="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
              placeholder="e.g. +1 555-0192"
              maxLength={15}
            />
            <Input
              type="number"
              id="customers-edit-balance"
              label="Opening Balance"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            <Input
              type="text"
              id="customers-edit-code"
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. APEX"
              maxLength={8}
              className="font-mono uppercase"
            />
            <Input
              type="text"
              id="customers-edit-region"
              label="Region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Midwest"
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
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" />
          <Button variant="primary" type="submit" form="customers-edit-form" className="flex-1" text={isSubmitting ? "Saving..." : "Save changes"} disabled={isSubmitting} />
        </div>
      </div>
    </div>,
    root
  );
}
