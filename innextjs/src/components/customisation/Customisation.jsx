import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Plus, X, Pencil, Search, Package, Settings2, Tags, Trash2, MoreVertical, ArrowLeft, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import CommonTable from '@/common/table/CommonTable';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';

import { PRODUCT_MODELS, CUSTOMISATION_SPECS, MODEL_OPTION_KEYS, MODEL_CATEGORIES } from '@/common/dummy';
import AddCustomer from '../customers/modal/AddCustomer';
import AddBrandModal from './modal/AddBrandModal';
import { getCustomersApi, deleteBrandApi, getBrandsByCustomerIdApi, getBrandsApi, getStickersByBrandIdApi, createStickerApi, deleteStickerApi, getCustomisationsApi, getCustomisationKpisApi, deleteProductApi, getCategoriesApi } from '@/lib/fetcher';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';
import DeleteModal from '@/common/modal/DeleteModal';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';


const TABLE_SPEC_KEYS = ['body_design', 'body_color', 'brand_name', 'panel_sticker', 'accessories', 'packing'];
const FIXED_CUSTOMISE_OPTIONS = ['Standard', 'Customise'];
const MAX_VISIBLE_OPTIONS = 3;
const MODEL_OPTION_KEY_SET = new Set(MODEL_OPTION_KEYS);

const toneBar = { neutral: 'bg-grey-text-light', info: 'bg-primary', warning: 'bg-warning-dark', success: 'bg-success-dark' };



function cloneSpecs(specs) {
  return specs.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined }));
}

function isModelConfigured(model) {
  return MODEL_OPTION_KEYS.every((key) => { const f = model.specs.find((s) => s.key === key); return (f?.options?.length ?? 0) > 0; });
}
function modelInitials(code) {
  return ((code || 'NA').split('-')[0] || 'NA').slice(0, 2).toUpperCase();
}
function blankSpecsFromTemplate() {
  return CUSTOMISATION_SPECS.map((f) => ({ ...f, options: f.options ? [...f.options] : [] }));
}


function formatProductModel(fm) {
  const baseModel = PRODUCT_MODELS[0] || {};
  const dynamicSpecs = JSON.parse(JSON.stringify(baseModel.specs || []));
  
  const bodyDesignSpec = dynamicSpecs.find(s => s.key === 'body_design');
  if (bodyDesignSpec && fm.bodyDesigns) {
      bodyDesignSpec.options = fm.bodyDesigns.map(bd => bd.name);
  }
  
  const bodyColorSpec = dynamicSpecs.find(s => s.key === 'body_color');
  if (bodyColorSpec && fm.colours) {
      bodyColorSpec.options = fm.colours.map(c => c.name);
  }

  return {
      ...baseModel, 
      ...fm,
      category: typeof fm.category === 'object' && fm.category !== null ? fm.category.name : fm.category,
      specs: dynamicSpecs
  };
}


function OptionsCell({ field }) {
  const options = field.options ?? [];
  if (options.length === 0) return <span className="text-grey-icon">—</span>;
  const overflow = options.length - MAX_VISIBLE_OPTIONS;
  const visible = options.slice(0, MAX_VISIBLE_OPTIONS);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.slice(0, -1).map((opt) => (
        <span key={opt} className="inline-flex rounded-md border border-grey-border/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-grey-text-dark whitespace-nowrap">{opt}</span>
      ))}
      <div className="flex items-center gap-1.5 flex-nowrap">
        {visible.length > 0 && (
          <span className="inline-flex rounded-md border border-grey-border/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-grey-text-dark whitespace-nowrap">
            {visible[visible.length - 1]}
          </span>
        )}
        {overflow > 0 && (
          <span className="relative inline-block">
            <span className="peer inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary-dark cursor-help whitespace-nowrap">+{overflow}</span>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 opacity-0 transition-opacity peer-hover:opacity-100 whitespace-nowrap rounded-md bg-grey-text-strong px-2 py-1.5 text-xs text-white shadow-lg">
              {options.slice(MAX_VISIBLE_OPTIONS).join(', ')}
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink-900"></div>
            </div>
          </span>
        )}
      </div>
    </div>
  );
}

function LinkedSpecCell({ label, detail }) {
  return (
    <div className="min-w-[150px] max-w-[200px]">
      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary-dark whitespace-nowrap">{label}</span>
      <p className="mt-1 text-xs text-grey-icon leading-snug">{detail}</p>
    </div>
  );
}

