import React, { useState, useId } from 'react';
import { useRouter } from 'next/router';
import { Layers, Plus, Trash2 } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import { toast } from 'sonner';
import { createBomApi, getProductsApi } from '@/lib/fetcher';

export default function AddBom() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mainProduct, setMainProduct] = useState(null);
  const [note, setNote] = useState('');

  const [items, setItems] = useState([{ product: null, quantity: '1', isIdentifier: true }, { product: null, quantity: '1', isIdentifier: false }]);
  const [defaultProducts, setDefaultProducts] = useState([]);


  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();

  const handleClose = () => {
    router.push('/bom');
  };

  React.useEffect(() => {
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

    const hasIdentifier = validItems.some(i => i.isIdentifier);
    if (!hasIdentifier) {
      toast.error('An identifier product is compulsory for every BOM.');
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

      const response = await createBomApi(payload);
      if (response.data && response.data.success) {
        toast.success('BOM added successfully!');
        router.push('/bom');
      } else {
        const errorMsg = response.error?.message || response.data?.message || 'Failed to add BOM';
        toast.error(errorMsg);
      }
    } catch (err) {
      toast.error('An error occurred while adding the BOM');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              New BOM
            </h2>
            <p className="text-xs text-grey-muted mt-0.5">Define materials for a product</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="secondary" onClick={handleClose} text="Cancel" className="flex-1 sm:flex-none" />
          <Button variant="primary" type="submit" form="bom-add-form" text={isSubmitting ? "Saving..." : "Save BOM"} disabled={isSubmitting} className="flex-1 sm:flex-none" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="mx-auto flex flex-col gap-4">
          <form id="bom-add-form" className="flex flex-col gap-4" onSubmit={submit}>
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
            <div className="bg-white rounded-md border border-grey-surface shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 bg-white flex items-center justify-between border-b border-grey-border">
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

                        <div className="w-full flex items-center mt-2 mb-2">
                          <input 
                            type="checkbox" 
                            id={`identifier-${index}`}
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
                          <label htmlFor={`identifier-${index}`} className="ml-2 text-sm text-grey-text-strong font-medium cursor-pointer">
                            Is Identifier Product
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add New Card */}
                  <div 
                    onClick={() => setItems([...items, { product: null, quantity: '1', isIdentifier: items.length === 0 }])}
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


          </form>
        </div>
      </div>
    </div>
  );
}
