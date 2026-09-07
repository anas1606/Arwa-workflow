import React, { useState, useEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import clsx from 'clsx';

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
];

export default function FilterModal({ open, onClose, onApply, ordersData, initialFilters }) {
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const [activeTab, setActiveTab] = useState('orderNumber');
  const [selectedFilters, setSelectedFilters] = useState({});

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
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    const onKeyDown = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [shouldRender, onClose]);

  // Compute unique values and counts for the active tab
  const activeOptions = useMemo(() => {
    if (!ordersData) return [];
    const counts = {};
    ordersData.forEach(order => {
      let values = [];
      if (activeTab === 'orderNumber') values = [order.orderNumber];
      else if (activeTab === 'orderDate') values = [order.orderDate || 'N/A'];
      else if (activeTab === 'dueDate') values = [order.dueDate];
      else if (activeTab === 'quantity') {
        const qty = order.products?.reduce((sum, p) => sum + p.qty, 0) || 0;
        values = [qty.toString()];
      }
      else if (activeTab === 'customer') values = [order.customerName];
      else if (activeTab === 'priority') values = [order.priority];
      else if (activeTab === 'status') values = [order.status];
      else if (activeTab === 'product') {
        values = (order.products || []).map(p => p.name);
      }

      values.forEach(val => {
        if (!val) return;
        counts[val] = (counts[val] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([val, count]) => ({ val, count }))
      .sort((a, b) => a.val.localeCompare(b.val));
  }, [ordersData, activeTab]);

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
    onApply(selectedFilters);
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
        className={`app-modal-panel bg-[#f8f9fc] shadow-2xl rounded-[20px] border border-ink-200 ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-[700px] w-full max-h-[85vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0">
          <h2 id={titleId} className="text-xl font-extrabold text-ink-900">Filter orders</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleClearAll}
              disabled={!hasAnyFilters}
              className={clsx("text-sm font-bold transition-colors", hasAnyFilters ? "text-ink-600 hover:text-ink-900" : "text-ink-300 cursor-not-allowed")}
            >
              Clear all
            </button>
            <button onClick={onClose} className="text-ink-500 hover:text-ink-900 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-[400px] overflow-hidden px-2 pb-2">
          
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
                    isActive ? "bg-brand-600 text-white shadow-md shadow-brand-600/20" : "text-ink-700 hover:bg-ink-100"
                  )}
                >
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span className={clsx(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      isActive ? "bg-white/20 text-white" : "bg-brand-600 text-white"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Content (Options) */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-ink-100 flex flex-col overflow-hidden mx-2 mb-2 relative">
            <div className="px-6 py-4 border-b border-ink-50 shrink-0">
              <h3 className="font-bold text-ink-900">{CATEGORIES.find(c => c.id === activeTab)?.label}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'orderDate' || activeTab === 'dueDate' ? (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-ink-500 mb-1.5">From</label>
                    <Input 
                      type="date" 
                      value={selectedFilters[activeTab]?.from || ''} 
                      onChange={e => handleRangeChange(activeTab, 'from', e.target.value)} 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-ink-500 mb-1.5">To</label>
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
                    <label className="block text-xs font-bold text-ink-500 mb-1.5">Min</label>
                    <Input 
                      type="number" 
                      placeholder="0"
                      value={selectedFilters[activeTab]?.min || ''} 
                      onChange={e => handleRangeChange(activeTab, 'min', e.target.value)} 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-ink-500 mb-1.5">Max</label>
                    <Input 
                      type="number" 
                      placeholder="Any"
                      value={selectedFilters[activeTab]?.max || ''} 
                      onChange={e => handleRangeChange(activeTab, 'max', e.target.value)} 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {activeOptions.map((opt, i) => {
                    const isSelected = (selectedFilters[activeTab] || []).includes(opt.val);
                    return (
                      <label 
                        key={i} 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-ink-50 cursor-pointer transition-colors group"
                      >
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={isSelected} 
                          onChange={() => handleToggleValue(opt.val)} 
                        />
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                            isSelected ? "bg-brand-600 border-brand-600 text-white" : "border-ink-300 bg-white group-hover:border-ink-400"
                          )}>
                            {isSelected && <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span className="text-sm font-semibold text-ink-800">{opt.val}</span>
                        </div>
                        <span className="text-xs font-bold bg-[#f4f7fb] text-ink-500 px-2.5 py-1 rounded-md">
                          {opt.count}
                        </span>
                      </label>
                    );
                  })}
                  {activeOptions.length === 0 && (
                    <div className="py-10 text-center text-sm font-medium text-ink-400">
                      No options available
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Gradient overlay to indicate scrolling */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end shrink-0 bg-white border-t border-ink-100 rounded-b-[20px]">
          <Button 
            variant="primary" 
            text="Done" 
            className="w-32 !rounded-xl !py-2.5 !h-auto text-base"
            onClick={handleDone} 
          />
        </div>

      </div>
    </div>,
    root
  );
}
