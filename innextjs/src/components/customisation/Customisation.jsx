import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, X, Pencil, Search, Package, Settings2, Tags, Trash2, MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import CommonTable from '@/common/table/CommonTable';
import DeleteModal from '@/common/modal/DeleteModal';
import { CUSTOMERS } from '@/common/dummy';
import { PRODUCT_MODELS, CUSTOMISATION_SPECS, MODEL_OPTION_KEYS, MODEL_CATEGORIES } from '@/common/dummy';
import AddCustomisation from './modal/AddCustomisation';
import EditCustomisation from './modal/EditCustomisation';
import AddCustomer from '../customers/modal/AddCustomer';
import AddBrandModal from './modal/AddBrandModal';

/* ════════════════════════════════════════════════════════════════════
   Constants
   ════════════════════════════════════════════════════════════════════ */
const TABLE_SPEC_KEYS = ['body_design', 'body_color', 'brand_name', 'panel_sticker', 'accessories', 'packing'];
const FIXED_CUSTOMISE_OPTIONS = ['Regular', 'Customise'];
const MAX_VISIBLE_OPTIONS = 3;
const MODEL_OPTION_KEY_SET = new Set(MODEL_OPTION_KEYS);

const toneBar = { neutral: 'bg-ink-600', info: 'bg-brand-600', warning: 'bg-warning-700', success: 'bg-success-700' };

/* ════════════════════════════════════════════════════════════════════
   Utility helpers
   ════════════════════════════════════════════════════════════════════ */

function cloneSpecs(specs) {
  return specs.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined }));
}
function cloneModels(models) {
  return models.map((m) => ({ ...m, specs: cloneSpecs(m.specs) }));
}
function cloneCustomers(customers) {
  return customers.map((c) => ({ ...c, brands: c.brands.map((b) => ({ ...b, panelStickers: [...b.panelStickers] })) }));
}
function isModelConfigured(model) {
  return MODEL_OPTION_KEYS.every((key) => { const f = model.specs.find((s) => s.key === key); return (f?.options?.length ?? 0) > 0; });
}
function modelInitials(code) {
  return (code.split('-')[0] ?? code).slice(0, 2).toUpperCase();
}
function blankSpecsFromTemplate() {
  return CUSTOMISATION_SPECS.map((f) => ({ ...f, options: f.options ? [...f.options] : [] }));
}
function toFormState(model) {
  const specs = model?.specs ?? blankSpecsFromTemplate();
  const options = {};
  for (const key of MODEL_OPTION_KEYS) {
    const mf = specs.find((s) => s.key === key);
    const tf = CUSTOMISATION_SPECS.find((s) => s.key === key);
    options[key] = [...(mf?.options ?? tf?.options ?? [])];
  }
  return { name: model?.name ?? '', code: model?.code ?? '', category: model?.category ?? MODEL_CATEGORIES[0] ?? '', options };
}

/* ════════════════════════════════════════════════════════════════════
   Small presentational components
   ════════════════════════════════════════════════════════════════════ */

function ActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="p-1.5 text-ink-400 hover:text-ink-900 rounded-full hover:bg-ink-50 transition-colors">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-6 top-0 z-50 mt-1 w-32 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
          <div className="py-1">
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionsCell({ field }) {
  const options = field.options ?? [];
  if (options.length === 0) return <span className="text-ink-400">—</span>;
  const MAX_VISIBLE = 1;
  const overflow = options.length - MAX_VISIBLE;
  const visible = options.slice(0, MAX_VISIBLE);
  
  return (
    <div className="flex items-center gap-1">
      {visible.map((opt) => (
        <span key={opt} className="inline-flex rounded-md border border-ink-200/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-ink-800">{opt}</span>
      ))}
      {overflow > 0 && (
        <span className="relative inline-block">
          <span className="peer inline-flex rounded-md bg-ink-50 px-1.5 py-0.5 text-2xs font-semibold text-ink-600 cursor-help whitespace-nowrap">+{overflow} more</span>
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 opacity-0 transition-opacity peer-hover:opacity-100 whitespace-nowrap rounded-md bg-ink-900 px-2 py-1.5 text-xs text-white shadow-lg">
            {options.slice(MAX_VISIBLE).join(', ')}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink-900"></div>
          </div>
        </span>
      )}
    </div>
  );
}

