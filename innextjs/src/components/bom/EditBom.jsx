import React, { useState, useEffect, useId } from 'react';
import { useRouter } from 'next/router';
import { Layers, Plus, Trash2 } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import { toast } from 'sonner';
import { getBomByIdApi, updateBomApi, getProductsApi } from '@/lib/fetcher';

export default function EditBom() {
  const router = useRouter();
  const { id } = router.query;
  const [name, setName] = useState('');
  const [mainProduct, setMainProduct] = useState(null);
  const [note, setNote] = useState('');

  const [items, setItems] = useState([]);
  const [defaultProducts, setDefaultProducts] = useState([]);

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const titleId = useId();

  useEffect(() => {
    if (id) {
      fetchBomDetails();
    }
  }, [id]);

  const fetchBomDetails = async () => {
    setIsLoading(true);
    try {
      const response = await getBomByIdApi(id);
      if (response.data?.success) {
        const bomData = response.data.data;
        setName(bomData.name);
        setNote(bomData.note || '');
        if (bomData.product) {
          setMainProduct({ label: bomData.product.name + (bomData.product.code ? ` (${bomData.product.code})` : ''), value: bomData.product.id });
        }

        if (bomData.items && bomData.items.length > 0) {
          setItems(bomData.items.map(item => ({
            product: { label: item.product.name + (item.product.code ? ` (${item.product.code})` : ''), value: item.product.id },
            quantity: item.quantity.toString()
          })));
        } else {
          setItems([{ product: null, quantity: '1' }, { product: null, quantity: '1' }]);
        }
      } else {
        toast.error('Failed to fetch BOM details');
        router.push('/bom');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while fetching BOM details');
      router.push('/bom');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    router.push('/bom');
  };

  useEffect(() => {
    const fetchDefaultProducts = async () => {
      const res = await getProductsApi(1, 10, '', 'ACTIVE', 'ALL', 'ALL', 'ALL', true);
      if (res.data?.success) {
        setDefaultProducts(res.data.data.data.map(p => ({ label: p.name + (p.code ? ` (${p.code})` : ''), value: p.id })));
      }
    };
    fetchDefaultProducts();
  }, []);

  const loadMainProducts = async (input) => {
    if (!input) return defaultProducts;
    const res = await getProductsApi(1, 20, input, 'ACTIVE', 'ALL', 'ALL', 'ALL', true);
    if (res.data?.success) {
      return res.data.data.data.map(p => ({ label: p.name + (p.code ? ` (${p.code})` : ''), value: p.id }));
    }
    return [];
  };

  const loadComponentProducts = async (input, currentItemId) => {
    const selectedIds = items.filter(i => i.product && i.product.value !== currentItemId).map(i => i.product.value);

    if (!input) {
      return defaultProducts.filter(p => !selectedIds.includes(p.value));
    }

    const res = await getProductsApi(1, 20, input, 'ACTIVE', 'ALL', 'ALL', 'ALL', true);
    if (res.data?.success) {
      return res.data.data.data
        .filter(p => !selectedIds.includes(p.id))
        .map(p => ({ label: p.name + (p.code ? ` (${p.code})` : ''), value: p.id }));
    }
    return [];
  };

  const submit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('BOM name is required.');
      return;
    }
    if (!mainProduct) {
      setError('Main product is required.');
      return;
    }

    const validItems = items.filter(i => i.product && parseFloat(i.quantity) > 0);
    if (validItems.length === 0) {
      setError('At least one valid component product and quantity > 0 is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: trimmedName,
        productId: mainProduct.value,
        note: note.trim() || null,
        items: validItems.map(i => ({
          productId: i.product.value,
          quantity: parseFloat(i.quantity)
        }))
      };

      const response = await updateBomApi(id, payload);
      if (response.data && response.data.success) {
        toast.success('BOM updated successfully!');
        router.push('/bom');
      } else {
        const errorMsg = response.error?.message || response.data?.message || 'Failed to update BOM';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      setError('An error occurred while updating the BOM');
      toast.error('An error occurred while updating the BOM');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex shrink-0 items-center justify-between bg-white px-6 py-4 border-b border-grey-border z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 bg-gray-200 animate-pulse rounded-md"></div>
            <div>
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="h-3 w-48 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-20 bg-gray-200 animate-pulse rounded-md"></div>
            <div className="h-10 w-24 bg-gray-200 animate-pulse rounded-md"></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="mx-auto flex flex-col gap-4">
            
            {/* General Info Skeleton */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden animate-pulse">
              <div className="px-6 py-4 border-b border-grey-border flex items-center gap-2">
                <div className="h-4 w-40 bg-gray-200 rounded"></div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
                  <div className="h-10 w-full bg-gray-200 rounded-md"></div>
                </div>
                <div>
                  <div className="h-3 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="h-10 w-full bg-gray-200 rounded-md"></div>
                </div>
              </div>
            </div>

            {/* Components Skeleton */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden animate-pulse">
              <div className="px-6 py-4 border-b border-grey-border flex items-center justify-between">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
              <div className="p-4">
                <div className="hidden lg:grid grid-cols-2 gap-8 px-1 mb-3">
                  <div className="flex items-center gap-4 pr-[5.5rem]">
                    <div className="flex-1 h-3 bg-gray-200 rounded"></div>
                    <div className="w-32 h-3 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-4 pr-[5.5rem]">
                    <div className="flex-1 h-3 bg-gray-200 rounded"></div>
                    <div className="w-32 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="flex-1 h-10 bg-gray-200 rounded-md"></div>
                      <div className="w-32 shrink-0 h-10 bg-gray-200 rounded-md"></div>
                      <div className="w-10 h-10 shrink-0 bg-gray-200 rounded-md"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Note Skeleton */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden animate-pulse">
              <div className="px-6 py-4 border-b border-grey-border flex items-center gap-2">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
              <div className="p-6">
                <div className="h-24 w-full bg-gray-200 rounded-md"></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in" aria-labelledby={titleId}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between bg-white px-6 py-4 border-b border-grey-border z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-grey-border">
            <Layers className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h2 id={titleId} className="text-xl font-bold text-grey-text-strong">
              Edit BOM
            </h2>
            <p className="text-xs text-grey-muted mt-0.5">Modify materials for a product</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleClose} text="Cancel" />
          <Button variant="primary" type="submit" form="bom-edit-form" text={isSubmitting ? "Saving..." : "Save BOM"} disabled={isSubmitting} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="mx-auto flex flex-col gap-4">
          <form id="bom-edit-form" className="flex flex-col gap-4" onSubmit={submit}>
            {/* General Info */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-grey-border flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-grey-text-strong">General Information</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  type="text"
                  id="bom-name"
                  label="BOM Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard Assembly"
                  autoFocus
                />
                <AsyncSelectInput
                  id="main-product"
                  label="Main Product"
                  required
                  value={mainProduct}
                  onChange={(opt) => setMainProduct(opt || null)}
                  placeholder="Select product"
                  defaultOptions={defaultProducts.length > 0 ? defaultProducts : true}
                  loadOptions={loadMainProducts}
                />
              </div>
            </div>

            {/* Components */}
            <div className="bg-white rounded-xl border border-grey-surface shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 bg-white flex items-center justify-between border-b border-grey-surface/60">
                <div>
                  <h3 className="text-base font-bold text-grey-text-strong">Bill of Materials</h3>
                  <p className="text-xs text-grey-muted mt-0.5">Define the materials and quantities required</p>
                </div>
              </div>
              
              <div className="p-6 bg-grey-bg/20">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {items.map((item, index) => (
                    <div 
                      key={index} 
                      className="group relative flex flex-col gap-4 p-5 bg-white rounded-xl border border-grey-surface shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-grey-bg text-[11px] font-bold text-grey-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-grey-text-strong uppercase tracking-wider">
                            Component
                          </span>
                        </div>
                        
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = [...items];
                              newItems.splice(index, 1);
                              setItems(newItems);
                            }}
                            className="p-1.5 text-grey-icon hover:text-danger-main hover:bg-danger-main/10 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Remove material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="flex flex-col gap-3">
                        <div className="w-full">
                          <div className="text-[10px] font-bold text-grey-muted uppercase tracking-wider mb-1.5">Material / Product</div>
                          <AsyncSelectInput
                            value={item.product}
                            onChange={(opt) => {
                              const newItems = [...items];
                              newItems[index].product = opt || null;
                              setItems(newItems);
                            }}
                            placeholder="Search material..."
                            defaultOptions={defaultProducts.filter(p => !items.filter(i => i.product && i.product.value !== item.product?.value).map(i => i.product.value).includes(p.value))}
                            loadOptions={(input) => loadComponentProducts(input, item.product?.value)}
                            hidePlaceholder={true}
                          />
                        </div>

                        <div className="w-full">
                          <div className="text-[10px] font-bold text-grey-muted uppercase tracking-wider mb-1.5">Quantity</div>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            value={item.quantity} 
                            onChange={(e) => {
                              const newItems = [...items];
                              let val = e.target.value;
                              if (val !== '' && parseFloat(val) <= 0) val = '1';
                              newItems[index].quantity = val;
                              setItems(newItems);
                            }} 
                            hidePlaceholder 
                            min="1" 
                            step="any" 
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add New Card */}
                  <div 
                    onClick={() => setItems([...items, { product: null, quantity: '1' }])}
                    className="flex flex-col items-center justify-center gap-3 min-h-[220px] rounded-xl border-2 border-dashed border-grey-border bg-transparent hover:bg-white hover:border-primary/40 hover:text-primary cursor-pointer transition-all duration-200 text-grey-icon"
                  >
                    <div className="p-3 rounded-full bg-grey-bg group-hover:bg-primary/10">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold tracking-wide">Add Component</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-white rounded-md border border-grey-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-grey-border flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-grey-text-strong">Additional Note</h3>
              </div>
              <div className="p-6">
                <textarea
                  className="w-full h-24 p-3 border border-grey-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y"
                  placeholder="Any additional notes or instructions for this BOM..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                ></textarea>
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-danger-dark" role="alert">
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
