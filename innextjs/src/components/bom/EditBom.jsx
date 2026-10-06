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
          setMainProduct({ label: bomData.product.name + (bomData.product.code ? ` (${bomData.product.code})` : '') + (bomData.product.unit ? ` - ${bomData.product.unit.shortName || bomData.product.unit.name}` : ''), value: bomData.product.id });
        }

        if (bomData.items && bomData.items.length > 0) {
          setItems(bomData.items.map(item => ({
            product: { label: item.product.name + (item.product.code ? ` (${item.product.code})` : '') + (item.product.unit ? ` - ${item.product.unit.shortName || item.product.unit.name}` : ''), value: item.product.id },
            quantity: item.quantity.toString(),
            isIdentifier: item.isIdentifier || false
          })));
        } else {
          setItems([{ product: null, quantity: '1', isIdentifier: true }, { product: null, quantity: '1', isIdentifier: false }]);
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
        setDefaultProducts(res.data.data.data.map(p => ({ label: p.name + (p.code ? ` (${p.code})` : '') + (p.unit ? ` - ${p.unit.shortName || p.unit.name}` : ''), value: p.id })));
      }
    };
    fetchDefaultProducts();
  }, []);

  const loadMainProducts = async (input) => {
    if (!input) return defaultProducts;
    const res = await getProductsApi(1, 20, input, 'ACTIVE', 'ALL', 'ALL', 'ALL', true);
    if (res.data?.success) {
      return res.data.data.data.map(p => ({ label: p.name + (p.code ? ` (${p.code})` : '') + (p.unit ? ` - ${p.unit.shortName || p.unit.name}` : ''), value: p.id }));
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
        .map(p => ({ label: p.name + (p.code ? ` (${p.code})` : '') + (p.unit ? ` - ${p.unit.shortName || p.unit.name}` : ''), value: p.id }));
    }
    return [];
  };

  const submit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('BOM name is required.');
      return;
    }
    if (!mainProduct) {
      toast.error('Main product is required.');
      return;
    }

    const validItems = items.filter(i => i.product && parseFloat(i.quantity) > 0);
    if (validItems.length === 0) {
      toast.error('At least one valid component product and quantity > 0 is required.');
      return;
    }
    


    setIsSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        productId: mainProduct.value,
        note: note.trim() || null,
        items: validItems.map(i => ({
          productId: i.product.value,
          quantity: parseFloat(i.quantity),
          isIdentifier: i.isIdentifier || false
        }))
      };

      const response = await updateBomApi(id, payload);
      if (response.data && response.data.success) {
        toast.success('BOM updated successfully!');
        router.push('/bom');
      } else {
        const errorMsg = response.error?.message || response.data?.message || 'Failed to update BOM';
        toast.error(errorMsg);
      }
    } catch (err) {
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
      <div className="flex flex-col sm:flex-row shrink-0 items-start sm:items-center justify-between bg-white px-4 sm:px-6 py-4 border-b border-grey-border z-10 gap-4">
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
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="secondary" onClick={handleClose} text="Cancel" className="flex-1 sm:flex-none" />
          <Button variant="primary" type="submit" form="bom-edit-form" text={isSubmitting ? "Saving..." : "Save BOM"} disabled={isSubmitting} className="flex-1 sm:flex-none" />
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
              
              <div className="p-6 bg-white">
                <div className="flex flex-col gap-4">
                  {items.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex flex-col sm:flex-row items-center gap-3 w-full"
                    >
                      {/* Material */}
                      <div className="flex-1 w-full">
                        <AsyncSelectInput
                          value={item.product}
                          onChange={(opt) => {
                            const newItems = [...items];
                            newItems[index].product = opt || null;
                            setItems(newItems);
                          }}
                          placeholder="Select material..."
                          defaultOptions={defaultProducts.filter(p => !items.filter(i => i.product && i.product.value !== item.product?.value).map(i => i.product.value).includes(p.value))}
                          loadOptions={(input) => loadComponentProducts(input, item.product?.value)}
                          hidePlaceholder={true}
                        />
                      </div>

                      {/* Quantity */}
                      <div className="w-full sm:w-[150px] shrink-0">
                        <Input 
                          type="number" 
                          placeholder="Qty" 
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

                      {/* Identifier */}
                      <div className="flex items-center justify-center w-full sm:w-auto shrink-0 bg-white px-4 h-11 rounded-md border border-grey-border">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={item.isIdentifier || false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const newItems = items.map((itm, idx) => {
                                if (idx === index) {
                                  return { ...itm, isIdentifier: checked };
                                }
                                return checked ? { ...itm, isIdentifier: false } : itm;
                              });
                              setItems(newItems);
                            }}
                            className="h-4 w-4 rounded border-grey-border text-primary focus:ring-primary/20"
                          />
                          <span className="text-sm font-medium text-grey-text-strong whitespace-nowrap">Identifier</span>
                        </label>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto mt-2 sm:mt-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (items.length > 1) {
                              const newItems = [...items];
                              newItems.splice(index, 1);
                              setItems(newItems);
                            }
                          }}
                          className={`flex items-center justify-center w-11 h-11 rounded-md transition-all ${items.length > 1 ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm' : 'bg-grey-border/50 text-grey-icon cursor-not-allowed'}`}
                          disabled={items.length <= 1}
                        >
                          <svg width="14" height="2" viewBox="0 0 14 2" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                        
                        {index === items.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setItems([...items, { product: null, quantity: '1', isIdentifier: items.length === 0 }])}
                            className="flex items-center justify-center w-11 h-11 rounded-md bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-all shadow-sm"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        ) : (
                          <div className="w-11 h-11 hidden sm:block"></div>
                        )}
                      </div>
                    </div>
                  ))}
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


          </form>
        </div>
      </div>
    </div>
  );
}
