import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  Tags,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import {
  CUSTOMISATION_SPECS,
  MODEL_CATEGORIES,
  MODEL_OPTION_KEYS,
  PRODUCT_MODELS,
  type ProductModel,
  type SpecField,
} from '../data/models';
import {
  CUSTOMERS,
  cloneCustomers,
  type Customer,
  type CustomerBrand,
} from '../data/customers';
import { EmptyState, KpiCard, Modal, PageHeader } from '../components/ui';

const MAX_VISIBLE_OPTIONS = 3;

const MODEL_OPTION_KEY_SET = new Set<string>(MODEL_OPTION_KEYS);

/** Accessories / Packing always offer Regular vs Customise only. */
const FIXED_CUSTOMISE_OPTIONS = ['Regular', 'Customise'] as const;

const TABLE_SPEC_KEYS = [
  'body_design',
  'body_color',
  'brand_name',
  'panel_sticker',
  'accessories',
  'packing',
] as const;

function modelInitials(code: string) {
  const segment = code.split('-')[0] ?? code;
  return segment.slice(0, 2).toUpperCase();
}

function cloneSpecs(specs: SpecField[]): SpecField[] {
  return specs.map((field) => ({
    ...field,
    options: field.options ? [...field.options] : undefined,
  }));
}

function cloneModels(models: ProductModel[]): ProductModel[] {
  return models.map((model) => ({
    ...model,
    specs: cloneSpecs(model.specs),
  }));
}

function blankSpecsFromTemplate(): SpecField[] {
  return CUSTOMISATION_SPECS.map((field) => ({
    ...field,
    options: field.options ? [...field.options] : [],
  }));
}

function isModelConfigured(model: ProductModel) {
  return MODEL_OPTION_KEYS.every((key) => {
    const field = model.specs.find((s) => s.key === key);
    return (field?.options?.length ?? 0) > 0;
  });
}

function OptionsCell({ field }: { field: SpecField }) {
  const [expanded, setExpanded] = useState(false);
  const options = field.options ?? [];

  if (options.length === 0) {
    return <span className="text-ink-400">—</span>;
  }

  const overflow = options.length - MAX_VISIBLE_OPTIONS;
  const visible =
    expanded || overflow <= 0 ? options : options.slice(0, MAX_VISIBLE_OPTIONS);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((opt) => (
        <span
          key={opt}
          className="inline-flex rounded-md border border-ink-200/60 bg-ink-50 px-1.5 py-0.5 text-2xs font-medium text-ink-700"
        >
          {opt}
        </span>
      ))}
      {overflow > 0 ? (
        <button
          type="button"
          className="inline-flex rounded-md border border-brand-600/25 bg-brand-600/10 px-1.5 py-0.5 text-2xs font-semibold text-brand-800 hover:bg-brand-600/15"
          aria-expanded={expanded}
          aria-label={
            expanded ? 'Show fewer options' : `Show ${overflow} more options`
          }
          title={
            expanded ? 'Show less' : options.slice(MAX_VISIBLE_OPTIONS).join(', ')
          }
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Less' : `+${overflow}`}
        </button>
      ) : null}
    </div>
  );
}

function LinkedSpecCell({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <div className="min-w-[8rem]">
      <span className="inline-flex rounded-md border border-brand-600/20 bg-brand-600/10 px-1.5 py-0.5 text-2xs font-semibold text-brand-800">
        {label}
      </span>
      <p className="mt-1 text-2xs leading-snug text-ink-500">{detail}</p>
    </div>
  );
}

