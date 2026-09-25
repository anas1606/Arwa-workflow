import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import { toast } from 'sonner';
import { updateStockApi, getProductsApi } from '@/lib/fetcher';

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

export default function UpdateStock({ isOpen, onClose, onUpdate }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [action, setAction] = useState('increase');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    let timer;
    if (isOpen) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      setSelectedProduct(null);
      setAction('increase');
      setAmount('');
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

  const reset = () => {
    setSelectedProduct(null);
    setAction('increase');
    setAmount('');
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

  const loadProductOptions = async (inputValue) => {
    try {
      const response = await getProductsApi(1, 100, inputValue, 'ALL', 'ALL', 'ALL', 'ALL', true);
      if (response?.data?.success) {
        const prods = response.data.data.data || [];
        return prods.map(p => ({ 
          label: `${p.name} ${p.code ? `(${p.code})` : ''}`, 
          value: p.id,
          stock: p.stockQuantity 
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const handleProductChange = (option) => {
    setSelectedProduct(option);
    setAction('increase');
    setAmount('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    
    const delta = parseFloat(amount);
    if (isNaN(delta) || delta <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    const currentStock = parseFloat(selectedProduct.stock) || 0;
    let finalQuantity = currentStock;

    if (action === 'decrease') {
      if (delta > currentStock) {
        toast.error(`Cannot decrease by ${delta}. Current stock is only ${currentStock}.`);
        return;
      }
      finalQuantity = currentStock - delta;
    } else {
      finalQuantity = currentStock + delta;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        productId: selectedProduct.value,
        quantity: finalQuantity
      };
      const response = await updateStockApi(payload);

      if (response.data && response.data.success) {
        toast.success('Stock updated successfully');
        onUpdate();
        handleClose();
      } else {
        toast.error(response.error?.message || response.data?.message || 'Failed to update stock');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'An unexpected error occurred.');
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
          <h2 id={titleId} className="text-base font-bold text-grey-text-strong">
            Update Stock
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
          <form id="stock-update-form" className="flex flex-col gap-4" onSubmit={submit}>
            
            <div className="flex flex-col gap-1">
              <AsyncSelectInput
                id="product-select"
                label="Select Product"
                value={selectedProduct}
                onChange={handleProductChange}
                loadOptions={loadProductOptions}
                placeholder="Search by name or code..."
                defaultOptions
              />
              {selectedProduct && (
                <span className="text-xs font-semibold text-primary-text-strong px-1">
                  Current Stock: {selectedProduct.stock || 0}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Input
                type="select"
                id="stock-action"
                label="Action"
                required
                value={action}
                onChange={(e) => setAction(e.target.value)}
                options={[
                  { label: 'Increase (+)', value: 'increase' },
                  { label: 'Decrease (-)', value: 'decrease' }
                ]}
                disabled={!selectedProduct}
                className="sm:w-1/3"
                hidePlaceholder
              />

              <Input
                type="number"
                id="stock-amount"
                label="Amount"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 10"
                disabled={!selectedProduct}
                className="sm:w-2/3"
              />
            </div>

          </form>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" disabled={isSubmitting} />
          <Button variant="primary" type="submit" form="stock-update-form" className="flex-1" text="Update Stock" disabled={isSubmitting || !selectedProduct} />
        </div>
      </div>
    </div>,
    root
  );
}