function ChipRemoveButton({ onClick }) {
  return (
    <Button variant="ghost" size="sm"
      className="!min-h-0 !h-4 !w-4 !min-w-0 !p-0 shrink-0 rounded-md text-grey-icon hover:text-grey-text-dark"
      onClick={onClick}
      icon={() => <X className="h-3 w-3" />}
    />
  );
}

function StickerEditor({ brand, onChange, canCreate, canDelete }) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOption = async () => {
    const value = draft.trim();
    if (!value) return;
    if (brand.panelStickers.some((v) => v.name.toLowerCase() === value.toLowerCase())) { setLocalError('Option already exists.'); return; }

    setIsSubmitting(true);
    try {
      const res = await createStickerApi({ name: value, brand_id: brand.id });
      if (res.data && res.data.success) {
        onChange([...brand.panelStickers, res.data.data]);
        setDraft('');
        setLocalError(null);
        toast.success('Sticker added');
      } else {
        setLocalError(res.data?.message || 'Failed to add sticker');
      }
    } catch (error) {
      setLocalError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeOption = async (sticker) => {
    if (sticker.id.startsWith('temp-')) {
      onChange(brand.panelStickers.filter((v) => v.id !== sticker.id));
      return;
    }

    try {
      const res = await deleteStickerApi(sticker.id);
      if (res.data && res.data.success) {
        onChange(brand.panelStickers.filter((v) => v.id !== sticker.id));
        setLocalError(null);
        toast.success('Sticker deleted');
      } else {
        toast.error(res.data?.message || 'Failed to delete sticker');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };

  const onKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label className="text-2xs font-semibold uppercase tracking-wide text-grey-muted">Panel stickers · {brand.name}</label>
        <span className="text-2xs tabular-nums text-grey-icon">{brand.stickerCount ?? brand.panelStickers.length} option{(brand.stickerCount ?? brand.panelStickers.length) === 1 ? '' : 's'}</span>
      </div>
      {!brand.stickersFetched ? (
        <div className="flex flex-col h-full space-y-2 mt-2">
          <div className="flex gap-1">
            <div className="h-6 w-16 animate-pulse rounded bg-grey-border/60"></div>
            <div className="h-6 w-16 animate-pulse rounded bg-grey-border/60"></div>
          </div>
        </div>
      ) : brand.panelStickers.length > 0 ? (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {brand.panelStickers.map((opt) => (
            <span key={opt.id} className="inline-flex max-w-full items-center gap-1 rounded-md border border-grey-border/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-grey-text-dark">
              <span className="truncate">{opt.name}</span>
              {canDelete && <ChipRemoveButton onClick={() => removeOption(opt)} />}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-2xs text-grey-icon mb-1.5 mt-1">Add at least one panel sticker for this brand.</p>
      )}
      {canCreate && (
        <div className="flex gap-1.5 mt-auto">
          <Input type="text" value={draft}
            onChange={(e) => { setDraft(e.target.value); if (localError) setLocalError(null); }}
            onKeyDown={onKeyDown} placeholder="Type option, press Enter" disabled={isSubmitting}
            className="flex-1 min-w-0 [&_input]:!h-8 [&_input]:!min-h-0" />
          <Button variant="secondary" size="sm" className="shrink-0 px-2.5 !min-h-8" onClick={addOption} disabled={!draft.trim() || isSubmitting} icon={Plus} />
        </div>
      )}
      {localError && <p className="mt-1 text-2xs text-danger-dark">{localError}</p>}
    </div>
  );
}


export default function Customisation() {
  const router = useRouter();
  const { canCreate: canCreateCustomer } = usePermission('customers');
  const { canCreate: canCreateProduct } = usePermission('products');
  const { canCreate: canCreateCustomisation, canUpdate: canUpdateCustomisation, canDelete: canDeleteCustomisation } = usePermission('customisation');
  // ── Data state ──
  const [models, setModels] = useState([]);
  const [kpiData, setKpiData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [currentBrands, setCurrentBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchedCustomerId, setLastFetchedCustomerId] = useState(null);

  // ── Customer brands state ──
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [activeBrandId, setActiveBrandId] = useState(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [focusPane, setFocusPane] = useState('brands');
  const brandsPaneRef = useRef(null);
  const stickersPaneRef = useRef(null);

  const isFetchingBrands = customerId !== lastFetchedCustomerId;

  // ── Product models state ──
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState({ label: 'All categories', value: 'ALL' });
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [dropdownState, setDropdownState] = useState(null);

  useEffect(() => {
    const closeDropdown = () => setDropdownState(null);
    if (dropdownState) {
      window.addEventListener('click', closeDropdown);
    }
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownState]);

  useEffect(() => {
    const fetchModels = async () => {
       setIsLoading(true);
       try {
         const res = await getCustomisationsApi(pageNo, pageSize, query, categoryFilter?.value || 'ALL');
         if (res.data && res.data.success) {
            const fetchedModels = res.data.data.data || [];
            const mergedModels = fetchedModels.map(formatProductModel);
            setModels(mergedModels);
            setTotalItems(res.data.data.pagination?.totalItems || 0);
            setTotalPages(res.data.data.pagination?.totalPages || 1);
         }
       } catch (error) {
         console.error("Error fetching customisation models", error);
       } finally {
         setIsLoading(false);
       }
    };
    fetchModels();
  }, [query, categoryFilter, pageNo, pageSize]);
  
  const loadCategories = async (input) => {
    try {
      const response = await getCategoriesApi(1, 10, input, 'ACTIVE');
      if (response.data && response.data.success) {
        const options = response.data.data.data.map(c => ({ label: c.name, value: c.id }));
        return [{ label: 'All categories', value: 'ALL' }, ...options];
      }
    } catch (error) {
      console.error('Failed to load categories', error);
    }
    return [];
  };

  useEffect(() => {
    const fetchKpis = async () => {
       try {
         const res = await getCustomisationKpisApi();
         if (res.data && res.data.success) {
            setKpiData(res.data.data);
         }
       } catch (error) {
         console.error("Error fetching customisation kpis", error);
       }
    };
    fetchKpis();
  }, []);

  // ── KPI computations ──
  const configuredCount = useMemo(() => models.filter(isModelConfigured).length, [models]);
  const totalBrands = useMemo(() => customers.reduce((sum, c) => sum + (typeof c.brands === 'number' ? c.brands : 0), 0), [customers]);
  const totalStickers = useMemo(() => currentBrands.reduce((s, b) => s + (b.stickerCount ?? b.panelStickers?.length ?? 0), 0), [currentBrands]);
  const kpis = [
    { label: 'Total products', value: kpiData?.totalProducts ?? (isLoading ? '...' : String(models.length)), hint: 'Models in catalog', tone: 'neutral' },
    { label: 'Configured products', value: kpiData?.configuredProducts ?? (isLoading ? '...' : String(configuredCount)), hint: 'With design & color options', tone: 'info' },
    { label: 'Customer brands', value: kpiData?.customerBrands ?? (isLoading ? '...' : String(totalBrands)), hint: `Across ${customers.length} customers`, tone: 'neutral' },
    { label: 'Panel stickers', value: kpiData?.panelStickers ?? (isLoading ? '...' : String(totalStickers)), hint: 'Options linked to brands', tone: 'warning' },
  ];

  // ── Customer brands logic ──
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const res = await getCustomersApi(1, 100);
        if (res.data && res.data.success) {
          const fetchedCustomers = res.data.data.data || [];
          setCustomers(fetchedCustomers);
          if (fetchedCustomers.length > 0) {
            setCustomerId('ALL');
          }
        }
      } catch (error) {
        toast.error('Failed to load customers');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (!customerId) {
      setLastFetchedCustomerId('');
      return;
    }

    let cancelled = false;

    if (customerId === 'ALL') {
      getBrandsApi(1, 100).then(res => {
        if (cancelled) return;
        if (res.data && res.data.success) {
          const fetchedBrands = res.data.data.data || [];
          setCurrentBrands(fetchedBrands.map(b => ({
            ...b,
            name: b.brandname,
            panelStickers: Array.isArray(b.stickers) ? b.stickers : [],
            stickerCount: typeof b.stickers === 'number' ? b.stickers : (Array.isArray(b.stickers) ? b.stickers.length : 0),
            stickersFetched: Array.isArray(b.stickers)
          })));
        }
        setLastFetchedCustomerId(customerId);
      }).catch(err => {
        if (!cancelled) console.error("Error fetching all brands", err);
        setLastFetchedCustomerId(customerId);
      });
    } else {
      getBrandsByCustomerIdApi(customerId).then(res => {
        if (cancelled) return;
        if (res.data && res.data.success) {
          setCurrentBrands(res.data.data.map(b => ({
            ...b,
            name: b.brandname,
            panelStickers: Array.isArray(b.stickers) ? b.stickers : [],
            stickerCount: typeof b.stickers === 'number' ? b.stickers : (Array.isArray(b.stickers) ? b.stickers.length : 0),
            stickersFetched: Array.isArray(b.stickers)
          })));
        }
        setLastFetchedCustomerId(customerId);
      }).catch(err => {
        if (!cancelled) console.error("Error fetching brands by customer", err);
        setLastFetchedCustomerId(customerId);
      });
    }

    return () => { cancelled = true; };
  }, [customerId]);

  useEffect(() => {
    if (!activeBrandId) return;
    const activeBrand = currentBrands.find(b => b.id === activeBrandId);
    if (activeBrand && !activeBrand.stickersFetched) {
      getStickersByBrandIdApi(activeBrandId).then(res => {
        if (res.data && res.data.success) {
          setCurrentBrands(prev => prev.map(b => b.id === activeBrandId ? {
            ...b,
            panelStickers: res.data.data,
            stickerCount: res.data.data.length,
            stickersFetched: true
          } : b));
        }
      }).catch(err => console.error("Error fetching stickers for brand", err));
    }
  }, [activeBrandId, currentBrands]);

  const customer = customers.find((c) => c.id === customerId) ?? customers[0];

  useEffect(() => {
    if (currentBrands.length === 0) { setActiveBrandId(null); return; }
    if (!currentBrands.some((b) => b.id === activeBrandId)) setActiveBrandId(currentBrands[0]?.id ?? null);
  }, [currentBrands, activeBrandId]);

  const activeBrand = currentBrands.find((b) => b.id === activeBrandId) ?? currentBrands[0];

  const removeBrand = (brandId) => {
    const brand = currentBrands.find((b) => b.id === brandId);
    if (brand && brand.customer_id) {
      setCustomers(prev => prev.map(c => c.id === brand.customer_id ? { ...c, brands: Math.max(0, (typeof c.brands === 'number' ? c.brands : 0) - 1) } : c));
    }
    setCurrentBrands(prev => prev.filter((b) => b.id !== brandId));
  };
  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    try {
      if (brandToDelete.id.startsWith('b-')) {
        removeBrand(brandToDelete.id);
        setBrandToDelete(null);
        return;
      }

      const res = await deleteBrandApi(brandToDelete.id);
      if (res.error || (res.data && !res.data.success)) {
        toast.error(res.error?.message || res.data?.message || 'Failed to delete brand');
      } else {
        removeBrand(brandToDelete.id);
        toast.success('Brand deleted successfully');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setBrandToDelete(null);
    }
  };
  const setPanelStickers = (next) => {
    if (!activeBrand) return;
    setCurrentBrands(prev => prev.map((b) => b.id === activeBrand.id ? { ...b, panelStickers: next, stickerCount: next.length } : b));
  };

  const focusStickersInput = useCallback(() => {
    setFocusPane('stickers');
    requestAnimationFrame(() => { stickersPaneRef.current?.querySelector('input:not([disabled])')?.focus(); });
  }, []);
  const focusBrandsPane = useCallback(() => {
    setFocusPane('brands');
    requestAnimationFrame(() => {
      const idx = Math.max(0, currentBrands.findIndex((b) => b.id === activeBrandId));
      const buttons = brandsPaneRef.current?.querySelectorAll('[data-brand-select]');
      (buttons?.[idx] ?? buttons?.[0])?.focus() || brandsPaneRef.current?.focus();
    });
  }, [currentBrands, activeBrandId]);
  const moveBrandHighlight = useCallback((delta) => {
    if (currentBrands.length === 0) return;
    const current = currentBrands.findIndex((b) => b.id === activeBrandId);
    const next = Math.max(0, Math.min(currentBrands.length - 1, (current < 0 ? 0 : current) + delta));
    setActiveBrandId(currentBrands[next].id);
    setFocusPane('brands');
    requestAnimationFrame(() => { brandsPaneRef.current?.querySelectorAll('[data-brand-select]')?.[next]?.focus(); });
  }, [currentBrands, activeBrandId]);

  // Focus tracking
  useEffect(() => {
    const updateFocus = (e) => {
      const target = e.target;
      if (target.closest('[data-pane="stickers"]')) setFocusPane('stickers');
      else if (target.closest('#brands-panel')) setFocusPane('brands');
      else if (target.closest('#product-models-section')) setFocusPane('table');
    };
    document.addEventListener('mousedown', updateFocus);
    document.addEventListener('focusin', updateFocus);
    return () => {
      document.removeEventListener('mousedown', updateFocus);
      document.removeEventListener('focusin', updateFocus);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      
      // Shortcuts to switch panes
      if (e.altKey) {
        if (e.code === 'KeyB') { e.preventDefault(); e.stopPropagation(); focusBrandsPane(); return; }
        if (e.code === 'KeyS') { e.preventDefault(); e.stopPropagation(); focusStickersInput(); return; }
        if (e.code === 'KeyT') { e.preventDefault(); e.stopPropagation(); setFocusPane('table'); document.getElementById('customisation-search')?.focus(); return; }

        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { 
          const isProductModelsFocused = document.activeElement?.closest('#product-models-section');
          const isInputActive = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
          
          if (isProductModelsFocused && isInputActive) {
            e.preventDefault(); e.stopPropagation();
            const focusable = Array.from(isProductModelsFocused.querySelectorAll('input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled && el.type !== 'hidden' && el.offsetParent !== null);
            const currentIndex = focusable.indexOf(document.activeElement);
            if (e.code === 'ArrowRight') {
               const next = currentIndex === -1 ? 0 : (currentIndex + 1) % focusable.length;
               focusable[next]?.focus();
            } else {
               const prev = currentIndex === -1 ? focusable.length - 1 : (currentIndex - 1 + focusable.length) % focusable.length;
               focusable[prev]?.focus();
            }
            return;
          }

          if (focusPane === 'brands') {
              e.preventDefault(); e.stopPropagation();
              if (e.code === 'ArrowRight') focusStickersInput();
              else { setFocusPane('table'); document.getElementById('customisation-search')?.focus(); }
              return;
          } else if (focusPane === 'stickers') {
              e.preventDefault(); e.stopPropagation();
              if (e.code === 'ArrowLeft') focusBrandsPane();
              else { setFocusPane('table'); document.getElementById('customisation-search')?.focus(); }
              return;
          }
          
          // If focusPane === 'table' and not in an input, let it bubble for pagination!
          return; 
        }
        return;
      }
      
      const target = e.target;
      if (target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.closest('[data-add-brand]') || target?.closest('[data-remove-brand]')) return;

      if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
         if (focusPane === 'brands') { 
             e.preventDefault(); e.stopPropagation(); 
             moveBrandHighlight(e.code === 'ArrowDown' ? 1 : -1); 
             return; 
         }
         // If table or stickers, let it bubble (useKeyboardShortcuts will handle table navigation)
         return;
      }
      
      if (e.code === 'Enter' && focusPane === 'brands') { 
         if (!activeBrandId && !currentBrands.length) return; 
         e.preventDefault(); e.stopPropagation(); 
         focusStickersInput(); 
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [focusPane, focusBrandsPane, focusStickersInput, moveBrandHighlight, activeBrandId, currentBrands.length]);

  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  useKeyboardShortcuts({
      onAdd: canCreateProduct ? () => router.push('/inventory/product/create') : undefined,
      searchId: "customisation-search",
      setPageNo,
      pageNo,
      totalPages,
      items: models,
      selectedRowIndex,
      setSelectedRowIndex,
      isModalOpen: addCustomerOpen || addBrandOpen || !!brandToDelete,
  });

  const handleAddCustomer = (c) => { setCustomers([...customers, { ...c, brands: 0 }]); setCustomerId(c.id); setActiveBrandId(null); setAddCustomerOpen(false); };
  const handleAddBrand = (targetId, brand) => {
    setCustomers(prev => prev.map(c => c.id === targetId ? { ...c, brands: (typeof c.brands === 'number' ? c.brands : 0) + 1 } : c));
    if (customerId === 'ALL' || customerId === targetId) {
      setCurrentBrands(prev => [...prev, { ...brand, name: brand.brandname, panelStickers: brand.stickers || [], stickerCount: brand.stickers?.length || 0, stickersFetched: true }]);
    }
    setCustomerId(targetId); setActiveBrandId(brand.id); setAddBrandOpen(false); focusStickersInput();
  };

  // ── Product models logic ──

  const renderSpecCell = (model, field) => {
    if (field.key === 'brand_name') return <LinkedSpecCell label="Per customer" detail="Brands assigned on the customer account" />;
    if (field.key === 'panel_sticker') return <LinkedSpecCell label="Per brand" detail="Stickers follow the selected brand" />;
    return <OptionsCell field={model.specs.find((s) => s.key === field.key) ?? field} />;
  };

  // ── CommonTable columns for product models ──
  const tableColumns = useMemo(() => {
    const specFields = TABLE_SPEC_KEYS.map((key) => CUSTOMISATION_SPECS.find((f) => f.key === key)).filter(Boolean);
    return [
      {
        key: 'model',
        label: 'Product',
        render: (row) => (
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-2xs font-bold text-primary-dark">{modelInitials(row.code)}</span>
            <div className="min-w-0 max-w-[200px]">
              <p className="font-semibold text-grey-text-strong truncate" title={row.name}>{row.name}</p>
              <p className="font-mono text-2xs text-grey-muted truncate">{row.code} · {row.category}</p>
            </div>
          </div>
        ),
      },
      ...specFields.map((field) => ({
        key: field.key,
        label: field.label,
        render: (row) => renderSpecCell(row, field),
      })),
      {
        key: 'created_by',
        label: 'CREATED BY',
        render: (row) => (
          <div>
            <p className="font-semibold text-grey-text-strong">{row.created_by?.name || 'admin'}</p>
            <p className="text-2xs text-grey-muted">{row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '19 Sept 2026'}</p>
          </div>
        ),
      },
      {
        key: 'updated_by',
        label: 'UPDATED BY',
        render: (row) => (
          <div>
            <p className="font-semibold text-grey-text-strong">{row.updated_by?.name || 'admin'}</p>
            <p className="text-2xs text-grey-muted">{row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '19 Sept 2026'}</p>
          </div>
        ),
      },
    ];


   
  }, [models, canUpdateCustomisation, canDeleteCustomisation]);


  return (
    <>
      <Head>
        <title>Customisation | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-4">

        {/* ─── Page Header ─── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">Customisation</h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">Customer brands, panel stickers, and product model options for order specs.</p>
          </div>
          {canCreateProduct && (
            <Button variant="primary" className="w-full sm:w-auto shrink-0" icon={Plus} text="Add Product" onClick={() => router.push('/inventory/product/create')} />
          )}
        </div>

        {/* ─── KPIs ─── */}
        <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Customisation KPIs">
          {kpis.map((kpi) => (
            <article key={kpi.label} className="card-panel relative overflow-hidden !p-3 border-none">
              <div className={clsx('absolute inset-y-0 left-0 w-1', toneBar[kpi.tone])} aria-hidden />
              <p className="pl-2 text-2xs font-semibold uppercase tracking-wide text-grey-muted">{kpi.label}</p>
              <p className="mt-1 pl-2 font-mono text-xl font-semibold tabular-nums text-grey-text-strong sm:text-2xl">{kpi.value}</p>
              {kpi.hint && <p className="mt-1 pl-2 text-xs text-grey-muted">{kpi.hint}</p>}
            </article>
          ))}
        </section>

        {/* ─── Customer Brands Panel ─── */}
        <div id="brands-panel" className="card-panel !p-3 space-y-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-sm font-bold text-grey-text-strong">Customer brands</h2>
                <span className="inline-flex flex-wrap items-center gap-1 text-2xs text-grey-icon" aria-label="Keyboard shortcuts">
                  <kbd className="px-1 py-0.5 border border-grey-border rounded-md text-grey-muted bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">↑</kbd>
                  <kbd className="px-1 py-0.5 border border-grey-border rounded-md text-grey-muted bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">↓</kbd>
                  <span>Move</span>
                  <span className="text-grey-border-strong">·</span>
                  <kbd className="px-1 py-0.5 border border-grey-border rounded-md text-grey-muted bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">Enter</kbd>
                  <span>Select</span>
                  <span className="text-grey-border-strong">·</span>
                  <kbd className="px-1 py-0.5 border border-grey-border rounded-md text-grey-muted bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">Alt</kbd>
                  <kbd className="px-1 py-0.5 border border-grey-border rounded-md text-grey-muted bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">←</kbd>
                  <kbd className="px-1 py-0.5 border border-grey-border rounded-md text-grey-muted bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">→</kbd>
                  <span>Panes</span>
                </span>
              </div>
              <p className="mt-0.5 text-2xs text-grey-muted">Brands per customer · panel stickers per brand</p>
            </div>
            <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-end">
              <Input type="select" label="Customer" className="w-full sm:w-56 [&_select]:!h-9"
                value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                hidePlaceholder={true}
                options={[{ label: `All customers (${totalBrands} brands)`, value: 'ALL' }, ...customers.map((c) => ({ label: `${c.name} (${typeof c.brands === 'number' ? c.brands : 0} brand${(typeof c.brands === 'number' ? c.brands : 0) === 1 ? '' : 's'})`, value: c.id }))]} />
            {canCreateCustomer && (
                <Button variant="secondary" className="!min-h-9 shrink-0 !h-9" icon={Plus} text="Add customer" onClick={() => setAddCustomerOpen(true)} />
              )}
            </div>
          </div>

          {(customers.length > 0 || isLoading) && (
            <div className="grid gap-2 lg:grid-cols-2">
              {/* Brands pane */}
              <div ref={brandsPaneRef} tabIndex={-1} data-pane="brands" aria-label="Brand names"
                className={clsx('flex flex-col rounded-md border p-2 outline-none transition-colors', focusPane === 'brands' ? 'border-primary/35 bg-primary/5 ring-1 ring-primary/20' : 'border-grey-border/60 bg-grey-bg/30')}
                onFocusCapture={() => setFocusPane('brands')}>
                <div className="mb-1 flex items-baseline justify-between gap-2 shrink-0">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-grey-muted">Brand names</p>
                  <span className="text-2xs tabular-nums text-grey-icon">{customerId === 'ALL' ? totalBrands : customer?.brands?.length || 0}</span>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  {isLoading || isFetchingBrands ? (
                    <ul className="mb-1.5 space-y-1.5 max-h-[148px] overflow-hidden pr-1">
                      {[1, 2, 3].map((i) => (
                        <li key={i} className="flex items-center gap-1 rounded-md px-1.5 py-1.5 border border-transparent">
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 w-1/2 animate-pulse rounded bg-grey-border/60"></div>
                            <div className="h-2.5 w-1/3 animate-pulse rounded bg-grey-surface/50"></div>
                          </div>
                          <div className="h-6 w-6 animate-pulse rounded bg-grey-surface/50"></div>
                        </li>
                      ))}
                    </ul>
                  ) : currentBrands.length === 0 ? (
                    <p className="mb-1.5 text-2xs text-grey-icon">No brands yet.</p>
                  ) : (
                    <ul className="mb-1.5 space-y-0.5 max-h-[148px] overflow-y-auto pr-1 custom-scrollbar" role="listbox" aria-activedescendant={activeBrand ? `brand-option-${activeBrand.id}` : undefined}>
                      {currentBrands.map((brand) => {
                        const active = brand.id === activeBrand?.id;
                        return (
                          <li key={brand.id} id={`brand-option-${brand.id}`} role="option" aria-selected={active}>
                            <div className={clsx('flex items-center gap-1 rounded-md px-1.5 py-1', active ? 'border border-primary/30 bg-white' : 'border border-transparent hover:bg-white/80')}>
                              <button type="button" data-brand-select className="min-w-0 flex-1 text-left cursor-pointer"
                                onClick={() => { setActiveBrandId(brand.id); setFocusPane('brands'); }}
                                onDoubleClick={() => { setActiveBrandId(brand.id); focusStickersInput(); }}>
                                <span className="block truncate text-sm font-semibold text-grey-text-strong">{brand.name}</span>
                                <span className="block text-2xs text-grey-muted">{brand.stickerCount ?? brand.panelStickers.length} sticker{(brand.stickerCount ?? brand.panelStickers.length) === 1 ? '' : 's'}</span>
                              </button>
                              {canDeleteCustomisation && (
                                <Button variant="ghost" size="square" data-remove-brand
                                  className="!h-7 !w-7 shrink-0 text-grey-icon hover:text-grey-text-dark"
                                  aria-label={`Remove brand ${brand.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setBrandToDelete(brand);
                                  }}
                                  icon={() => <X className="h-3.5 w-3.5" />}
                                />
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {canCreateCustomisation && (
                    <Button variant="secondary" size="sm" data-add-brand className="!min-h-8 w-full !text-xs !h-8 shrink-0 mt-auto" icon={Plus} text="Add brand" onClick={() => setAddBrandOpen(true)} disabled={isLoading || isFetchingBrands} />
                  )}
                </div>
              </div>

              {/* Stickers pane */}
              <div ref={stickersPaneRef} tabIndex={-1} data-pane="stickers" aria-label="Panel stickers"
                className={clsx('rounded-md border p-2 outline-none transition-colors', focusPane === 'stickers' ? 'border-primary/35 bg-primary/5 ring-1 ring-primary/20' : 'border-grey-border/60 bg-grey-bg/30')}
                onFocusCapture={() => setFocusPane('stickers')}>
                {isLoading || isFetchingBrands ? (
                  <div className="flex flex-col h-full">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-grey-border/60"></div>
                      <div className="h-3 w-10 animate-pulse rounded bg-grey-border/60"></div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 mb-1.5">
                      <div className="h-6 w-20 animate-pulse rounded bg-grey-border/60"></div>
                      <div className="h-6 w-16 animate-pulse rounded bg-grey-border/60"></div>
                    </div>
                    <div className="flex gap-1.5 mt-auto">
                      <div className="h-8 flex-1 animate-pulse rounded bg-grey-surface/50"></div>
                      <div className="h-8 w-10 animate-pulse rounded bg-grey-border/60 shrink-0"></div>
                    </div>
                  </div>
                ) : activeBrand ? <StickerEditor brand={activeBrand} onChange={setPanelStickers} canCreate={canCreateCustomisation} canDelete={canDeleteCustomisation} /> : (
                  <p className="px-1 py-4 text-center text-2xs text-grey-muted">Select or add a brand to manage panel stickers.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Product Models Section ─── */}
        <div id="product-models-section" className="flex flex-col gap-5 w-full">
          <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-grey-muted" aria-hidden />
              <h2 className="text-sm font-bold text-grey-text-strong">Product models</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input type="text" id="customisation-search" startIcon={Search} placeholder="Search product name or code…" value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 min-w-0" />
            <div className="shrink-0 sm:w-48 z-20">
              <AsyncSelectInput
                value={categoryFilter}
                onChange={(option) => setCategoryFilter(option || { label: 'All categories', value: 'ALL' })}
                defaultOptions={true}
                loadOptions={loadCategories}
                placeholder="All categories"
              />
            </div>
          </div>
          <KeyboardShortcutBar
            onAdd={canCreateProduct ? () => router.push('/inventory/product/create') : undefined}
            searchId="customisation-search"
            pageNo={pageNo}
            totalPages={totalPages}
            selectedItem={models[selectedRowIndex]}
            selectedRowIndex={selectedRowIndex}
            addLabel="Add Product"
            customActions={[
                { label: 'Panes', keyCombo: ['Alt', '←/→'], onClick: focusBrandsPane }
            ]}
          />
        </div>

        {/* ─── Product Models Table (CommonTable) ─── */}
        <CommonTable
          columns={tableColumns}
          data={models}
          isLoading={isLoading}
          emptyState="No products match your search or filter."
          pagination={{ totalItems, pageSize, pageNo, totalPages }}
          onPageChange={setPageNo}
          onPageSizeChange={setPageSize}
          selectedRowIndex={selectedRowIndex}
        />
        </div>

        {/* Mobile cards */}
        <ul className="space-y-2 lg:hidden">
          {models.map((model) => (
            <li key={model.id} className="card-panel !p-3">
              <div className="mb-3 flex items-start gap-2.5 border-b border-grey-border/40 pb-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary-dark">{modelInitials(model.code)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-grey-text-strong">{model.name}</p>
                  <p className="font-mono text-2xs text-grey-muted">{model.code} · {model.category}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary-dark">
                  <Settings2 className="h-3 w-3" aria-hidden />Configured
                </span>
              </div>
              <dl className="mb-3 grid gap-2.5 sm:grid-cols-2">
                {TABLE_SPEC_KEYS.map((key) => {
                  const field = CUSTOMISATION_SPECS.find((f) => f.key === key);
                  if (!field) return null;
                  return (
                    <div key={key}><dt className="mb-1 text-2xs font-semibold uppercase tracking-wide text-grey-icon">{field.label}</dt><dd>{renderSpecCell(model, field)}</dd></div>
                  );
                })}
              </dl>
              <div className="flex gap-2 ">
                <Button variant="secondary" className="flex-1" icon={Pencil} text="Edit" onClick={() => setEditingModel(model)} />
                <Button variant="danger" className="flex-1" icon={Trash2} text="Delete" onClick={() => setModelToDelete(model)} />
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-1 flex items-center gap-1.5 text-2xs text-grey-icon">
          <Package className="h-3.5 w-3.5" aria-hidden />
          Model options, customer brands, and brand stickers drive the Specs step when creating an order.
        </p>

        {/* ─── Modals ─── */}
        <AddCustomer open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} onAdd={handleAddCustomer} />
        <AddBrandModal open={addBrandOpen} customers={customers} initialCustomerId={customer?.id ?? ''} onClose={() => setAddBrandOpen(false)} onAdd={handleAddBrand} />
        <DeleteModal
          open={!!brandToDelete}
          onClose={() => setBrandToDelete(null)}
          onConfirm={confirmDeleteBrand}
          title="Delete brand"
          item={brandToDelete}
          itemType="brand"
        />
      </div>
    
    </>
  );
}