function OptionChipsEditor({
  id,
  label,
  values,
  onChange,
  emptyHint,
  compact = false,
}: {
  id: string;
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const addOption = () => {
    const value = draft.trim();
    if (!value) return;
    const exists = values.some((v) => v.toLowerCase() === value.toLowerCase());
    if (exists) {
      setLocalError('Option already exists.');
      return;
    }
    onChange([...values, value]);
    setDraft('');
    setLocalError(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption();
    }
  };

  return (
    <div>
      <div className={clsx('flex items-baseline justify-between gap-2', compact ? 'mb-1' : 'mb-1.5')}>
        <label className="label !mb-0" htmlFor={id}>
          {label}
        </label>
        <span className="text-2xs tabular-nums text-ink-400">
          {values.length} option{values.length === 1 ? '' : 's'}
        </span>
      </div>
      <div
        className={clsx(
          compact
            ? 'p-0'
            : 'rounded-xl border border-ink-200/70 bg-ink-50/40 p-2',
        )}
      >
        {values.length > 0 ? (
          <div className={clsx('flex flex-wrap gap-1', compact ? 'mb-1.5' : 'mb-2 gap-1.5')}>
            {values.map((opt) => (
              <span
                key={opt}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-ink-200/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-ink-800"
              >
                <span className="truncate">{opt}</span>
                <button
                  type="button"
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                  aria-label={`Remove ${opt}`}
                  onClick={() => {
                    onChange(values.filter((v) => v !== opt));
                    setLocalError(null);
                  }}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className={clsx('text-2xs text-ink-400', compact ? 'mb-1.5' : 'mb-2')}>
            {emptyHint ?? 'No options yet — add one below.'}
          </p>
        )}
        <div className="flex gap-1.5">
          <input
            id={id}
            className={clsx('input text-sm', compact ? 'min-h-8 py-1' : 'min-h-9 py-1.5')}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (localError) setLocalError(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="Type option, press Enter"
          />
          <button
            type="button"
            className={clsx(
              'btn-secondary shrink-0 px-2.5',
              compact ? 'min-h-8' : 'min-h-9',
            )}
            onClick={addOption}
            disabled={!draft.trim()}
            aria-label={`Add ${label} option`}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {localError ? (
          <p className="mt-1 text-2xs text-danger-700" role="status">
            {localError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FixedCustomiseField({ label }: { label: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="rounded-xl border border-ink-200/70 bg-ink-50/40 p-2">
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {FIXED_CUSTOMISE_OPTIONS.map((opt) => (
            <span
              key={opt}
              className="inline-flex rounded-md border border-ink-200/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-ink-800"
            >
              {opt}
            </span>
          ))}
        </div>
        <p className="text-2xs text-ink-500">
          Fixed choices. Customise opens a detail field on the order Specs step.
        </p>
      </div>
    </div>
  );
}

type ConfigFormState = {
  name: string;
  code: string;
  category: string;
  options: Record<string, string[]>;
};

function toFormState(model?: ProductModel | null): ConfigFormState {
  const specs = model?.specs ?? blankSpecsFromTemplate();
  const options: Record<string, string[]> = {};
  for (const key of MODEL_OPTION_KEYS) {
    const modelField = specs.find((s) => s.key === key);
    const template = CUSTOMISATION_SPECS.find((s) => s.key === key);
    options[key] = [...(modelField?.options ?? template?.options ?? [])];
  }
  return {
    name: model?.name ?? '',
    code: model?.code ?? '',
    category: model?.category ?? MODEL_CATEGORIES[0] ?? '',
    options,
  };
}

function ConfigModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: 'add' | 'edit';
  initial: ProductModel | null;
  onClose: () => void;
  onSave: (model: ProductModel) => void;
}) {
  const [form, setForm] = useState<ConfigFormState>(() => toFormState(initial));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toFormState(initial));
      setError(null);
    }
  }, [open, initial]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const setOptions = (key: string, next: string[]) => {
    setForm((f) => ({
      ...f,
      options: { ...f.options, [key]: next },
    }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    const category = form.category.trim();

    if (!name) {
      setError('Model name is required.');
      return;
    }
    if (!code) {
      setError('Model code is required.');
      return;
    }
    if (!category) {
      setError('Category is required.');
      return;
    }

    for (const key of MODEL_OPTION_KEYS) {
      const field = CUSTOMISATION_SPECS.find((s) => s.key === key);
      if ((form.options[key] ?? []).length === 0) {
        setError(`Add at least one option for ${field?.label ?? key}.`);
        return;
      }
    }

    const specs = CUSTOMISATION_SPECS.map((template) => {
      if (template.type === 'customise') {
        return { ...template, options: [...FIXED_CUSTOMISE_OPTIONS] };
      }
      if (MODEL_OPTION_KEY_SET.has(template.key)) {
        return { ...template, options: [...(form.options[template.key] ?? [])] };
      }
      // brand_name / panel_sticker resolved from customer → brand
      return { ...template, options: [] };
    });

    onSave({
      id: initial?.id ?? `m-${Date.now()}`,
      name,
      code,
      category,
      specs,
    });
  };

  const title = mode === 'add' ? 'Add model' : 'Edit model';
  const submitLabel = mode === 'add' ? 'Add model' : 'Save changes';
  const modelFields = CUSTOMISATION_SPECS.filter((f) =>
    MODEL_OPTION_KEY_SET.has(f.key),
  );
  const fixedFields = CUSTOMISATION_SPECS.filter((f) => f.type === 'customise');

  return (
    <Modal
      open={open}
      title={title}
      onClose={handleClose}
      footer={
        <div className="flex w-full gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" form="order-config-form" className="btn-primary flex-1">
            {submitLabel}
          </button>
        </div>
      }
    >
      <form id="order-config-form" className="space-y-3" onSubmit={submit}>
        {error ? (
          <p
            className="rounded-lg border border-danger-700/20 bg-danger-50 px-3 py-2 text-xs text-danger-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="config-name">
              Model name *
            </label>
            <input
              id="config-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Steel Frame Assembly"
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="config-code">
              Code *
            </label>
            <input
              id="config-code"
              className="input font-mono uppercase"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g. SFA-100"
              maxLength={16}
            />
          </div>
          <div>
            <label className="label" htmlFor="config-category">
              Category *
            </label>
            <input
              id="config-category"
              className="input"
              list="config-category-list"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Structural"
            />
            <datalist id="config-category-list">
              {MODEL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="border-t border-ink-200/50 pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Model specification options
          </p>
          <p className="mb-3 text-2xs text-ink-500">
            Body Design and Body Color are configured per product model.
          </p>
          <div className="grid gap-3">
            {modelFields.map((field) => (
              <OptionChipsEditor
                key={field.key}
                id={`config-opt-${field.key}`}
                label={field.label}
                values={form.options[field.key] ?? []}
                onChange={(next) => setOptions(field.key, next)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-brand-600/15 bg-brand-600/5 px-3 py-2.5">
          <p className="text-xs font-semibold text-brand-900">Brand & panel sticker</p>
          <p className="mt-0.5 text-2xs leading-snug text-ink-600">
            Brand Name is linked to the customer. Panel Sticker options belong to
            each brand. Manage them in Customer brands below.
          </p>
        </div>

        <div className="border-t border-ink-200/50 pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Accessories & packing
          </p>
          <p className="mb-3 text-2xs text-ink-500">
            These stay as Regular or Customise for every model.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {fixedFields.map((field) => (
              <FixedCustomiseField key={field.key} label={field.label} />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function AddCustomerModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (customer: Customer) => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setCode('');
    setRegion('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedRegion = region.trim();
    if (!trimmedName) {
      setError('Customer name is required.');
      return;
    }
    if (!trimmedCode) {
      setError('Customer code is required.');
      return;
    }
    if (!trimmedRegion) {
      setError('Region is required.');
      return;
    }
    onAdd({
      id: `c${Date.now()}`,
      name: trimmedName,
      code: trimmedCode,
      region: trimmedRegion,
      brands: [],
    });
    reset();
  };

  return (
    <Modal
      open={open}
      title="Add customer"
      onClose={handleClose}
      footer={
        <div className="flex w-full gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" form="order-config-add-customer" className="btn-primary flex-1">
            Add customer
          </button>
        </div>
      }
    >
      <form id="order-config-add-customer" className="space-y-3" onSubmit={submit}>
        <div>
          <label className="label" htmlFor="oc-customer-name">
            Customer name *
          </label>
          <input
            id="oc-customer-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apex Manufacturing"
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="oc-customer-code">
            Code *
          </label>
          <input
            id="oc-customer-code"
            className="input font-mono uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. APEX"
            maxLength={8}
          />
        </div>
        <div>
          <label className="label" htmlFor="oc-customer-region">
            Region *
          </label>
          <input
            id="oc-customer-region"
            className="input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. Midwest"
          />
        </div>
        {error ? (
          <p className="text-sm font-medium text-danger-700" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

function AddBrandModal({
  open,
  customers,
  initialCustomerId,
  onClose,
  onAdd,
}: {
  open: boolean;
  customers: Customer[];
  initialCustomerId: string;
  onClose: () => void;
  onAdd: (customerId: string, brand: CustomerBrand) => void;
}) {
  const [brandName, setBrandName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBrandName('');
      setSelectedCustomerId(initialCustomerId || customers[0]?.id || '');
      setError(null);
    }
  }, [open, initialCustomerId, customers]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = brandName.trim();
    if (!name) {
      setError('Brand name is required.');
      return;
    }
    if (!selectedCustomerId) {
      setError('Select a customer.');
      return;
    }
    const target = customers.find((c) => c.id === selectedCustomerId);
    if (!target) {
      setError('Customer not found.');
      return;
    }
    if (target.brands.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      setError(`${target.name} already has this brand.`);
      return;
    }
    onAdd(selectedCustomerId, {
      id: `b-${Date.now()}`,
      name,
      panelStickers: ['None'],
    });
  };

  return (
    <Modal
      open={open}
      title="Add brand"
      onClose={handleClose}
      footer={
        <div className="flex w-full gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" form="order-config-add-brand" className="btn-primary flex-1">
            Add brand
          </button>
        </div>
      }
    >
      <form id="order-config-add-brand" className="space-y-3" onSubmit={submit}>
        <div>
          <label className="label" htmlFor="oc-brand-name">
            Brand name *
          </label>
          <input
            id="oc-brand-name"
            className="input"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g. Acme Pro"
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="oc-brand-customer">
            Customer *
          </label>
          <select
            id="oc-brand-customer"
            className="input cursor-pointer"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.code}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-2xs text-ink-500">
            You can assign this brand to a different customer if needed.
          </p>
        </div>
        {error ? (
          <p className="text-sm font-medium text-danger-700" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

function CustomerBrandsPanel({
  customers,
  onChange,
}: {
  customers: Customer[];
  onChange: (next: Customer[]) => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<CustomerBrand | null>(null);
  const [focusPane, setFocusPane] = useState<'brands' | 'stickers'>('brands');
  const brandsPaneRef = useRef<HTMLDivElement>(null);
  const stickersPaneRef = useRef<HTMLDivElement>(null);

  const customer = customers.find((c) => c.id === customerId) ?? customers[0];

  useEffect(() => {
    if (!customer) {
      setActiveBrandId(null);
      return;
    }
    if (!customer.brands.some((b) => b.id === activeBrandId)) {
      setActiveBrandId(customer.brands[0]?.id ?? null);
    }
  }, [customer, activeBrandId]);

  const activeBrand =
    customer?.brands.find((b) => b.id === activeBrandId) ?? customer?.brands[0];

  const focusStickersInput = useCallback(() => {
    setFocusPane('stickers');
    requestAnimationFrame(() => {
      stickersPaneRef.current
        ?.querySelector<HTMLInputElement>('input:not([disabled])')
        ?.focus();
    });
  }, []);

  const focusBrandsPane = useCallback(() => {
    setFocusPane('brands');
    requestAnimationFrame(() => {
      const brands = customer?.brands ?? [];
      const idx = Math.max(
        0,
        brands.findIndex((b) => b.id === activeBrandId),
      );
      const buttons =
        brandsPaneRef.current?.querySelectorAll<HTMLButtonElement>(
          '[data-brand-select]',
        );
      const target = buttons?.[idx] ?? buttons?.[0];
      if (target) target.focus();
      else brandsPaneRef.current?.focus();
    });
  }, [customer?.brands, activeBrandId]);

  const moveBrandHighlight = useCallback(
    (delta: number) => {
      const brands = customer?.brands ?? [];
      if (brands.length === 0) return;
      const current = brands.findIndex((b) => b.id === activeBrandId);
      const from = current < 0 ? 0 : current;
      const next = Math.max(0, Math.min(brands.length - 1, from + delta));
      const nextBrand = brands[next]!;
      setActiveBrandId(nextBrand.id);
      setFocusPane('brands');
      requestAnimationFrame(() => {
        brandsPaneRef.current
          ?.querySelectorAll<HTMLButtonElement>('[data-brand-select]')
          [next]?.focus();
      });
    },
    [customer?.brands, activeBrandId],
  );

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      if (e.altKey) {
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          if (e.code === 'ArrowLeft') focusBrandsPane();
          else focusStickersInput();
        }
        return;
      }

      const target = e.target as HTMLElement | null;

      if (focusPane !== 'brands') {
        const inBrands = !!(
          target && brandsPaneRef.current?.contains(target)
        );
        if (!inBrands) return;
        setFocusPane('brands');
      }

      if (target?.closest('[data-pane="stickers"]')) return;
      if (target?.tagName === 'SELECT' || target?.tagName === 'TEXTAREA') return;
      if (target?.closest('[data-add-brand]') && e.code === 'Enter') return;
      if (target?.closest('[data-remove-brand]')) return;

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        moveBrandHighlight(1);
        return;
      }
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        moveBrandHighlight(-1);
        return;
      }
      if (e.code === 'Enter') {
        if (!activeBrandId && !(customer?.brands.length)) return;
        e.preventDefault();
        e.stopPropagation();
        focusStickersInput();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [
    focusPane,
    focusBrandsPane,
    focusStickersInput,
    moveBrandHighlight,
    activeBrandId,
    customer?.brands.length,
  ]);

  const updateCustomerById = (
    id: string,
    updater: (c: Customer) => Customer,
  ) => {
    onChange(customers.map((c) => (c.id === id ? updater(c) : c)));
  };

  const removeBrand = (brandId: string) => {
    if (!customer) return;
    updateCustomerById(customer.id, (c) => ({
      ...c,
      brands: c.brands.filter((b) => b.id !== brandId),
    }));
  };

  const confirmDeleteBrand = () => {
    if (!brandToDelete) return;
    removeBrand(brandToDelete.id);
    setBrandToDelete(null);
  };

  const setPanelStickers = (next: string[]) => {
    if (!customer || !activeBrand) return;
    updateCustomerById(customer.id, (c) => ({
      ...c,
      brands: c.brands.map((b) =>
        b.id === activeBrand.id ? { ...b, panelStickers: next } : b,
      ),
    }));
  };

  const handleAddCustomer = (next: Customer) => {
    onChange([...customers, next]);
    setCustomerId(next.id);
    setActiveBrandId(null);
    setAddCustomerOpen(false);
  };

  const handleAddBrand = (targetCustomerId: string, brand: CustomerBrand) => {
    updateCustomerById(targetCustomerId, (c) => ({
      ...c,
      brands: [...c.brands, brand],
    }));
    setCustomerId(targetCustomerId);
    setActiveBrandId(brand.id);
    setAddBrandOpen(false);
    focusStickersInput();
  };

  if (customers.length === 0) {
    return (
      <>
        <div className="card-panel !p-3 space-y-2">
          <EmptyState message="No customers yet. Add a customer to manage brands." />
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={() => setAddCustomerOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add customer
          </button>
        </div>
        <AddCustomerModal
          open={addCustomerOpen}
          onClose={() => setAddCustomerOpen(false)}
          onAdd={handleAddCustomer}
        />
      </>
    );
  }

  return (
    <>
      <div className="card-panel !p-3 space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-sm font-bold text-ink-900">Customer brands</h2>
              <span
                className="inline-flex flex-wrap items-center gap-1 text-2xs text-ink-400"
                aria-label="Keyboard shortcuts"
              >
                <kbd className="wizard-kbd">↑</kbd>
                <kbd className="wizard-kbd">↓</kbd>
                <span>Move</span>
                <span className="text-ink-300" aria-hidden>
                  ·
                </span>
                <kbd className="wizard-kbd">Enter</kbd>
                <span>Select</span>
                <span className="text-ink-300" aria-hidden>
                  ·
                </span>
                <kbd className="wizard-kbd">Alt</kbd>
                <kbd className="wizard-kbd">←</kbd>
                <kbd className="wizard-kbd">→</kbd>
                <span>Panes</span>
              </span>
            </div>
            <p className="mt-0.5 text-2xs text-ink-500">
              Brands per customer · panel stickers per brand
            </p>
          </div>
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-end">
            <label className="w-full sm:w-56">
              <span className="label !mb-1">Customer</span>
              <select
                className="input min-h-9 cursor-pointer py-1.5"
                value={customer?.id ?? ''}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.brands.length} brand
                    {c.brands.length === 1 ? '' : 's'})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-secondary min-h-9 shrink-0"
              onClick={() => setAddCustomerOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add customer
            </button>
          </div>
        </div>

        {!customer ? null : (
          <div className="grid gap-2 lg:grid-cols-2">
            <div
              ref={brandsPaneRef}
              tabIndex={-1}
              className={clsx(
                'rounded-xl border p-2 outline-none transition-colors',
                focusPane === 'brands'
                  ? 'border-brand-600/35 bg-brand-600/5 ring-1 ring-brand-600/20'
                  : 'border-ink-200/60 bg-ink-50/30',
              )}
              aria-label="Brand names"
              data-pane="brands"
              onFocusCapture={() => setFocusPane('brands')}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  Brand names
                </p>
                <span className="text-2xs tabular-nums text-ink-400">
                  {customer.brands.length}
                </span>
              </div>
              {customer.brands.length === 0 ? (
                <p className="mb-1.5 text-2xs text-ink-400">
                  No brands yet for {customer.name}.
                </p>
              ) : (
                <ul
                  className="mb-1.5 space-y-0.5"
                  role="listbox"
                  aria-label="Brand names"
                  aria-activedescendant={
                    activeBrand ? `brand-option-${activeBrand.id}` : undefined
                  }
                >
                  {customer.brands.map((brand) => {
                    const active = brand.id === activeBrand?.id;
                    return (
                      <li
                        key={brand.id}
                        id={`brand-option-${brand.id}`}
                        role="option"
                        aria-selected={active}
                      >
                        <div
                          className={clsx(
                            'flex items-center gap-1 rounded-lg px-1.5 py-1',
                            active
                              ? 'border border-brand-600/30 bg-white'
                              : 'border border-transparent hover:bg-white/80',
                          )}
                        >
                          <button
                            type="button"
                            data-brand-select
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                              setActiveBrandId(brand.id);
                              setFocusPane('brands');
                            }}
                            onDoubleClick={() => {
                              setActiveBrandId(brand.id);
                              focusStickersInput();
                            }}
                          >
                            <span className="block truncate text-sm font-semibold text-ink-900">
                              {brand.name}
                            </span>
                            <span className="block text-2xs text-ink-500">
                              {brand.panelStickers.length} sticker
                              {brand.panelStickers.length === 1 ? '' : 's'}
                            </span>
                          </button>
                          <button
                            type="button"
                            data-remove-brand
                            className="btn-ghost h-7 w-7 min-h-0 shrink-0 p-0"
                            aria-label={`Remove brand ${brand.name}`}
                            onClick={() => setBrandToDelete(brand)}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                data-add-brand
                className="btn-secondary min-h-8 w-full text-xs"
                onClick={() => setAddBrandOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add brand
              </button>
            </div>

            <div
              ref={stickersPaneRef}
              tabIndex={-1}
              className={clsx(
                'rounded-xl border p-2 outline-none transition-colors',
                focusPane === 'stickers'
                  ? 'border-brand-600/35 bg-brand-600/5 ring-1 ring-brand-600/20'
                  : 'border-ink-200/60 bg-ink-50/30',
              )}
              aria-label="Panel stickers"
              data-pane="stickers"
              onFocusCapture={() => setFocusPane('stickers')}
            >
              {activeBrand ? (
                <OptionChipsEditor
                  id={`panel-stickers-${activeBrand.id}`}
                  label={`Panel stickers · ${activeBrand.name}`}
                  values={activeBrand.panelStickers}
                  onChange={setPanelStickers}
                  emptyHint="Add at least one panel sticker for this brand."
                  compact
                />
              ) : (
                <p className="px-1 py-4 text-center text-2xs text-ink-500">
                  Select or add a brand to manage panel stickers.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <AddCustomerModal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onAdd={handleAddCustomer}
      />
      <AddBrandModal
        open={addBrandOpen}
        customers={customers}
        initialCustomerId={customer?.id ?? ''}
        onClose={() => setAddBrandOpen(false)}
        onAdd={handleAddBrand}
      />
      <Modal
        open={!!brandToDelete}
        title="Delete brand"
        onClose={() => setBrandToDelete(null)}
        footer={
          <div className="flex w-full gap-2">
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => setBrandToDelete(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary flex-1 !bg-danger-700 hover:!bg-danger-800"
              onClick={confirmDeleteBrand}
            >
              Delete brand
            </button>
          </div>
        }
      >
        <p className="text-sm text-ink-700">
          Remove{' '}
          <span className="font-semibold text-ink-900">
            {brandToDelete?.name}
          </span>{' '}
          from{' '}
          <span className="font-semibold text-ink-900">
            {customer?.name ?? 'this customer'}
          </span>
          ? Panel sticker options for this brand will be deleted too.
        </p>
      </Modal>
    </>
  );
}

export function OrderConfigPage() {
  const [models, setModels] = useState(() => cloneModels(PRODUCT_MODELS));
  const [customers, setCustomers] = useState(() => cloneCustomers(CUSTOMERS));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editing, setEditing] = useState<ProductModel | null>(null);

  const categories = useMemo(
    () => [...new Set(models.map((m) => m.category))].sort(),
    [models],
  );

  const configuredCount = useMemo(
    () => models.filter(isModelConfigured).length,
    [models],
  );

  const totalBrands = useMemo(
    () => customers.reduce((sum, c) => sum + c.brands.length, 0),
    [customers],
  );

  const totalStickers = useMemo(
    () =>
      customers.reduce(
        (sum, c) =>
          sum + c.brands.reduce((s, b) => s + b.panelStickers.length, 0),
        0,
      ),
    [customers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((model) => {
      const matchCat = category === 'ALL' || model.category === category;
      const matchQ =
        !q ||
        model.name.toLowerCase().includes(q) ||
        model.code.toLowerCase().includes(q) ||
        model.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [models, query, category]);

  const openAdd = () => {
    setModalMode('add');
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (model: ProductModel) => {
    setModalMode('edit');
    setEditing(model);
    setModalOpen(true);
  };

  const handleSave = (model: ProductModel) => {
    setModels((list) => {
      if (modalMode === 'add') return [...list, model];
      return list.map((item) => (item.id === model.id ? model : item));
    });
    setModalOpen(false);
    setEditing(null);
  };

  const tableFields = TABLE_SPEC_KEYS.map(
    (key) => CUSTOMISATION_SPECS.find((f) => f.key === key)!,
  );

  const kpis = [
    {
      label: 'Total products',
      value: String(models.length),
      hint: 'Models in catalog',
      tone: 'neutral' as const,
    },
    {
      label: 'Configured products',
      value: String(configuredCount),
      hint: 'With design & color options',
      tone: 'info' as const,
    },
    {
      label: 'Customer brands',
      value: String(totalBrands),
      hint: `Across ${customers.length} customers`,
      tone: 'neutral' as const,
    },
    {
      label: 'Panel stickers',
      value: String(totalStickers),
      hint: 'Options linked to brands',
      tone: 'warning' as const,
    },
  ];

  const renderSpecCell = (model: ProductModel, field: SpecField) => {
    if (field.key === 'brand_name') {
      return (
        <LinkedSpecCell
          label="Per customer"
          detail="Brands assigned on the customer account"
        />
      );
    }
    if (field.key === 'panel_sticker') {
      return (
        <LinkedSpecCell
          label="Per brand"
          detail="Stickers follow the selected brand"
        />
      );
    }
    const modelField = model.specs.find((s) => s.key === field.key) ?? field;
    return <OptionsCell field={modelField} />;
  };

  return (
    <div className="w-full">
      <PageHeader
        title="Customisation"
        subtitle="Customer brands, panel stickers, and product model options for order specs."
        actions={
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add model
          </button>
        }
      />

      <section
        className="mb-3 grid w-full grid-cols-2 gap-2 sm:mb-4 lg:grid-cols-4"
        aria-label="Customisation KPIs"
      >
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            tone={kpi.tone}
          />
        ))}
      </section>

      <div className="mb-3">
        <CustomerBrandsPanel customers={customers} onChange={setCustomers} />
      </div>

      <div className="card-panel mb-3 flex w-full flex-col gap-3">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-ink-500" aria-hidden />
          <h2 className="text-sm font-bold text-ink-900">Product models</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search models</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-600"
              strokeWidth={2.5}
              aria-hidden
            />
            <input
              className="input pl-10"
              placeholder="Search model name or code…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="shrink-0 sm:w-48">
            <span className="sr-only">Filter by category</span>
            <select
              className="input cursor-pointer"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ALL">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-ink-500">
          Showing{' '}
          <span className="font-semibold tabular-nums text-ink-800">
            {filtered.length}
          </span>{' '}
          of {models.length} products
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No products match your search or filter." />
      ) : (
        <>
          <div className="card-panel hidden overflow-x-auto lg:block">
            <table className="data-table w-full min-w-[960px]">
              <thead>
                <tr>
                  <th className="min-w-[12rem]">Model</th>
                  {tableFields.map((field) => (
                    <th key={field.key} className="min-w-[8.5rem]">
                      {field.label}
                    </th>
                  ))}
                  <th className="w-14 text-center">Edit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((model) => (
                  <tr key={model.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 font-mono text-2xs font-bold text-brand-800">
                          {modelInitials(model.code)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900">{model.name}</p>
                          <p className="font-mono text-2xs text-ink-500">
                            {model.code} · {model.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    {tableFields.map((field) => (
                      <td key={field.key}>{renderSpecCell(model, field)}</td>
                    ))}
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn-ghost mx-auto h-9 w-9 min-h-0 p-0"
                        aria-label={`Edit ${model.name}`}
                        onClick={() => openEdit(model)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 lg:hidden" aria-label="Product configuration">
            {filtered.map((model) => (
              <li key={model.id} className="card-panel !p-3">
                <div className="mb-3 flex items-start gap-2.5 border-b border-ink-200/40 pb-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 font-mono text-xs font-bold text-brand-800">
                    {modelInitials(model.code)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900">{model.name}</p>
                    <p className="font-mono text-2xs text-ink-500">
                      {model.code} · {model.category}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-600/10 px-1.5 py-0.5 text-2xs font-semibold text-brand-800">
                    <Settings2 className="h-3 w-3" aria-hidden />
                    Configured
                  </span>
                </div>
                <dl className="mb-3 grid gap-2.5 sm:grid-cols-2">
                  {tableFields.map((field) => (
                    <div key={field.key}>
                      <dt className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                        {field.label}
                      </dt>
                      <dd>{renderSpecCell(model, field)}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  className="btn-secondary min-h-10 w-full"
                  aria-label={`Edit ${model.name}`}
                  onClick={() => openEdit(model)}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit model
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-2xs text-ink-400">
        <Package className="h-3.5 w-3.5" aria-hidden />
        Model options, customer brands, and brand stickers drive the Specs step
        when creating an order.
      </p>

      <ConfigModal
        open={modalOpen}
        mode={modalMode}
        initial={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