function LinkedSpecCell({ label, detail }) {
  return (
    <div className="max-w-[140px]">
      <span className="inline-flex items-center gap-1 rounded-md bg-brand-600/10 px-1.5 py-0.5 text-2xs font-semibold text-brand-800 whitespace-nowrap">{label}</span>
      <p className="mt-0.5 text-2xs text-ink-400 truncate" title={detail}>{detail}</p>
    </div>
  );
}

function ChipRemoveButton({ onClick }) {
  return (
    <Button variant="ghost" size="sm"
      className="!min-h-0 !h-4 !w-4 !min-w-0 !p-0 shrink-0 rounded-md text-ink-400 hover:text-ink-800"
      onClick={onClick}
      icon={() => <X className="h-3 w-3" />}
    />
  );
}

function OptionChipsEditor({ label, values, onChange, emptyHint }) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState(null);
  const addOption = () => {
    const value = draft.trim();
    if (!value) return;
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) { setLocalError('Option already exists.'); return; }
    onChange([...values, value]); setDraft(''); setLocalError(null);
  };
  const onKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } };
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="text-xs font-semibold text-ink-700">{label}</label>
        <span className="text-2xs tabular-nums text-ink-400">{values.length} option{values.length === 1 ? '' : 's'}</span>
      </div>
      <div className="rounded-md border border-ink-200/70 bg-ink-50/40 p-2">
        {values.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {values.map((opt) => (
              <span key={opt} className="inline-flex max-w-full items-center gap-1 rounded-md border border-ink-200/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-ink-800">
                <span className="truncate">{opt}</span>
                <ChipRemoveButton onClick={() => { onChange(values.filter((v) => v !== opt)); setLocalError(null); }} />
              </span>
            ))}
          </div>
        ) : (
          <p className="text-2xs text-ink-400 mb-2">{emptyHint ?? 'No options yet — add one below.'}</p>
        )}
        <div className="flex gap-1.5">
          <Input type="text" value={draft}
            onChange={(e) => { setDraft(e.target.value); if (localError) setLocalError(null); }}
            onKeyDown={onKeyDown} placeholder="Type option, press Enter"
            className="flex-1 min-w-0 [&_input]:!h-8 [&_input]:!min-h-0" />
          <Button variant="secondary" size="sm" className="shrink-0 px-2.5 !min-h-8" onClick={addOption} disabled={!draft.trim()} icon={Plus} />
        </div>
        {localError && <p className="mt-1 text-2xs text-danger-700">{localError}</p>}
      </div>
    </div>
  );
}

function FixedCustomiseField({ label }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-700 mb-1">{label}</p>
      <div className="rounded-md border border-ink-200/70 bg-ink-50/40 p-2">
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {FIXED_CUSTOMISE_OPTIONS.map((opt) => (
            <span key={opt} className="inline-flex rounded-md border border-ink-200/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-ink-800">{opt}</span>
          ))}
        </div>
        <p className="text-2xs text-ink-500">Fixed choices. Customise opens a detail field on the order Specs step.</p>
      </div>
    </div>
  );
}

