import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Search, Plus, Check, X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import Input from '@/common/input/Input';
import { getProductsApi, getCategoriesApi } from '@/lib/fetcher';

export default function ModelsStep({
  lines,
  setLines,
  isActive,
  onAddLineClick,
  onUpdateLineQty,
  modalModel
}) {
  const [modelQuery, setModelQuery] = useState('');
  const [modelCategory, setModelCategory] = useState('All categories');
  const [focusedModelIndex, setFocusedModelIndex] = useState(-1);

  const modelSearchRef = useRef(null);
  const modelListRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(modelQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [modelQuery]);

  const fetchCategories = async () => {
    try {
      const res = await getCategoriesApi(1, 100);
      if (res.data?.success) {
        setCategoriesList(res.data.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    setIsProductsLoading(true);
    try {
      const categoryFilter = modelCategory === 'All categories' ? 'ALL' : modelCategory;
      const res = await getProductsApi(1, 100, debouncedQuery, 'ALL', categoryFilter);
      if (res.data?.success) {
        setProducts(res.data.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProductsLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchCategories();
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      fetchProducts();
    }
  }, [debouncedQuery, modelCategory, isActive]);

  const categories = useMemo(() => {
    return ['All categories', ...categoriesList.map(c => c.id)];
  }, [categoriesList]);

  const filteredModels = products;

  // handled in onChange

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        modelSearchRef.current?.focus();
      }

      if (!modalModel) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedModelIndex(prev => Math.min(prev + 1, filteredModels.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedModelIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && focusedModelIndex >= 0) {
          e.preventDefault();
          onAddLineClick(filteredModels[focusedModelIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, filteredModels, focusedModelIndex, modalModel, onAddLineClick]);

  useEffect(() => {
    if (focusedModelIndex >= 0 && modelListRef.current) {
      modelListRef.current.children[focusedModelIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedModelIndex]);

  const handleRemoveLine = (idx) => {
    const n = [...lines];
    n.splice(idx, 1);
    setLines(n);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start h-full">
      {/* LEFT */}
      <div className="flex-1 min-w-0 w-full lg:relative flex flex-col h-full">
        <div className="flex-1 bg-white rounded-md border border-grey-border/60 shadow-sm flex flex-col overflow-hidden lg:absolute lg:inset-0">
          <div className="px-5 pt-5 pb-3 shrink-0">
            <h2 className="text-base font-bold text-grey-text-strong">Select models</h2>
          </div>

          {/* Shortcuts */}
          <div className="px-5 pb-3 flex flex-wrap gap-4 shrink-0">
            <span className="flex items-center gap-1.5 text-xs text-grey-muted"><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">ALT</span><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">←</span> Catalog</span>
            <span className="flex items-center gap-1.5 text-xs text-grey-muted"><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">ALT</span><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">→</span> Selected</span>
            <span className="flex items-center gap-1.5 text-xs text-grey-muted"><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">ALT</span><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">S</span> Search</span>
            <span className="flex items-center gap-1.5 text-xs text-grey-muted"><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">ALT</span><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">↑↓</span> Lines</span>
            <span className="flex items-center gap-1.5 text-xs text-grey-muted"><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">+</span><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">-</span> Qty</span>
            <span className="flex items-center gap-1.5 text-xs text-grey-muted"><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">ALT</span><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">X</span> Remove</span>
          </div>

          {/* Search + Category */}
          <div className="px-5 pb-3 flex items-center gap-3 shrink-0">
            <div className="flex-1">
              <Input
                ref={modelSearchRef}
                type="text"
                startIcon={Search}
                className="!text-sm"
                placeholder="Search model name or code..."
                value={modelQuery}
                onChange={e => {
                  setModelQuery(e.target.value);
                  setFocusedModelIndex(-1);
                }}
              />
            </div>
            <div className="w-44 shrink-0">
              <Input
                type="select"
                className="!text-sm"
                value={modelCategory}
                onChange={e => {
                  setModelCategory(e.target.value);
                  setFocusedModelIndex(-1);
                }}
                options={categories.map(c => {
                  if (c === 'All categories') return { label: 'All categories', value: 'All categories' };
                  const cat = categoriesList.find(cat => cat.id === c);
                  return { label: cat ? cat.name : c, value: c };
                })}
              />
            </div>
          </div>

          {/* Model List */}
          <div ref={modelListRef} className="flex-1 overflow-y-auto border-t border-grey-surface">
            {isProductsLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={`skel-model-${idx}`} className="flex items-center gap-3 px-5 py-3.5 border-b border-grey-surface/50">
                  <div className="w-9 h-9 rounded-md bg-grey-surface animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-grey-surface rounded animate-pulse w-1/3" />
                    <div className="h-2.5 bg-grey-surface rounded animate-pulse w-1/4" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {filteredModels.map((m, idx) => {
                  const isSelected = lines.some(l => l.model.code === m.code);
                  const isFocused = focusedModelIndex === idx;
                  return (
                    <div
                      key={m.code}
                      onClick={() => onAddLineClick(m)}
                      onMouseEnter={() => setFocusedModelIndex(idx)}
                      className={clsx(
                        'flex items-center gap-3 px-5 py-3.5 cursor-pointer border-b border-grey-surface/50 transition-colors',
                        isSelected ? 'bg-primary-bg' : isFocused ? 'bg-grey-surface ring-1 ring-inset ring-grey-border-strong z-10 relative' : 'hover:bg-grey-bg/40'
                      )}
                    >
                      <div className={clsx(
                        'w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold shrink-0',
                        isSelected ? 'bg-primary text-white' : 'bg-grey-surface text-grey-text-light'
                      )}>
                        {m.code.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx('font-bold text-sm', isSelected ? 'text-primary-text' : 'text-grey-text-strong')}>{m.name}</p>
                        <p className="text-xs text-grey-muted mt-0.5 flex items-center gap-1">
                          <span className="text-[10px]">⊙</span> {m.code} · {m.category?.name || 'No Category'}
                        </p>
                      </div>
                      {isSelected && <Check size={16} className="text-primary shrink-0" />}
                    </div>
                  );
                })}
                {filteredModels.length === 0 && (
                  <div className="py-12 text-center text-grey-icon text-sm">No models found.</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* RIGHT: Selected */}
      <div className="w-full lg:w-[280px] shrink-0 h-full overflow-y-auto pb-5">
        <div className="bg-white rounded-md border border-grey-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-grey-surface">
            <span className="text-[10px] font-bold uppercase tracking-wide text-grey-icon">Selected</span>
            {lines.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-grey-muted font-medium">Qty {lines.reduce((a, b) => a + b.quantity, 0)}</span>
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{lines.length}</span>
              </div>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center text-grey-icon px-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 opacity-30 mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="font-bold text-sm text-grey-text">No models yet</p>
              <p className="text-xs mt-1 text-grey-icon">Select a model, set qty, then adjust with + / -</p>
            </div>
          ) : (
            <div className="divide-y divide-grey-surface">
              {lines.map((line, idx) => (
                <div key={line.model.code} className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-grey-icon w-4">{idx + 1}</span>
                    <div className="w-7 h-7 rounded-md bg-primary-subtle text-primary-dark text-xs font-bold flex items-center justify-center">
                      {line.model.code.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-grey-text-strong truncate">{line.model.name}</p>
                      <p className="text-[10px] text-grey-icon font-mono">{line.model.code}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveLine(idx)}
                      className="text-grey-border-strong hover:text-danger-muted transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center bg-grey-bg rounded-md overflow-hidden border border-grey-border/60">
                    <button className="w-9 h-9 flex items-center justify-center text-grey-muted hover:bg-grey-surface font-bold text-base" onClick={() => onUpdateLineQty(idx, -1)}>-</button>
                    <div className="flex-1 text-center font-bold text-sm text-grey-text-strong">{line.quantity}</div>
                    <button className="w-9 h-9 flex items-center justify-center text-grey-muted hover:bg-grey-surface font-bold text-base" onClick={() => onUpdateLineQty(idx, 1)}>+</button>
                  </div>
                  {line.quantity > (line.model.stockQuantity || 0) && (
                    <div className="mt-2 flex items-start gap-1.5 p-2 bg-warning/10 text-warning-dark rounded-md border border-warning/20">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold leading-tight">
                        In this product you have only {line.model.stockQuantity || 0} stock
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
