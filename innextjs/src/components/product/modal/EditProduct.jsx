import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import { toast } from 'sonner';
import { updateProductApi, getCategoriesApi, getUnitsApi, getProductByIdApi } from '@/lib/fetcher';

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

export default function EditProduct({ open, onClose, onEdit, product }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [unit, setUnit] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  useEffect(() => {
    const fetchFullProduct = async () => {
      if (!product?.id) return;
      setIsLoadingProduct(true);
      try {
        const response = await getProductByIdApi(product.id);
        if (response.data?.success) {
          const fullProduct = response.data.data;
          setName(fullProduct.name || '');
          setCode(fullProduct.code || '');
          setCategory(fullProduct.category ? { label: fullProduct.category.name, value: fullProduct.categoryId } : null);
          setStockQuantity(fullProduct.stockQuantity !== undefined ? fullProduct.stockQuantity.toString() : '');
          setLowStockThreshold(fullProduct.lowStockThreshold !== undefined ? fullProduct.lowStockThreshold.toString() : '10');
          setUnit(fullProduct.unit ? { label: fullProduct.unit.shortName || fullProduct.unit.name, value: fullProduct.unitId } : null);
          setIsActive(fullProduct.isActive ?? true);
        }
      } catch (err) {
        console.error('Failed to load full product details', err);
        toast.error('Failed to load full product details');
      } finally {
        setIsLoadingProduct(false);
      }
    };

    if (open && product) {
      // Clear previous state while loading
      setName('');
      setCode('');
      setCategory(null);
      setStockQuantity('');
      setLowStockThreshold('10');
      setUnit(null);
      setIsActive(true);
      setError(null);
      
      // Fetch fresh data
      fetchFullProduct();
    }
  }, [open, product]);

  useEffect(() => {
    let timer;
    if (open) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, shouldRender]);

  const handleClose = () => {
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
      setError('Product name is required.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: trimmedName,
        code: code.trim(),
        stockQuantity: parseFloat(stockQuantity) || 0,
        lowStockThreshold: parseFloat(lowStockThreshold) || 0,
        categoryId: category ? category.value : null,
        unitId: unit ? unit.value : null,
        isActive
      };
      
      const response = await updateProductApi(product.id, payload);
      if (response.data && response.data.success) {
        toast.success('Product updated successfully!');
        onEdit(response.data.data);
      } else {
        const errorMsg = response.error?.message || response.data?.message || 'Failed to update product';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      setError('An error occurred while updating the product');
      toast.error('An error occurred while updating the product');
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
            Edit product
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
          {isLoadingProduct ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div>
                <div className="h-4 w-24 bg-grey-bg rounded mb-2"></div>
                <div className="h-10 w-full bg-grey-bg rounded-md"></div>
              </div>
              <div>
                <div className="h-4 w-16 bg-grey-bg rounded mb-2"></div>
                <div className="h-10 w-full bg-grey-bg rounded-md"></div>
              </div>
              <div>
                <div className="h-4 w-20 bg-grey-bg rounded mb-2"></div>
                <div className="h-10 w-full bg-grey-bg rounded-md"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="h-4 w-24 bg-grey-bg rounded mb-2"></div>
                  <div className="h-10 w-full bg-grey-bg rounded-md"></div>
                </div>
                <div>
                  <div className="h-4 w-32 bg-grey-bg rounded mb-2"></div>
                  <div className="h-10 w-full bg-grey-bg rounded-md"></div>
                </div>
              </div>
              <div>
                <div className="h-4 w-12 bg-grey-bg rounded mb-2"></div>
                <div className="h-10 w-full bg-grey-bg rounded-md"></div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="h-5 w-24 bg-grey-bg rounded"></div>
                <div className="h-6 w-11 bg-grey-bg rounded-full"></div>
              </div>
            </div>
          ) : (
            <form id="product-edit-form" className="flex flex-col gap-4" onSubmit={submit}>
              <Input
              type="text"
              id="product-edit-name"
              label="Product name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. iPhone 15 Pro"
              autoFocus
            />
            <Input
              type="text"
              id="product-edit-code"
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PRD-001"
              className="font-mono uppercase"
            />
            <AsyncSelectInput
              id="edit-product-category"
              label="Category"
              value={category}
              onChange={(opt) => setCategory(opt || null)}
              placeholder="Select category"
              defaultOptions={true}
              loadOptions={async (input) => {
                const res = await getCategoriesApi(1, 10, input, 'ACTIVE');
                if (res.data?.success) {
                  return res.data.data.data.map(c => ({ label: c.name, value: c.id }));
                }
                return [];
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                id="edit-product-stock"
                label="Stock Quantity"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="0"
                min="0"
              />
              <Input
                type="number"
                id="edit-product-low-stock"
                label="Low Stock Alert At"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="10"
                min="0"
              />
            </div>
            <div>
              <AsyncSelectInput
                id="edit-product-unit"
                label="Unit"
                value={unit}
                onChange={(opt) => setUnit(opt || null)}
                placeholder="Select unit"
                defaultOptions={true}
                loadOptions={async (input) => {
                  const res = await getUnitsApi(1, 10, input, 'ACTIVE');
                  if (res.data?.success) {
                    return res.data.data.data.map(u => ({ label: `${u.name} ${u.shortName ? `(${u.shortName})` : ''}`, value: u.id }));
                  }
                  return [];
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <label htmlFor="edit-product-status-toggle" className="text-sm font-medium text-grey-text cursor-pointer">
                Status: {isActive ? <span className="text-success-main font-semibold">Active</span> : <span className="text-grey-muted">Inactive</span>}
              </label>
              <button
                type="button"
                id="edit-product-status-toggle"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-primary' : 'bg-grey-border'}`}
                aria-pressed={isActive}
              >
                <span className="sr-only">Toggle status</span>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </form>
          )}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1 sm:flex-none" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="product-edit-form" className="flex-1 sm:flex-none" disabled={isSubmitting || isLoadingProduct}>
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>,
    root
  );
}