function StickerEditor({ brand, onChange }) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState(null);
  const addOption = () => {
    const value = draft.trim();
    if (!value) return;
    if (brand.panelStickers.some((v) => v.toLowerCase() === value.toLowerCase())) { setLocalError('Option already exists.'); return; }
    onChange([...brand.panelStickers, value]); setDraft(''); setLocalError(null);
  };
  const onKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } };
  return (
    <div className="flex flex-col h-full">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label className="text-2xs font-semibold uppercase tracking-wide text-ink-500">Panel stickers · {brand.name}</label>
        <span className="text-2xs tabular-nums text-ink-400">{brand.panelStickers.length} option{brand.panelStickers.length === 1 ? '' : 's'}</span>
      </div>
      {brand.panelStickers.length > 0 ? (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {brand.panelStickers.map((opt) => (
            <span key={opt} className="inline-flex max-w-full items-center gap-1 rounded-md border border-ink-200/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-ink-800">
              <span className="truncate">{opt}</span>
              <ChipRemoveButton onClick={() => { onChange(brand.panelStickers.filter((v) => v !== opt)); setLocalError(null); }} />
            </span>
          ))}
        </div>
      ) : (
        <p className="text-2xs text-ink-400 mb-1.5">Add at least one panel sticker for this brand.</p>
      )}
      <div className="flex gap-1.5 mt-auto">
        <Input type="text" value={draft}
          onChange={(e) => { setDraft(e.target.value); if (localError) setLocalError(null); }}
          onKeyDown={onKeyDown} placeholder="Type option, press Enter"
          className="flex-1 min-w-0 [&_input]:!h-8 [&_input]:!min-h-0" />
        <Button variant="secondary" size="sm" className="shrink-0 px-2.5 !min-h-8" onClick={addOption} disabled={!draft.trim()} icon={Plus} />
      </div>
      {localError && <p className="mt-1 text-2xs text-danger-700">{localError}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Modals
   ════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   Main Page Component
   ════════════════════════════════════════════════════════════════════ */

export default function Customisation() {
  // ── Data state ──
  const [models, setModels] = useState(() => cloneModels(PRODUCT_MODELS));
  const [customers, setCustomers] = useState(() => cloneCustomers(CUSTOMERS));

  // ── Customer brands state ──
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [activeBrandId, setActiveBrandId] = useState(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [focusPane, setFocusPane] = useState('brands');
  const brandsPaneRef = useRef(null);
  const stickersPaneRef = useRef(null);

  // ── Product models state ──
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [modelToDelete, setModelToDelete] = useState(null);

  // ── KPI computations ──
  const configuredCount = useMemo(() => models.filter(isModelConfigured).length, [models]);
  const totalBrands = useMemo(() => customers.reduce((sum, c) => sum + c.brands.length, 0), [customers]);
  const totalStickers = useMemo(() => customers.reduce((sum, c) => sum + c.brands.reduce((s, b) => s + b.panelStickers.length, 0), 0), [customers]);
  const kpis = [
    { label: 'Total products', value: String(models.length), hint: 'Models in catalog', tone: 'neutral' },
    { label: 'Configured products', value: String(configuredCount), hint: 'With design & color options', tone: 'info' },
    { label: 'Customer brands', value: String(totalBrands), hint: `Across ${customers.length} customers`, tone: 'neutral' },
    { label: 'Panel stickers', value: String(totalStickers), hint: 'Options linked to brands', tone: 'warning' },
  ];

  // ── Customer brands logic ──
  const customer = customers.find((c) => c.id === customerId) ?? customers[0];

  useEffect(() => {
    if (!customer) { setActiveBrandId(null); return; }
    if (!customer.brands.some((b) => b.id === activeBrandId)) setActiveBrandId(customer.brands[0]?.id ?? null);
  }, [customer, activeBrandId]);

  const activeBrand = customer?.brands.find((b) => b.id === activeBrandId) ?? customer?.brands[0];

  const updateCustomerById = (id, updater) => {
    setCustomers(customers.map((c) => (c.id === id ? updater(c) : c)));
  };
  const removeBrand = (brandId) => {
    if (!customer) return;
    updateCustomerById(customer.id, (c) => ({ ...c, brands: c.brands.filter((b) => b.id !== brandId) }));
  };
  const confirmDeleteBrand = () => { if (!brandToDelete) return; removeBrand(brandToDelete.id); setBrandToDelete(null); };
  const setPanelStickers = (next) => {
    if (!customer || !activeBrand) return;
    updateCustomerById(customer.id, (c) => ({ ...c, brands: c.brands.map((b) => b.id === activeBrand.id ? { ...b, panelStickers: next } : b) }));
  };

  const focusStickersInput = useCallback(() => {
    setFocusPane('stickers');
    requestAnimationFrame(() => { stickersPaneRef.current?.querySelector('input:not([disabled])')?.focus(); });
  }, []);
  const focusBrandsPane = useCallback(() => {
    setFocusPane('brands');
    requestAnimationFrame(() => {
      const brands = customer?.brands ?? [];
      const idx = Math.max(0, brands.findIndex((b) => b.id === activeBrandId));
      const buttons = brandsPaneRef.current?.querySelectorAll('[data-brand-select]');
      (buttons?.[idx] ?? buttons?.[0])?.focus() || brandsPaneRef.current?.focus();
    });
  }, [customer?.brands, activeBrandId]);
  const moveBrandHighlight = useCallback((delta) => {
    const brands = customer?.brands ?? [];
    if (brands.length === 0) return;
    const current = brands.findIndex((b) => b.id === activeBrandId);
    const next = Math.max(0, Math.min(brands.length - 1, (current < 0 ? 0 : current) + delta));
    setActiveBrandId(brands[next].id);
    setFocusPane('brands');
    requestAnimationFrame(() => { brandsPaneRef.current?.querySelectorAll('[data-brand-select]')?.[next]?.focus(); });
  }, [customer?.brands, activeBrandId]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (e.altKey) {
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); e.code === 'ArrowLeft' ? focusBrandsPane() : focusStickersInput(); }
        return;
      }
      const target = e.target;
      if (focusPane !== 'brands') { if (!(target && brandsPaneRef.current?.contains(target))) return; setFocusPane('brands'); }
      if (target?.closest('[data-pane="stickers"]') || target?.tagName === 'SELECT' || target?.tagName === 'TEXTAREA') return;
      if (target?.closest('[data-add-brand]') && e.code === 'Enter') return;
      if (target?.closest('[data-remove-brand]')) return;
      if (e.code === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); moveBrandHighlight(1); return; }
      if (e.code === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); moveBrandHighlight(-1); return; }
      if (e.code === 'Enter') { if (!activeBrandId && !customer?.brands.length) return; e.preventDefault(); e.stopPropagation(); focusStickersInput(); }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [focusPane, focusBrandsPane, focusStickersInput, moveBrandHighlight, activeBrandId, customer?.brands.length]);

  const handleAddCustomer = (c) => { setCustomers([...customers, c]); setCustomerId(c.id); setActiveBrandId(null); setAddCustomerOpen(false); };
  const handleAddBrand = (targetId, brand) => {
    updateCustomerById(targetId, (c) => ({ ...c, brands: [...c.brands, brand] }));
    setCustomerId(targetId); setActiveBrandId(brand.id); setAddBrandOpen(false); focusStickersInput();
  };

  // ── Product models logic ──
  const categories = useMemo(() => [...new Set(models.map((m) => m.category))].sort(), [models]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((m) => {
      const matchCat = categoryFilter === 'ALL' || m.category === categoryFilter;
      const matchQ = !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [models, query, categoryFilter]);

  const renderSpecCell = (model, field) => {
    if (field.key === 'brand_name') return <LinkedSpecCell label="Per customer" detail="Brands assigned on the customer account" />;
    if (field.key === 'panel_sticker') return <LinkedSpecCell label="Per brand" detail="Stickers follow the selected brand" />;
    return <OptionsCell field={model.specs.find((s) => s.key === field.key) ?? field} />;
  };

  const handleAddModel = (model) => { setModels([...models, model]); setAddModelOpen(false); };
  const handleEditModel = (model) => { setModels(models.map((m) => (m.id === model.id ? model : m))); setEditingModel(null); };
  const handleDeleteModel = () => { if (!modelToDelete) return; setModels(models.filter((m) => m.id !== modelToDelete.id)); setModelToDelete(null); };

  // ── CommonTable columns for product models ──
  const tableColumns = useMemo(() => {
    const specFields = TABLE_SPEC_KEYS.map((key) => CUSTOMISATION_SPECS.find((f) => f.key === key)).filter(Boolean);
    return [
      {
        key: 'model',
        label: 'Model',
        render: (row) => (
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-600/10 font-mono text-2xs font-bold text-brand-800">{modelInitials(row.code)}</span>
            <div className="min-w-0 max-w-[200px]">
              <p className="font-semibold text-ink-900 truncate" title={row.name}>{row.name}</p>
              <p className="font-mono text-2xs text-ink-500 truncate">{row.code} · {row.category}</p>
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
        key: 'actions',
        label: 'Actions',
        align: 'center',
        render: (row) => (
          <div className="flex items-center justify-center">
            <ActionMenu onEdit={() => setEditingModel(row)} onDelete={() => setModelToDelete(row)} />
          </div>
        ),
      },
    ];
  }, [models]);

  /* ──────────── RENDER ──────────── */
  return (
    <div className="w-full flex flex-col gap-4">

      {/* ─── Page Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-ink-900">Customisation</h1>
          <p className="mt-1 text-sm leading-snug text-ink-500">Customer brands, panel stickers, and product model options for order specs.</p>
        </div>
        <Button variant="primary" className="w-full sm:w-auto shrink-0" icon={Plus} text="Add model" onClick={() => setAddModelOpen(true)} />
      </div>

      {/* ─── KPIs ─── */}
      <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Customisation KPIs">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="card-panel relative overflow-hidden !p-3 border-none rounded-md">
            <div className={clsx('absolute inset-y-0 left-0 w-1', toneBar[kpi.tone])} aria-hidden />
            <p className="pl-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">{kpi.label}</p>
            <p className="mt-1 pl-2 font-mono text-xl font-semibold tabular-nums text-ink-900 sm:text-2xl">{kpi.value}</p>
            {kpi.hint && <p className="mt-1 pl-2 text-xs text-ink-500">{kpi.hint}</p>}
          </article>
        ))}
      </section>

      {/* ─── Customer Brands Panel ─── */}
      <div className="card-panel !p-3 space-y-2.5 rounded-md">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-sm font-bold text-ink-900">Customer brands</h2>
              <span className="inline-flex flex-wrap items-center gap-1 text-2xs text-ink-400" aria-label="Keyboard shortcuts">
                <kbd className="px-1 py-0.5 border border-ink-200 rounded-md text-ink-500 bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">↑</kbd>
                <kbd className="px-1 py-0.5 border border-ink-200 rounded-md text-ink-500 bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">↓</kbd>
                <span>Move</span>
                <span className="text-ink-300">·</span>
                <kbd className="px-1 py-0.5 border border-ink-200 rounded-md text-ink-500 bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">Enter</kbd>
                <span>Select</span>
                <span className="text-ink-300">·</span>
                <kbd className="px-1 py-0.5 border border-ink-200 rounded-md text-ink-500 bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">Alt</kbd>
                <kbd className="px-1 py-0.5 border border-ink-200 rounded-md text-ink-500 bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">←</kbd>
                <kbd className="px-1 py-0.5 border border-ink-200 rounded-md text-ink-500 bg-white shadow-sm font-sans font-semibold text-[10px] uppercase">→</kbd>
                <span>Panes</span>
              </span>
            </div>
            <p className="mt-0.5 text-2xs text-ink-500">Brands per customer · panel stickers per brand</p>
          </div>
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-end">
            <Input type="select" label="Customer" className="w-full sm:w-56 [&_select]:!h-9"
              value={customer?.id ?? ''} onChange={(e) => setCustomerId(e.target.value)}
              options={customers.map((c) => ({ label: `${c.name} (${c.brands.length} brand${c.brands.length === 1 ? '' : 's'})`, value: c.id }))} />
            <Button variant="secondary" className="!min-h-9 shrink-0 !h-9" icon={Plus} text="Add customer" onClick={() => setAddCustomerOpen(true)} />
          </div>
        </div>

        {customer && (
          <div className="grid gap-2 lg:grid-cols-2">
            {/* Brands pane */}
            <div ref={brandsPaneRef} tabIndex={-1} data-pane="brands" aria-label="Brand names"
              className={clsx('rounded-md border p-2 outline-none transition-colors', focusPane === 'brands' ? 'border-brand-600/35 bg-brand-600/5 ring-1 ring-brand-600/20' : 'border-ink-200/60 bg-ink-50/30')}
              onFocusCapture={() => setFocusPane('brands')}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">Brand names</p>
                <span className="text-2xs tabular-nums text-ink-400">{customer.brands.length}</span>
              </div>
              {customer.brands.length === 0 ? (
                <p className="mb-1.5 text-2xs text-ink-400">No brands yet for {customer.name}.</p>
              ) : (
                <ul className="mb-1.5 space-y-0.5" role="listbox" aria-activedescendant={activeBrand ? `brand-option-${activeBrand.id}` : undefined}>
                  {customer.brands.map((brand) => {
                    const active = brand.id === activeBrand?.id;
                    return (
                      <li key={brand.id} id={`brand-option-${brand.id}`} role="option" aria-selected={active}>
                        <div className={clsx('flex items-center gap-1 rounded-md px-1.5 py-1', active ? 'border border-brand-600/30 bg-white' : 'border border-transparent hover:bg-white/80')}>
                          <button type="button" data-brand-select className="min-w-0 flex-1 text-left cursor-pointer"
                            onClick={() => { setActiveBrandId(brand.id); setFocusPane('brands'); }}
                            onDoubleClick={() => { setActiveBrandId(brand.id); focusStickersInput(); }}>
                            <span className="block truncate text-sm font-semibold text-ink-900">{brand.name}</span>
                            <span className="block text-2xs text-ink-500">{brand.panelStickers.length} sticker{brand.panelStickers.length === 1 ? '' : 's'}</span>
                          </button>
                          <Button variant="ghost" size="square" data-remove-brand
                            className="!h-7 !w-7 shrink-0 text-ink-400 hover:text-ink-800"
                            aria-label={`Remove brand ${brand.name}`}
                            onClick={() => setBrandToDelete(brand)}
                            icon={() => <X className="h-3.5 w-3.5" />}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button variant="secondary" size="sm" data-add-brand className="!min-h-8 w-full !text-xs !h-8" icon={Plus} text="Add brand" onClick={() => setAddBrandOpen(true)} />
            </div>

            {/* Stickers pane */}
            <div ref={stickersPaneRef} tabIndex={-1} data-pane="stickers" aria-label="Panel stickers"
              className={clsx('rounded-md border p-2 outline-none transition-colors', focusPane === 'stickers' ? 'border-brand-600/35 bg-brand-600/5 ring-1 ring-brand-600/20' : 'border-ink-200/60 bg-ink-50/30')}
              onFocusCapture={() => setFocusPane('stickers')}>
              {activeBrand ? <StickerEditor brand={activeBrand} onChange={setPanelStickers} /> : (
                <p className="px-1 py-4 text-center text-2xs text-ink-500">Select or add a brand to manage panel stickers.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Product Models Section ─── */}
      <div className="card-panel flex w-full flex-col gap-3 rounded-md !p-3">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-ink-500" aria-hidden />
          <h2 className="text-sm font-bold text-ink-900">Product models</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input type="text" startIcon={Search} placeholder="Search model name or code…" value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 min-w-0" />
          <Input type="select" className="shrink-0 sm:w-48" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            options={[{ label: 'All categories', value: 'ALL' }, ...categories.map((cat) => ({ label: cat, value: cat }))]} />
        </div>
      </div>

      {/* ─── Product Models Table (CommonTable) ─── */}
      <CommonTable
        columns={tableColumns}
        data={filtered}
        emptyState="No products match your search or filter."
        pagination={{ totalItems: filtered.length, pageSize: filtered.length, pageNo: 1, totalPages: 1 }}
      />

      {/* Mobile cards */}
      <ul className="space-y-2 lg:hidden">
        {filtered.map((model) => (
          <li key={model.id} className="card-panel !p-3 rounded-md">
            <div className="mb-3 flex items-start gap-2.5 border-b border-ink-200/40 pb-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-600/10 font-mono text-xs font-bold text-brand-800">{modelInitials(model.code)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{model.name}</p>
                <p className="font-mono text-2xs text-ink-500">{model.code} · {model.category}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-600/10 px-1.5 py-0.5 text-2xs font-semibold text-brand-800">
                <Settings2 className="h-3 w-3" aria-hidden />Configured
              </span>
            </div>
            <dl className="mb-3 grid gap-2.5 sm:grid-cols-2">
              {TABLE_SPEC_KEYS.map((key) => {
                const field = CUSTOMISATION_SPECS.find((f) => f.key === key);
                if (!field) return null;
                return (
                  <div key={key}><dt className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-400">{field.label}</dt><dd>{renderSpecCell(model, field)}</dd></div>
                );
              })}
            </dl>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" icon={Pencil} text="Edit" onClick={() => setEditingModel(model)} />
              <Button variant="danger" className="flex-1" icon={Trash2} text="Delete" onClick={() => setModelToDelete(model)} />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-1 flex items-center gap-1.5 text-2xs text-ink-400">
        <Package className="h-3.5 w-3.5" aria-hidden />
        Model options, customer brands, and brand stickers drive the Specs step when creating an order.
      </p>

      {/* ─── Modals ─── */}
      <AddCustomer open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} onAdd={handleAddCustomer} />
      <AddBrandModal open={addBrandOpen} customers={customers} initialCustomerId={customer?.id ?? ''} onClose={() => setAddBrandOpen(false)} onAdd={handleAddBrand} />
      <DeleteModal open={!!brandToDelete} title="Delete brand" onClose={() => setBrandToDelete(null)} onConfirm={confirmDeleteBrand}>
        Remove <span className="font-semibold text-ink-900">{brandToDelete?.name}</span> from{' '}
        <span className="font-semibold text-ink-900">{customer?.name ?? 'this customer'}</span>? Panel sticker options for this brand will be deleted too.
      </DeleteModal>
      <AddCustomisation open={addModelOpen} onClose={() => setAddModelOpen(false)} onAdd={handleAddModel} />
      <EditCustomisation open={!!editingModel} model={editingModel} onClose={() => setEditingModel(null)} onSave={handleEditModel} />
      <DeleteModal open={!!modelToDelete} title="Delete model" onClose={() => setModelToDelete(null)} onConfirm={handleDeleteModel}>
        Delete <span className="font-semibold text-ink-900">{modelToDelete?.name}</span> (<span className="font-mono text-ink-600">{modelToDelete?.code}</span>)?
        All configuration options for this model will be removed.
      </DeleteModal>
    </div>
  );
}
