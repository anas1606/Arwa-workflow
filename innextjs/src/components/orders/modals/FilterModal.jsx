import React, { useState, useEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import clsx from 'clsx';
import { getOrderFiltersApi } from '@/lib/fetcher';

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

const CATEGORIES = [
  { id: 'orderNumber', label: 'Order' },
  { id: 'orderDate', label: 'Order date' },
  { id: 'dueDate', label: 'Due date' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'customer', label: 'Customer' },
  { id: 'priority', label: 'Priority' },
  { id: 'status', label: 'Status' },
  { id: 'product', label: 'Product' },
  { id: 'orderType', label: 'Order Type' },
];

export default function FilterModal({ open, onClose, onApply, initialFilters }) {
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const [activeTab, setActiveTab] = useState('orderNumber');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setSearchQuery('');
    setIsSearching(false);
  }, [activeTab]);

  // Initial fetch of default options (top 10)
  useEffect(() => {
    if (open && !filterOptions) {
      getOrderFiltersApi().then(res => {
        if (res.data?.success) {
          setFilterOptions(res.data.data);
        }
      });
    }
  }, [open, filterOptions]);

  // Debounced server-side search
  useEffect(() => {
    if (!open) return;
    
    // Only search on backend for specific large datasets
    if (activeTab !== 'customer' && activeTab !== 'product' && activeTab !== 'orderNumber') return;

    const timer = setTimeout(() => {
      setIsSearching(true);
      // If query is empty, we still want to fetch the default top 10 for that tab to reset the list
      getOrderFiltersApi(activeTab, searchQuery).then(res => {
        if (res.data?.success) {
          setFilterOptions(prev => {
            if (!prev) return res.data.data;
            const keyMap = { customer: 'customers', product: 'products', orderNumber: 'orderNumbers' };
            const key = keyMap[activeTab];
            return {
              ...prev,
              [key]: res.data.data[key]
            };
          });
        }
        setIsSearching(false);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, open]);

  useEffect(() => {
    if (open) {
      setSelectedFilters(initialFilters || {});
    }
  }, [open, initialFilters]);

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
    
    const hasLock = document.body.dataset.modalLock === 'true';
    if (!hasLock) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.dataset.prevOverflow = document.body.style.overflow;
      document.body.dataset.prevPadding = document.body.style.paddingRight;
      document.body.dataset.modalLock = 'true';
      
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const onKeyDown = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKeyDown);
    
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      setTimeout(() => {
        const remainingModals = document.querySelectorAll('.app-modal-layer').length;
        if (remainingModals === 0) {
          document.body.style.overflow = document.body.dataset.prevOverflow || '';
          document.body.style.paddingRight = document.body.dataset.prevPadding || '';
          delete document.body.dataset.modalLock;
          delete document.body.dataset.prevOverflow;
          delete document.body.dataset.prevPadding;
        }
      }, 0);
    };
  }, [shouldRender, onClose]);

  const activeOptions = useMemo(() => {
    if (!filterOptions) return [];
    
    let options = [];
    if (activeTab === 'customer') {
      options = (filterOptions.customers || []).map(c => ({ val: c.id, label: c.name }));
    } else if (activeTab === 'product') {
      options = (filterOptions.products || []).map(p => ({ val: p.id, label: p.name }));
    } else if (activeTab === 'priority') {
      options = (filterOptions.priorities || []).map(p => ({ val: p, label: p }));
    } else if (activeTab === 'status') {
      options = (filterOptions.statuses || []).map(s => ({ val: s, label: s }));
    } else if (activeTab === 'orderType') {
      options = (filterOptions.orderTypes || []).map(o => ({ val: o, label: o }));
    } else if (activeTab === 'orderNumber') {
      options = (filterOptions.orderNumbers || []).map(o => ({ val: o, label: o }));
    } else {
      // quantity, date ranges remain free-text/custom inputs that don't need checkbox lists
      return [];
    }

    // Sort alphabetically by label
    return options.sort((a, b) => {
      const labelA = a.label || '';
      const labelB = b.label || '';
      return labelA.localeCompare(labelB);
    });
  }, [filterOptions, activeTab]);

  const displayOptions = useMemo(() => {
    let opts = activeOptions;
    
    // Server already returns max 10, but we still ensure selected options are prepended
    if (activeTab === 'orderNumber' || activeTab === 'product' || activeTab === 'customer') {
      // Find all options that are currently selected so they are always visible
      const selectedOpts = opts.filter(opt => (selectedFilters[activeTab] || []).includes(opt.val));
      const unselectedOpts = opts.filter(opt => !(selectedFilters[activeTab] || []).includes(opt.val));
      
      // Show up to 10 options max, keeping the selected ones at the top.
      const maxUnselected = Math.max(0, 10 - selectedOpts.length);
      opts = [...selectedOpts, ...unselectedOpts.slice(0, maxUnselected)];
    }
    
    return opts;
  }, [activeOptions, activeTab, searchQuery, selectedFilters]);

  const handleToggleValue = (val) => {
    setSelectedFilters(prev => {
      const current = prev[activeTab] || [];
      const isSelected = current.includes(val);
      let updated;
      if (isSelected) {
        updated = current.filter(v => v !== val);
      } else {
        updated = [...current, val];
      }
      
      const newFilters = { ...prev, [activeTab]: updated };
      if (updated.length === 0) {
        delete newFilters[activeTab];
      }
      return newFilters;
    });
  };

  const handleRangeChange = (key, field, value) => {
    setSelectedFilters(prev => {
      const current = prev[key] || {};
      const updated = { ...current, [field]: value };
      if (!updated.from && !updated.to && !updated.min && !updated.max) {
        const newFilters = { ...prev };
        delete newFilters[key];
        return newFilters;
      }
      return { ...prev, [key]: updated };
    });
  };

  const getCategoryCount = (catId) => {
    const filter = selectedFilters[catId];
    if (!filter) return 0;
    if (Array.isArray(filter)) return filter.length;
    return Object.values(filter).filter(v => v !== '').length;
  };

  const handleClearAll = () => {
    setSelectedFilters({});
  };

  const handleDone = () => {
    // Map internal filter keys to API-expected keys
    const mapped = {};
    Object.entries(selectedFilters).forEach(([key, value]) => {
      if (key === 'customer') mapped['customerId'] = value;
      else if (key === 'product') mapped['productId'] = value;
      else mapped[key] = value;
    });
    onApply(mapped);
    onClose();
  };

  if (!shouldRender) return null;
  const root = getModalRoot();
  if (!root) return null;

  const hasAnyFilters = Object.keys(selectedFilters).length > 0;

  return createPortal(
    <div className="app-modal-layer" role="presentation">
      <button
        type="button"
        className={`app-modal-backdrop ${isAnimatingOut ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}`}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-modal-panel bg-[#f8f9fc] shadow-2xl rounded-xl border border-grey-border ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-[700px] w-full max-h-[85vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0">
          <h2 id={titleId} className="text-xl font-extrabold text-grey-text-strong">Filter orders</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleClearAll}
              disabled={!hasAnyFilters}
              className={clsx("text-sm font-bold transition-colors", hasAnyFilters ? "text-grey-text-light hover:text-grey-text-strong" : "text-grey-border-strong cursor-not-allowed")}
            >
              Clear all
            </button>
            <Button variant="ghost" size="square" className="!w-8 !h-8 text-grey-muted hover:text-grey-text-strong" icon={() => <X size={20} />} onClick={onClose} />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 h-[500px] min-h-0 overflow-hidden px-2 pb-2">
          
          {/* Left Sidebar (Categories) */}
          <div className="w-[180px] shrink-0 flex flex-col gap-1 p-2 overflow-y-auto">
            {CATEGORIES.map(cat => {
              const isActive = activeTab === cat.id;
              const count = getCategoryCount(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={clsx(
                    "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all text-left",
                    isActive ? "bg-primary text-white shadow-md shadow-primary/20" : "text-grey-text hover:bg-grey-surface"
                  )}
                >
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span className={clsx(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      isActive ? "bg-white/20 text-white" : "bg-primary text-white"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Content (Options) */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-grey-surface flex flex-col overflow-hidden mx-2 mb-2 relative">
            <div className="px-6 py-4 border-b border-grey-bg shrink-0">
              <h3 className="font-bold text-grey-text-strong">{CATEGORIES.find(c => c.id === activeTab)?.label}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'orderDate' || activeTab === 'dueDate' ? (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-grey-muted mb-1.5">From</label>
                    <Input 
                      type="date" 
                      value={selectedFilters[activeTab]?.from || ''} 
                      onChange={e => handleRangeChange(activeTab, 'from', e.target.value)} 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-grey-muted mb-1.5">To</label>
                    <Input 
                      type="date" 
                      value={selectedFilters[activeTab]?.to || ''} 
                      onChange={e => handleRangeChange(activeTab, 'to', e.target.value)} 
                    />
                  </div>
                </div>
              ) : activeTab === 'quantity' ? (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-grey-muted mb-1.5">Min</label>
                    <Input 
                      type="number" 
                      placeholder="0"
                      value={selectedFilters[activeTab]?.min || ''} 
                      onChange={e => handleRangeChange(activeTab, 'min', e.target.value)} 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-grey-muted mb-1.5">Max</label>
                    <Input 
                      type="number" 
                      placeholder="Any"
                      value={selectedFilters[activeTab]?.max || ''} 
                      onChange={e => handleRangeChange(activeTab, 'max', e.target.value)} 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1 flex flex-col h-full">
                  {(activeTab === 'orderNumber' || activeTab === 'product' || activeTab === 'customer') && (
                    <div className="px-1 pb-3 shrink-0">
                      <Input 
                        startIcon={Search} 
                        placeholder="Search..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="!text-sm"
                      />
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {(!filterOptions || isSearching) ? (
                      // Skeleton Loading State
                      Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-xl bg-grey-bg border border-grey-surface"></div>
                            <div className="w-32 h-4 bg-grey-bg rounded"></div>
                          </div>
                        </div>
                      ))
                    ) : displayOptions.length > 0 ? (
                      // Loaded Options
                      displayOptions.map((opt, i) => {
                        const isSelected = (selectedFilters[activeTab] || []).includes(opt.val);
                        return (
                          <label 
                            key={i} 
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-grey-bg cursor-pointer transition-colors group"
                          >
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={isSelected} 
                              onChange={() => handleToggleValue(opt.val)} 
                            />
                            <div className="flex items-center gap-3">
                              <div className={clsx(
                                "w-5 h-5 rounded-xl border flex items-center justify-center transition-colors shrink-0",
                                isSelected ? "bg-primary border-primary text-white" : "border-grey-border-strong bg-white group-hover:border-grey-icon"
                              )}>
                                {isSelected && <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <span className="text-sm font-semibold text-grey-text-dark break-all">{opt.label}</span>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      // Empty State
                      <div className="py-10 text-center text-sm font-medium text-grey-icon">
                        No options available
                      </div>
                    )}
                    
                    {/* Info message for limit */}
                    {!searchQuery && (activeTab === 'orderNumber' || activeTab === 'product' || activeTab === 'customer') && (
                      <div className="text-xs text-center text-grey-muted pt-2 pb-1">
                        Showing top results. Use search to find more.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Gradient overlay to indicate scrolling */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end shrink-0 bg-white border-t border-grey-surface rounded-b-md">
          <Button 
            variant="primary" 
            text="Done" 
            className="w-32 !py-2.5 !h-auto text-base"
            onClick={handleDone} 
          />
        </div>

      </div>
    </div>,
    root
  );
}
