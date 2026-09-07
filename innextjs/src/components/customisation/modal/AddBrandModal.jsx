import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Input from '@/common/input/Input';
import Button from '@/common/buttons/Button';
import { getCustomersApi, createBrandApi } from '@/lib/fetcher';
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

export default function AddBrandModal({ open, initialCustomerId, onClose, onAdd }) {
  const [customersList, setCustomersList] = useState([]);
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId || '');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  
  const handleClose = () => {
    onClose();
  };

  useEffect(() => { 
    if (open) { 
      setBrandName(''); 
      setDescription('');
      setError(null); 
      
      // Fetch dynamic customers
      getCustomersApi(1, 100).then(res => {
        if (res.data && res.data.success) {
          const list = res.data.data.data;
          setCustomersList(list);
          if (!initialCustomerId && list.length > 0) {
            setSelectedCustomerId(list[0].id);
          } else if (initialCustomerId) {
            setSelectedCustomerId(initialCustomerId);
          }
        }
      });
    } 
  }, [open, initialCustomerId]);
  
  const submit = async (e) => {
    e.preventDefault();
    const name = brandName.trim();
    if (!name) return setError('Brand name is required.');
    if (!selectedCustomerId) return setError('Select a customer.');
    
    // Check local state first if brands are available
    const customer = customersList.find((c) => c.id === selectedCustomerId);
    if (customer?.brands && customer.brands.some((b) => b.brandname?.toLowerCase() === name.toLowerCase() || b.name?.toLowerCase() === name.toLowerCase())) {
      return setError(`Brand "${name}" already exists for this customer.`);
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await createBrandApi({
        brandname: name,
        customer_id: selectedCustomerId,
        description: description.trim() || undefined,
      });

      if (res.error || (res.data && !res.data.success)) {
        const errorMsg = res.error?.message || res.data?.message || 'Failed to create brand';
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        onAdd(selectedCustomerId, { ...res.data.data, name: res.data.data.brandname, panelStickers: ['None'] });
        toast.success('Brand created successfully');
        handleClose();
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      toast.error('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    let timer;
    if (open) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => { setShouldRender(false); }, 200);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [open, shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    const onKeyDown = (e) => { if (e.key === 'Escape') { e.preventDefault(); handleClose(); } };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [shouldRender]);

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
        className={`app-modal-panel bg-white shadow-2xl rounded-md border border-ink-200 ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-lg w-full`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ink-200 px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-ink-900">Add brand</h2>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-md p-0 flex items-center justify-center transition-colors hover:bg-ink-50 text-ink-500 hover:text-ink-900"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <Input type="text" label="Brand name" required value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Acme Pro" autoFocus disabled={isLoading} />
            <Input type="text" label="Description (Optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter brand description" disabled={isLoading} />
            <Input type="select" label="Customer" required value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}
              options={customersList.map((c) => ({ label: `${c.name} · ${c.code}`, value: c.id }))} disabled={isLoading} />
            <p className="text-xs text-ink-500">You can assign this brand to a different customer if needed.</p>
            {error && <p className="text-sm font-medium text-danger-700" role="alert">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" disabled={isLoading} />
              <Button variant="primary" type="submit" className="flex-1" text={isLoading ? 'Adding...' : 'Add brand'} disabled={isLoading} />
            </div>
          </form>
        </div>
      </div>
    </div>,
    root
  );
}
