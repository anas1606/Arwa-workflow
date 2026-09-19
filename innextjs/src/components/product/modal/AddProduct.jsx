import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import { toast } from 'sonner';
import { createProductApi, getCategoriesApi, getUnitsApi } from '@/lib/fetcher';

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

export default function AddProduct({ open, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [unit, setUnit] = useState(null);
  const [isActive, setIsActive] = useState(true);
  
  const [bodyDesigns, setBodyDesigns] = useState([{ name: '', type: 'STANDARD' }]);
  const [colours, setColours] = useState([{ name: '', type: 'STANDARD' }]);

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

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

  const reset = () => {
    setName('');
    setCode('');
    setCategory(null);
    setStockQuantity('');
    setLowStockThreshold('10');
    setUnit(null);
    setIsActive(true);
    setBodyDesigns([{ name: '', type: 'STANDARD' }]);
    setColours([{ name: '', type: 'STANDARD' }]);
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
        isActive,
        bodyDesigns: bodyDesigns.filter(d => d.name.trim() !== ''),
        colours: colours.filter(c => c.name.trim() !== '')
      };
      
      const response = await createProductApi(payload);
      if (response.data && response.data.success) {
        toast.success('Product added successfully!');
        onAdd(response.data.data);
        reset();
      } else {
        const errorMsg = response.error?.message || response.data?.message || 'Failed to add product';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      setError('An error occurred while adding the product');
      toast.error('An error occurred while adding the product');
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
            Add product
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
          <form id="product-add-form" className="flex flex-col gap-4" onSubmit={submit}>
            <Input
              type="text"
              id="product-name"
              label="Product name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. iPhone 15 Pro"
              autoFocus
            />
            <Input
              type="text"
              id="product-code"
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PRD-001"
              className="font-mono uppercase"
            />
            <AsyncSelectInput
              id="product-category"
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
                id="product-stock"
                label="Stock Quantity"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="0"
                min="0"
              />
              <Input
                type="number"
                id="product-low-stock"
                label="Low Stock Alert At"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="10"
                min="0"
              />
            </div>
            <div>
              <AsyncSelectInput
                id="product-unit"
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
            
            {/* Body Designs */}
            <div className="flex flex-col gap-2 border-t border-grey-border pt-4">
              <label className="text-xs font-bold text-grey-text-strong uppercase tracking-wider mb-1">
                Body Designs <span className="text-grey-muted normal-case font-normal">(optional)</span>
              </label>
              
              {bodyDesigns.length > 0 && (
                <div className="flex items-center gap-2 pr-[5.5rem]">
                  <div className="flex-1 text-xs font-semibold text-grey-text-strong">Design Name</div>
                  <div className="w-40 text-xs font-semibold text-grey-text-strong">Type</div>
                </div>
              )}

              {bodyDesigns.map((design, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input type="text" placeholder="e.g. Elegant Curves" value={design.name} onChange={(e) => {
                      const newDesigns = [...bodyDesigns];
                      newDesigns[index].name = e.target.value;
                      setBodyDesigns(newDesigns);
                    }} />
                  </div>
                  <div className="w-40 shrink-0">
                    <Input type="select" value={design.type} onChange={(e) => {
                      const newDesigns = [...bodyDesigns];
                      newDesigns[index].type = e.target.value;
                      setBodyDesigns(newDesigns);
                    }} options={[{label: 'Standard', value: 'STANDARD'}, {label: 'Non-Standard', value: 'NON_STANDARD'}]} hidePlaceholder />
                  </div>
                  
                  {bodyDesigns.length === 1 ? (
                    <>
                      <button type="button" onClick={() => setBodyDesigns([...bodyDesigns, { name: '', type: 'STANDARD' }])} className="h-10 w-10 flex-shrink-0 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </button>
                      <div className="w-10 flex-shrink-0" />
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => {
                        const newDesigns = [...bodyDesigns];
                        newDesigns.splice(index, 1);
                        setBodyDesigns(newDesigns);
                      }} className="h-10 w-10 flex-shrink-0 bg-danger-main hover:bg-danger-dark text-white rounded-md transition-colors flex items-center justify-center">
                        <Minus className="w-5 h-5" />
                      </button>

                      {index === bodyDesigns.length - 1 ? (
                        <button type="button" onClick={() => setBodyDesigns([...bodyDesigns, { name: '', type: 'STANDARD' }])} className="h-10 w-10 flex-shrink-0 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                        </button>
                      ) : (
                        <div className="w-10 flex-shrink-0" />
                      )}
                    </>
                  )}
                </div>
              ))}

              {bodyDesigns.length === 0 && (
                <Button variant="secondary" size="sm" icon={Plus} text="Add Body Design" type="button" onClick={() => setBodyDesigns([{ name: '', type: 'STANDARD' }])} className="self-start" />
              )}
            </div>

            {/* Colours */}
            <div className="flex flex-col gap-2 border-t border-grey-border pt-4">
              <label className="text-xs font-bold text-grey-text-strong uppercase tracking-wider mb-1">
                Colours <span className="text-grey-muted normal-case font-normal">(optional)</span>
              </label>
              
              {colours.length > 0 && (
                <div className="flex items-center gap-2 pr-[5.5rem]">
                  <div className="flex-1 text-xs font-semibold text-grey-text-strong">Colour Name</div>
                  <div className="w-40 text-xs font-semibold text-grey-text-strong">Type</div>
                </div>
              )}

              {colours.map((colour, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input type="text" placeholder="e.g. Matte Black" value={colour.name} onChange={(e) => {
                      const newColours = [...colours];
                      newColours[index].name = e.target.value;
                      setColours(newColours);
                    }} />
                  </div>
                  <div className="w-40 shrink-0">
                    <Input type="select" value={colour.type} onChange={(e) => {
                      const newColours = [...colours];
                      newColours[index].type = e.target.value;
                      setColours(newColours);
                    }} options={[{label: 'Standard', value: 'STANDARD'}, {label: 'Non-Standard', value: 'NON_STANDARD'}]} hidePlaceholder />
                  </div>
                  
                  {colours.length === 1 ? (
                    <>
                      <button type="button" onClick={() => setColours([...colours, { name: '', type: 'STANDARD' }])} className="h-10 w-10 flex-shrink-0 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </button>
                      <div className="w-10 flex-shrink-0" />
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => {
                        const newColours = [...colours];
                        newColours.splice(index, 1);
                        setColours(newColours);
                      }} className="h-10 w-10 flex-shrink-0 bg-danger-main hover:bg-danger-dark text-white rounded-md transition-colors flex items-center justify-center">
                        <Minus className="w-5 h-5" />
                      </button>

                      {index === colours.length - 1 ? (
                        <button type="button" onClick={() => setColours([...colours, { name: '', type: 'STANDARD' }])} className="h-10 w-10 flex-shrink-0 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                        </button>
                      ) : (
                        <div className="w-10 flex-shrink-0" />
                      )}
                    </>
                  )}
                </div>
              ))}

              {colours.length === 0 && (
                <Button variant="secondary" size="sm" icon={Plus} text="Add Colour" type="button" onClick={() => setColours([{ name: '', type: 'STANDARD' }])} className="self-start" />
              )}
            </div>

            <div className="flex items-center justify-between mt-2 border-t border-grey-border pt-4">
              <label htmlFor="add-product-status-toggle" className="text-sm font-medium text-grey-text cursor-pointer">
                Status: {isActive ? <span className="text-success-main font-semibold">Active</span> : <span className="text-grey-muted">Inactive</span>}
              </label>
              <button
                type="button"
                id="add-product-status-toggle"
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
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" />
          <Button variant="primary" type="submit" form="product-add-form" className="flex-1" text={isSubmitting ? "Adding..." : "Add product"} disabled={isSubmitting} />
        </div>
      </div>
    </div>,
    root
  );
}
