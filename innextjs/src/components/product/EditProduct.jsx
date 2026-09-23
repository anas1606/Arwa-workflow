import React, { useState, useEffect, useId } from 'react';
import { useRouter } from 'next/router';
import { Package, Plus, Minus } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import { toast } from 'sonner';
import { updateProductApi, getCategoriesApi, getUnitsApi, getProductByIdApi } from '@/lib/fetcher';

export default function EditProduct({ id }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [unit, setUnit] = useState(null);
  const [isActive, setIsActive] = useState(true);
  
  const [bodyDesigns, setBodyDesigns] = useState([]);
  const [colours, setColours] = useState([]);

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  const titleId = useId();

  useEffect(() => {
    const fetchFullProduct = async () => {
      if (!id) return;
      setIsLoadingProduct(true);
      try {
        const response = await getProductByIdApi(id);
        if (response.data?.success) {
          const fullProduct = response.data.data;
          setName(fullProduct.name || '');
          setCode(fullProduct.code || '');
          setCategory(fullProduct.category ? { label: fullProduct.category.name, value: fullProduct.categoryId } : null);
          setStockQuantity(fullProduct.stockQuantity !== undefined ? fullProduct.stockQuantity.toString() : '');
          setLowStockThreshold(fullProduct.lowStockThreshold !== undefined ? fullProduct.lowStockThreshold.toString() : '10');
          setUnit(fullProduct.unit ? { label: fullProduct.unit.shortName || fullProduct.unit.name, value: fullProduct.unitId } : null);
          setIsActive(fullProduct.isActive ?? true);
          setBodyDesigns(fullProduct.bodyDesigns && fullProduct.bodyDesigns.length > 0 ? fullProduct.bodyDesigns.map(d => ({ name: d.name, type: d.type })) : [{ name: '', type: 'STANDARD' }]);
          setColours(fullProduct.colours && fullProduct.colours.length > 0 ? fullProduct.colours.map(c => ({ name: c.name, type: c.type })) : [{ name: '', type: 'STANDARD' }]);
        } else {
            toast.error('Failed to load product details');
            router.push('/inventory/product');
        }
      } catch (err) {
        console.error('Failed to load full product details', err);
        toast.error('Failed to load full product details');
        router.push('/inventory/product');
      } finally {
        setIsLoadingProduct(false);
      }
    };

    fetchFullProduct();
  }, [id, router]);

  const handleClose = () => {
    router.push('/inventory/product');
  };

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
      
      const response = await updateProductApi(id, payload);
      if (response.data && response.data.success) {
        toast.success('Product updated successfully!');
        router.push('/inventory/product');
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

  return (
    <div className="flex flex-col h-full animate-in fade-in" aria-labelledby={titleId}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between bg-white px-6 py-4 border-b border-grey-border z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-grey-border">
            <Package className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h2 id={titleId} className="text-xl font-bold text-grey-text-strong">
              Edit Product
            </h2>
            <p className="text-xs text-grey-muted mt-0.5">Modify product details and inventory settings</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleClose} text="Cancel" disabled={isSubmitting || isLoadingProduct} />
          <Button variant="primary" type="submit" form="product-edit-form" text={isSubmitting ? "Saving..." : "Save changes"} disabled={isSubmitting || isLoadingProduct} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="mx-auto flex flex-col gap-4">
          {isLoadingProduct ? (
            <div className="flex flex-col gap-4 animate-pulse">
              {/* Skeleton General Info */}
              <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-grey-border">
                  <div className="h-5 w-32 bg-grey-bg rounded"></div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2">
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
                </div>
              </div>

              {/* Skeleton Inventory Details */}
              <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-grey-border">
                  <div className="h-5 w-32 bg-grey-bg rounded"></div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <div className="h-4 w-24 bg-grey-bg rounded mb-2"></div>
                    <div className="h-10 w-full bg-grey-bg rounded-md"></div>
                  </div>
                  <div>
                    <div className="h-4 w-32 bg-grey-bg rounded mb-2"></div>
                    <div className="h-10 w-full bg-grey-bg rounded-md"></div>
                  </div>
                  <div>
                    <div className="h-4 w-12 bg-grey-bg rounded mb-2"></div>
                    <div className="h-10 w-full bg-grey-bg rounded-md"></div>
                  </div>
                </div>
              </div>

              {/* Skeleton Variations */}
              <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-grey-border flex justify-between">
                  <div className="h-5 w-24 bg-grey-bg rounded"></div>
                  <div className="h-8 w-24 bg-grey-bg rounded-md"></div>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <div className="h-12 w-full bg-grey-bg rounded-md"></div>
                  <div className="h-12 w-full bg-grey-bg rounded-md"></div>
                </div>
              </div>
            </div>
          ) : (
          <form id="product-edit-form" className="flex flex-col gap-4" onSubmit={submit}>
            {/* General Info */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-grey-border flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-grey-text-strong">General Information</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <Input
                    type="text"
                    id="edit-product-name"
                    label="Product name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. iPhone 15 Pro"
                    autoFocus
                  />
                </div>
                <Input
                  type="text"
                  id="edit-product-code"
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
              </div>
            </div>

            {/* Inventory Details */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-grey-border flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-grey-text-strong">Inventory Details</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      return res.data.data.data.map(u => ({ label: `${u.name} ${u.shortName ? '(' + u.shortName + ')' : ''}`, value: u.id }));
                    }
                    return [];
                  }}
                />
              </div>
            </div>

            {/* Variations */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-grey-border flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-grey-text-strong">Variations <span className="text-sm font-normal text-grey-muted ml-1">(Optional)</span></h3>
              </div>
              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-2 ">
                {/* Body Designs */}
                <div className="flex flex-col gap-3 ">
                  <label className="text-xs font-bold text-grey-text-strong uppercase tracking-wider mb-1">
                    Body Designs
                  </label>
                  
                  {bodyDesigns.length > 0 && (
                    <div className="flex items-center gap-4 pr-[5.5rem] px-1">
                      <div className="flex-1 text-xs font-semibold text-grey-text-strong">Design Name</div>
                      <div className="w-48 text-xs font-semibold text-grey-text-strong">Type</div>
                    </div>
                  )}

                  {bodyDesigns.map((design, index) => (
                    <div key={index} className="flex items-center gap-2 group">
                      <div className="flex-1">
                        <Input type="text" placeholder="e.g. Elegant Curves" value={design.name} onChange={(e) => {
                          const newDesigns = [...bodyDesigns];
                          newDesigns[index].name = e.target.value;
                          setBodyDesigns(newDesigns);
                        }} />
                      </div>
                      <div className="w-48 shrink-0">
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
                    <Button variant="secondary" size="sm" icon={Plus} text="Add Body Design" type="button" onClick={() => setBodyDesigns([{ name: '', type: 'STANDARD' }])} className="self-start mt-2" />
                  )}
                </div>

                {/* Colours */}
                <div className="flex flex-col gap-3 pt-8 lg:pt-0 ">
                  <label className="text-xs font-bold text-grey-text-strong uppercase tracking-wider mb-1">
                    Colours
                  </label>
                  
                  {colours.length > 0 && (
                    <div className="flex items-center gap-4 pr-[5.5rem] px-1">
                      <div className="flex-1 text-xs font-semibold text-grey-text-strong">Colour Name</div>
                      <div className="w-48 text-xs font-semibold text-grey-text-strong">Type</div>
                    </div>
                  )}

                  {colours.map((colour, index) => (
                    <div key={index} className="flex items-center gap-2 group">
                      <div className="flex-1">
                        <Input type="text" placeholder="e.g. Matte Black" value={colour.name} onChange={(e) => {
                          const newColours = [...colours];
                          newColours[index].name = e.target.value;
                          setColours(newColours);
                        }} />
                      </div>
                      <div className="w-48 shrink-0">
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
                    <Button variant="secondary" size="sm" icon={Plus} text="Add Colour" type="button" onClick={() => setColours([{ name: '', type: 'STANDARD' }])} className="self-start mt-2" />
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden p-6 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-grey-text-strong">Product Status</h3>
                <p className="text-sm text-grey-muted mt-1">Determine if this product is active and visible in the catalog.</p>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="edit-product-status-toggle" className="text-sm font-medium text-grey-text cursor-pointer">
                  {isActive ? <span className="text-success-main font-semibold">Active</span> : <span className="text-grey-muted">Inactive</span>}
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
            </div>

            {error && (
              <p className="text-sm font-medium text-danger-dark" role="alert">
                {error}
              </p>
            )}
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
