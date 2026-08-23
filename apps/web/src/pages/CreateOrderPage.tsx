import { memo, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type Ref, type RefObject } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Circle,
  Copy,
  Flag,
  Italic,
  Layers,
  List,
  Package,
  Plus,
  Search,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { Modal } from '../components/ui';
import { CUSTOMERS, cloneCustomers, type Customer } from '../data/customers';
import {
  MODEL_CATEGORIES,
  PRODUCT_MODELS,
  defaultSpecsForModel,
  getModelById,
  isCustomiseMode,
  isLineSpecsComplete,
  type ProductModel,
  type SpecField,
} from '../data/models';
import type { DummyOrder } from '../data/dummy';
import {
  INITIAL_CREATE_ORDER_DRAFT,
  WIZARD_STEPS,
  type CreateOrderDraft,
  type OrderLineDraft,
  type WizardStep,
} from '../types/createOrder';
import {
  specDisplayValue,
  validateStep,
} from '../utils/createOrderValidation';

function modelInitials(code: string) {
  const segment = code.split('-')[0] ?? code;
  return segment.slice(0, 2).toUpperCase();
}

function customerInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
}

function focusListboxOption(
  listRef: RefObject<HTMLUListElement | null>,
  index: number,
) {
  const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
    'button[role="option"]',
  );
  buttons?.[index]?.focus();
}

function handleListboxArrowKeys(
  e: React.KeyboardEvent,
  index: number,
  listRef: RefObject<HTMLUListElement | null>,
  onReturnToSearch?: () => void,
) {
  const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
    'button[role="option"]',
  );
  const count = buttons?.length ?? 0;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (index < count - 1) buttons?.[index + 1]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (index === 0) onReturnToSearch?.();
    else buttons?.[index - 1]?.focus();
  }
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DUE_PRESETS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '2 months', days: 60 },
  { label: '3 months', days: 90 },
];

const MAX_DUE_DAYS = 90;

function formatDueLabel(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function leadDaysUntil(iso: string) {
  if (!iso) return null;
  const due = new Date(`${iso}T12:00:00`);
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return Math.round((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function StepSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('flex min-h-0 flex-col', className)}>
      <div
        className={clsx(
          'wizard-step-heading shrink-0',
          !description && 'wizard-step-heading-compact',
        )}
      >
        <h2 className="wizard-step-title">{title}</h2>
        {description ? (
          <p className="wizard-step-desc">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Stepper({
  current,
  onJump,
}: {
  current: WizardStep;
  onJump: (step: WizardStep) => void;
}) {
  const currentIdx = WIZARD_STEPS.findIndex((s) => s.id === current);
  const progress = ((currentIdx + 1) / WIZARD_STEPS.length) * 100;

  return (
    <nav aria-label="Create order progress" className="wizard-stepper">
      <div className="wizard-stepper-track" aria-hidden>
        <div className="wizard-stepper-fill" style={{ width: `${progress}%` }} />
      </div>
      <ol className="grid grid-cols-4 gap-1 sm:flex sm:gap-0">
        {WIZARD_STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = step.id === current;
          const canJump = idx < currentIdx;
          return (
            <li key={step.id} className="sm:flex-1">
              <button
                type="button"
                disabled={!canJump}
                onClick={() => canJump && onJump(step.id)}
                className={clsx(
                  'wizard-step-btn w-full',
                  active && 'wizard-step-btn-active',
                  done && !active && 'wizard-step-btn-done',
                  !active && !done && 'wizard-step-btn-idle',
                  !canJump && !active && 'cursor-default',
                )}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={clsx(
                    'wizard-step-num',
                    active && 'wizard-step-num-active',
                    done && !active && 'wizard-step-num-done',
                    !active && !done && 'wizard-step-num-idle',
                  )}
                >
                  {done && !active ? (
                    <Check className="h-3 w-3" aria-hidden />
                  ) : (
                    idx + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold leading-tight sm:text-sm">
                    {step.label}
                  </span>
                  <span className="mt-0.5 hidden truncate text-2xs leading-tight text-ink-500 lg:block">
                    {step.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function OrderSchedulePanel({
  draft,
  customerName,
  customer,
  onChange,
  compact = false,
  dueDateRef,
}: {
  draft: CreateOrderDraft;
  customerName: string | null;
  customer?: Customer | null;
  onChange: (patch: Partial<CreateOrderDraft>) => void;
  compact?: boolean;
  dueDateRef?: Ref<HTMLInputElement>;
}) {
  const priorities: DummyOrder['priority'][] = ['Low', 'Medium', 'High'];
  const leadDays = draft.dueDate ? leadDaysUntil(draft.dueDate) : null;

  const priorityClass = (p: DummyOrder['priority'], active: boolean) => {
    if (p === 'High')
      return active ? 'wizard-priority-high-active' : 'wizard-priority-high';
    if (p === 'Medium')
      return active ? 'wizard-priority-medium-active' : 'wizard-priority-medium';
    return active ? 'wizard-priority-low-active' : 'wizard-priority-low';
  };

  const checklist = [
    { label: 'Customer selected', done: !!customerName },
    { label: 'Models added', done: draft.lines.length > 0 },
    {
      label: 'Specs completed',
      done:
        draft.lines.length > 0 &&
        draft.lines.every((l) => isLineSpecsComplete(l, customer)),
    },
    { label: 'Due date set', done: !!draft.dueDate },
  ];

  return (
    <aside className="wizard-order-panel">
      <div className="shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          Order summary
        </h2>

        {customerName ? (
          <div className="wizard-summary-customer">
            <span className="wizard-avatar h-10 w-10 bg-brand-600/15 text-sm text-brand-800">
              {customerInitials(customerName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-900">{customerName}</p>
              <p className="text-xs text-ink-500">Production order draft</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-ink-200/70 bg-white/30 px-3 py-4 text-center text-sm text-ink-500">
            Select a customer to begin scheduling.
          </p>
        )}
      </div>

      <div className="wizard-order-panel-body">
        {compact ? (
          <>
            <div className="wizard-summary-section">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
                Schedule snapshot
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="wizard-summary-stat !text-left">
                  <p className="wizard-summary-stat-label">Due date</p>
                  <p className="mt-0.5 text-sm font-bold text-ink-900">
                    {draft.dueDate ? formatDueLabel(draft.dueDate) : '—'}
                  </p>
                </div>
                <div className="wizard-summary-stat !text-left">
                  <p className="wizard-summary-stat-label">Priority</p>
                  <p
                    className={clsx(
                      'mt-0.5 text-sm font-bold',
                      draft.priority === 'High' && 'text-danger-700',
                      draft.priority === 'Medium' && 'text-warning-700',
                      draft.priority === 'Low' && 'text-success-700',
                    )}
                  >
                    {draft.priority}
                  </p>
                </div>
              </div>
            </div>
            <div className="wizard-summary-section">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
                Ready to submit
              </p>
              <ul className="mt-2 space-y-2">
                {checklist.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-2 text-sm text-ink-700"
                  >
                    {item.done ? (
                      <Check className="h-4 w-4 shrink-0 text-success-700" aria-hidden />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-ink-300" aria-hidden />
                    )}
                    <span className={item.done ? 'font-medium' : 'text-ink-500'}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
              {draft.notes ? (
                <div className="mt-3 rounded-lg border border-ink-200/40 bg-white/40 px-3 py-2">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
                    Notes
                  </p>
                  <p className="mt-1 text-sm text-ink-700">{draft.notes}</p>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="wizard-order-panel-fields">
            <section className="wizard-summary-section shrink-0">
              <div className="flex items-start justify-between gap-2">
                <label
                  className="label mb-0 flex items-center gap-1.5"
                  htmlFor="panel-due-date"
                >
                  <Calendar className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                  Due date *
                </label>
                {draft.dueDate ? (
                  <span className="text-2xs font-semibold text-brand-700">
                    {formatDueLabel(draft.dueDate)}
                  </span>
                ) : null}
              </div>
              <input
                ref={dueDateRef}
                id="panel-due-date"
                type="date"
                className="input mt-2"
                value={draft.dueDate}
                min={addDays(0)}
                max={addDays(MAX_DUE_DAYS)}
                onChange={(e) => onChange({ dueDate: e.target.value })}
                required
              />
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {DUE_PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    className={clsx(
                      'wizard-due-chip w-full',
                      draft.dueDate === addDays(preset.days) && 'wizard-due-chip-active',
                    )}
                    onClick={() => onChange({ dueDate: addDays(preset.days) })}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {leadDays !== null ? (
                <p className="mt-2 text-2xs text-ink-500">
                  {leadDays === 0
                    ? 'Due today'
                    : leadDays === 1
                      ? '1 day from today'
                      : `${leadDays} days from today`}
                </p>
              ) : null}
            </section>

            <section className="wizard-summary-section shrink-0">
              <p className="label mb-1.5 flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                Priority *
              </p>
              <div className="flex gap-1.5">
                {priorities.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChange({ priority: p })}
                    className={clsx(
                      'wizard-priority-card min-w-0',
                      priorityClass(p, draft.priority === p),
                    )}
                  >
                    <span className="text-xs font-semibold">{p}</span>
                  </button>
                ))}
              </div>
            </section>
            </div>

            <section className="wizard-summary-section wizard-summary-notes">
              <label className="label" htmlFor="panel-notes">
                Planner notes
                <span className="ml-1 font-normal normal-case text-ink-400">
                  (optional)
                </span>
              </label>
              <textarea
                id="panel-notes"
                className="input w-full text-sm"
                placeholder="Delivery instructions, shift preferences, material constraints…"
                value={draft.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
              />
            </section>
          </>
        )}
      </div>
    </aside>
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
          <button type="submit" form="add-customer-form" className="btn-primary flex-1">
            Add customer
          </button>
        </div>
      }
    >
      <form id="add-customer-form" className="space-y-3" onSubmit={submit}>
        <div>
          <label className="label" htmlFor="customer-name">
            Customer name *
          </label>
          <input
            id="customer-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apex Manufacturing"
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="customer-code">
            Code *
          </label>
          <input
            id="customer-code"
            className="input font-mono uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. APEX"
            maxLength={8}
          />
        </div>
        <div>
          <label className="label" htmlFor="customer-region">
            Region *
          </label>
          <input
            id="customer-region"
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

function ModelQuantityModal({
  open,
  model,
  quantity,
  mode,
  onQuantityChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  model: ProductModel | null;
  quantity: number;
  mode: 'add' | 'edit';
  onQuantityChange: (qty: number) => void;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState(String(quantity));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraftQty(String(quantity));
    const frame = requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    });
    return () => cancelAnimationFrame(frame);
    // Reset draft only when the dialog opens for a model, not on every parent qty sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, model?.id]);

  if (!model) return null;

  const applyQuantity = (next: number) => {
    const qty = Math.max(1, next);
    setDraftQty(String(qty));
    onQuantityChange(qty);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(draftQty);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setError('Enter a quantity of at least 1.');
      return;
    }
    const qty = Math.floor(parsed);
    onQuantityChange(qty);
    onConfirm(qty);
  };

  const quickQty = [1, 5, 10, 25, 50, 100];
  const parsedDraft = Number(draftQty);

  return (
    <Modal
      open={open}
      title={mode === 'add' ? 'Set quantity' : 'Edit quantity'}
      onClose={onClose}
      footer={
        <div className="flex w-full gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="model-qty-form" className="btn-primary flex-1">
            {mode === 'add' ? 'Add to order' : 'Update quantity'}
          </button>
        </div>
      }
    >
      <form id="model-qty-form" className="space-y-4" onSubmit={submit}>
        <div className="flex items-center gap-3 rounded-xl border border-ink-200/45 bg-white/50 px-3 py-2.5">
          <span className="wizard-avatar h-10 w-10 shrink-0 bg-brand-600/10 font-mono text-xs text-brand-800">
            {modelInitials(model.code)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{model.name}</p>
            <p className="font-mono text-xs text-ink-500">{model.code}</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="model-qty-input">
            Quantity *
          </label>
          <input
            ref={inputRef}
            id="model-qty-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="input wizard-qty-modal-input text-center text-lg font-semibold tabular-nums"
            value={draftQty}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setError(null);
              const next = e.target.value.replace(/\D/g, '');
              setDraftQty(next);
              const parsed = Number(next);
              if (next && Number.isFinite(parsed) && parsed >= 1) {
                onQuantityChange(parsed);
              }
            }}
          />
        </div>

        <div>
          <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400">
            Quick select
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickQty.map((n) => (
              <button
                key={n}
                type="button"
                className={clsx(
                  'rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors',
                  parsedDraft === n
                    ? 'border-brand-500/50 bg-brand-600/15 text-brand-800'
                    : 'border-ink-200/50 bg-white/60 text-ink-600 hover:border-ink-300/60 hover:bg-white/90',
                )}
                onClick={() => {
                  setError(null);
                  applyQuantity(n);
                }}
              >
                {n}
              </button>
            ))}
          </div>
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

function CustomerStep({
  draft,
  customers,
  onSelect,
  onAddCustomer,
  onFocusDueDate,
}: {
  draft: CreateOrderDraft;
  customers: Customer[];
  onSelect: (customerId: string) => void;
  onAddCustomer: (customer: Customer) => void;
  onFocusDueDate?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q),
    );
  }, [query, customers]);

  const selectCustomer = useCallback(
    (customerId: string) => {
      onSelect(customerId);
      // Panel mounts after customer is set — focus due date on next frames.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          onFocusDueDate?.();
        });
      });
    },
    [onSelect, onFocusDueDate],
  );

  const handleAdd = (customer: Customer) => {
    onAddCustomer(customer);
    selectCustomer(customer.id);
    setAddOpen(false);
  };

  const focusCustomerSection = useCallback(() => {
    const selected = listRef.current?.querySelector<HTMLButtonElement>(
      'button[role="option"][aria-selected="true"]',
    );
    if (selected) {
      selected.focus();
      return;
    }
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (!e.altKey || e.metaKey || e.ctrlKey) return;

      if (e.code === 'KeyS') {
        e.preventDefault();
        e.stopPropagation();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      // Alt+→ Order summary · Alt+← Customer list
      if (e.code === 'ArrowRight') {
        if (!draft.customerId || !onFocusDueDate) return;
        e.preventDefault();
        e.stopPropagation();
        onFocusDueDate();
        return;
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        focusCustomerSection();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [draft.customerId, onFocusDueDate, focusCustomerSection]);

  return (
    <StepSection
      className="min-h-0 flex-1"
      title="Select customer"
      description="Search and pick the account for this production order."
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="wizard-search-field">
            <span className="sr-only">Search customers</span>
            <Search className="wizard-search-icon" strokeWidth={2.5} aria-hidden />
            <input
              ref={searchRef}
              id="customer-search-input"
              className="wizard-search-input"
              placeholder="Search name, code, or region…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  focusListboxOption(listRef, 0);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
                    'button[role="option"]',
                  );
                  const last = (buttons?.length ?? 0) - 1;
                  if (last >= 0) focusListboxOption(listRef, last);
                } else if (e.key === 'Enter') {
                  const first = filtered[0];
                  if (first && query.trim()) {
                    e.preventDefault();
                    selectCustomer(first.id);
                  }
                }
              }}
              autoFocus
            />
          </label>
          <button
            type="button"
            tabIndex={-1}
            className="btn-secondary shrink-0 gap-1.5 sm:min-w-[9.5rem]"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add customer
          </button>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-400"
          aria-label="Keyboard shortcuts"
        >
          <span className="inline-flex items-center gap-1">
            <kbd className="wizard-kbd">Alt</kbd>
            <kbd className="wizard-kbd">S</kbd>
            <span>Search</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="wizard-kbd">↓</kbd>
            <kbd className="wizard-kbd">↑</kbd>
            <span>Move list</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="wizard-kbd">Enter</kbd>
            <span>Select</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="wizard-kbd">Alt</kbd>
            <kbd className="wizard-kbd">←</kbd>
            <kbd className="wizard-kbd">→</kbd>
            <span>Switch sections</span>
          </span>
        </div>

        <ul
          ref={listRef}
          id="customer-list"
          className="wizard-customer-list"
          role="listbox"
          aria-label="Customers"
        >
          {filtered.length === 0 ? (
            <li className="rounded-xl border border-dashed border-ink-200/80 bg-white/30 px-4 py-8 text-center text-sm text-ink-500">
              No customers match your search.
            </li>
          ) : (
            filtered.map((customer, index) => {
              const selected = draft.customerId === customer.id;
              return (
                <li key={customer.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectCustomer(customer.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectCustomer(customer.id);
                        return;
                      }
                      handleListboxArrowKeys(e, index, listRef, () =>
                        searchRef.current?.focus(),
                      );
                    }}
                    className={clsx(
                      'wizard-select-card',
                      selected
                        ? 'wizard-select-card-selected'
                        : 'wizard-select-card-default',
                    )}
                  >
                    <span
                      className={clsx(
                        'wizard-avatar',
                        selected
                          ? 'bg-brand-600 text-white'
                          : 'bg-ink-100 text-ink-600',
                      )}
                    >
                      {customerInitials(customer.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{customer.name}</p>
                      <p className="flex items-center gap-1 text-xs text-ink-500">
                        <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                        {customer.code} · {customer.region}
                      </p>
                    </div>
                    {selected ? (
                      <Check className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <AddCustomerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
    </StepSection>
  );
}

function CategorySearchSelect({
  value,
  onChange,
  options,
  tabIndex,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  tabIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? 'All categories';

  return (
    <div ref={rootRef} className="relative w-full sm:w-44">
      <button
        type="button"
        tabIndex={tabIndex}
        className="input flex w-full cursor-pointer items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={clsx(
            'h-4 w-4 shrink-0 text-ink-400 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="wizard-category-menu">
          <div className="border-b border-ink-200/40 p-2">
            <label className="relative block">
              <span className="sr-only">Search categories</span>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
                aria-hidden
              />
              <input
                className="input h-9 pl-8 text-sm"
                placeholder="Search categories…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </label>
          </div>
          <ul
            className="wizard-category-menu-list scroll-surface"
            role="listbox"
            aria-label="Categories"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-500">No categories found.</li>
            ) : (
              filtered.map((option) => {
                const selected = value === option.value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={clsx(
                        'wizard-category-option',
                        selected && 'wizard-category-option-active',
                      )}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      {selected ? (
                        <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                      ) : (
                        <span className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                      <span className="truncate">{option.label}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function ModelsStep({
  draft,
  onAddLine,
  onRemove,
  onUpdateLine,
}: {
  draft: CreateOrderDraft;
  onAddLine: (model: ProductModel, quantity: number) => void;
  onRemove: (modelId: string) => void;
  onUpdateLine: (modelId: string, patch: Partial<OrderLineDraft>) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [qtyModal, setQtyModal] = useState<{
    model: ProductModel;
    quantity: number;
    mode: 'add' | 'edit';
  } | null>(null);
  const [activeSelectedId, setActiveSelectedId] = useState<string | null>(
    draft.lines[0]?.modelId ?? null,
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedListRef = useRef<HTMLUListElement>(null);
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const categoryOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All categories' },
      ...MODEL_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
    ],
    [],
  );
  const selectedIds = useMemo(
    () => new Set(draft.lines.map((l) => l.modelId)),
    [draft.lines],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCT_MODELS.filter((m) => {
      const matchCat = category === 'ALL' || m.category === category;
      const matchQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [query, category]);

  const totalQty = draft.lines.reduce((sum, line) => sum + line.quantity, 0);

  useEffect(() => {
    if (draft.lines.length === 0) {
      setActiveSelectedId(null);
      return;
    }
    if (!draft.lines.some((l) => l.modelId === activeSelectedId)) {
      setActiveSelectedId(draft.lines[draft.lines.length - 1]!.modelId);
    }
  }, [draft.lines, activeSelectedId]);

  const openAddQtyModal = (model: ProductModel) => {
    setQtyModal({ model, quantity: 1, mode: 'add' });
  };

  const closeQtyModal = () => setQtyModal(null);

  const confirmQtyModal = (quantity: number) => {
    if (!qtyModal) return;
    const qty = Math.max(1, quantity);
    if (qtyModal.mode === 'add') {
      onAddLine(qtyModal.model, qty);
      setActiveSelectedId(qtyModal.model.id);
    } else {
      onUpdateLine(qtyModal.model.id, { quantity: qty });
    }
    closeQtyModal();
  };

  const handleModelClick = (model: ProductModel) => {
    if (selectedIds.has(model.id)) {
      onRemove(model.id);
      return;
    }
    openAddQtyModal(model);
  };

  const focusSelectedQty = useCallback((modelId: string) => {
    setActiveSelectedId(modelId);
    requestAnimationFrame(() => {
      const input = qtyInputRefs.current[modelId];
      if (!input) return;
      input.focus();
      input.select();
    });
  }, []);

  const goSelectedByOffset = useCallback(
    (delta: number) => {
      if (draft.lines.length === 0) return;
      const current = Math.max(
        0,
        draft.lines.findIndex((l) => l.modelId === activeSelectedId),
      );
      const next = Math.min(
        draft.lines.length - 1,
        Math.max(0, current + delta),
      );
      const line = draft.lines[next]!;
      focusSelectedQty(line.modelId);
    },
    [activeSelectedId, draft.lines, focusSelectedQty],
  );

  const bumpSelectedQty = useCallback(
    (delta: number) => {
      const line =
        draft.lines.find((l) => l.modelId === activeSelectedId) ??
        draft.lines[0];
      if (!line) return;
      const nextQty = Math.max(1, line.quantity + delta);
      onUpdateLine(line.modelId, { quantity: nextQty });
      setActiveSelectedId(line.modelId);
    },
    [activeSelectedId, draft.lines, onUpdateLine],
  );

  const focusCatalog = useCallback(() => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[role="option"]',
    );
    if (buttons && buttons.length > 0) {
      const selectedIdx = Array.from(buttons).findIndex(
        (btn) => btn.getAttribute('aria-selected') === 'true',
      );
      buttons[selectedIdx >= 0 ? selectedIdx : 0]?.focus();
      return;
    }
    searchRef.current?.focus();
  }, []);

  const focusSelectedPanel = useCallback(() => {
    if (draft.lines.length === 0) return;
    const id =
      activeSelectedId &&
      draft.lines.some((l) => l.modelId === activeSelectedId)
        ? activeSelectedId
        : draft.lines[0]!.modelId;
    focusSelectedQty(id);
  }, [activeSelectedId, draft.lines, focusSelectedQty]);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
    searchRef.current?.select();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (qtyModal) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        // Alt+← catalog · Alt+→ selected
        if (e.code === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          focusCatalog();
          return;
        }
        if (e.code === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          focusSelectedPanel();
          return;
        }

        // Alt+↑ / Alt+↓ move within selected list
        if (e.code === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          goSelectedByOffset(1);
          return;
        }
        if (e.code === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          goSelectedByOffset(-1);
          return;
        }

        // Alt+S → search
        if (e.code === 'KeyS') {
          e.preventDefault();
          e.stopPropagation();
          focusSearch();
          return;
        }

        const digitMatch = /^Digit([1-9])$/.exec(e.code);
        if (digitMatch) {
          const idx = Number(digitMatch[1]) - 1;
          const line = draft.lines[idx];
          if (line) {
            e.preventDefault();
            e.stopPropagation();
            focusSelectedQty(line.modelId);
          }
          return;
        }

        if (e.code === 'Equal' || e.code === 'NumpadAdd') {
          e.preventDefault();
          e.stopPropagation();
          bumpSelectedQty(1);
          return;
        }
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          e.stopPropagation();
          bumpSelectedQty(-1);
          return;
        }

        if (e.code === 'KeyX' || e.code === 'Backspace') {
          const line = draft.lines.find((l) => l.modelId === activeSelectedId);
          if (line) {
            e.preventDefault();
            e.stopPropagation();
            onRemove(line.modelId);
          }
          return;
        }
      }

      // / jumps to search when not typing in another field
      if (
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        e.key === '/' &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        focusSearch();
        return;
      }

      // Fast qty adjust without Alt when not typing in a field
      if (!e.altKey && !e.metaKey && !e.ctrlKey && !isTypingTarget(e.target)) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          bumpSelectedQty(1);
          return;
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          bumpSelectedQty(-1);
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [
    activeSelectedId,
    bumpSelectedQty,
    draft.lines,
    focusCatalog,
    focusSearch,
    focusSelectedPanel,
    focusSelectedQty,
    goSelectedByOffset,
    onRemove,
    qtyModal,
  ]);

  return (
    <StepSection className="min-h-0 flex-1" title="Select models">
      <div className="wizard-models-shortcuts shrink-0" aria-label="Keyboard shortcuts">
        <span className="wizard-specs-shortcut">
          <kbd className="wizard-kbd">Alt</kbd>
          <kbd className="wizard-kbd">←</kbd>
          <span>Catalog</span>
        </span>
        <span className="wizard-specs-shortcut">
          <kbd className="wizard-kbd">Alt</kbd>
          <kbd className="wizard-kbd">→</kbd>
          <span>Selected</span>
        </span>
        <span className="wizard-specs-shortcut">
          <kbd className="wizard-kbd">Alt</kbd>
          <kbd className="wizard-kbd">S</kbd>
          <span>Search</span>
        </span>
        <span className="wizard-specs-shortcut">
          <kbd className="wizard-kbd">Alt</kbd>
          <kbd className="wizard-kbd">↑↓</kbd>
          <span>Lines</span>
        </span>
        <span className="wizard-specs-shortcut">
          <kbd className="wizard-kbd">+</kbd>
          <kbd className="wizard-kbd">−</kbd>
          <span>Qty</span>
        </span>
        <span className="wizard-specs-shortcut hidden sm:inline-flex">
          <kbd className="wizard-kbd">Alt</kbd>
          <kbd className="wizard-kbd">X</kbd>
          <span>Remove</span>
        </span>
      </div>

      <div className="mt-1.5 grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,19rem)]">
        <div className="flex min-h-0 flex-col gap-2">
          <div className="wizard-models-toolbar shrink-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="wizard-search-field">
                <span className="sr-only">Search models</span>
                <Search className="wizard-search-icon" strokeWidth={2.5} aria-hidden />
                <input
                  ref={searchRef}
                  id="model-search-input"
                  className="wizard-search-input"
                  placeholder="Search model name or code…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      focusListboxOption(listRef, 0);
                    }
                  }}
                  autoFocus
                />
              </label>
              <CategorySearchSelect
                value={category}
                onChange={setCategory}
                options={categoryOptions}
                tabIndex={-1}
              />
            </div>
          </div>

          <ul
            ref={listRef}
            className="wizard-model-list"
            role="listbox"
            aria-label="Product models"
            aria-multiselectable="true"
          >
            {filtered.length === 0 ? (
              <li className="rounded-xl border border-dashed border-ink-200/80 bg-white/30 px-4 py-8 text-center text-sm text-ink-500">
                No models match your search or filter.
              </li>
            ) : (
              filtered.map((model, index) => {
                const selected = selectedIds.has(model.id);
                return (
                  <li key={model.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => handleModelClick(model)}
                      onKeyDown={(e) =>
                        handleListboxArrowKeys(e, index, listRef, () =>
                          searchRef.current?.focus(),
                        )
                      }
                      className={clsx(
                        'wizard-select-card',
                        selected
                          ? 'wizard-select-card-selected'
                          : 'wizard-select-card-default',
                      )}
                    >
                      <span
                        className={clsx(
                          'wizard-avatar font-mono',
                          selected
                            ? 'bg-brand-600 text-white'
                            : 'bg-ink-100 text-ink-600',
                        )}
                      >
                        {modelInitials(model.code)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink-900">{model.name}</p>
                        <p className="flex items-center gap-1 text-xs text-ink-500">
                          <Package className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="font-mono">{model.code}</span>
                          <span aria-hidden>·</span>
                          {model.category}
                        </p>
                      </div>
                      {selected ? (
                        <Check className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <aside className="wizard-models-selected">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ink-200/40 pb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Selected
            </h2>
            <div className="flex items-center gap-1.5">
              {draft.lines.length > 0 ? (
                <span className="text-2xs font-medium tabular-nums text-ink-500">
                  Qty {totalQty}
                </span>
              ) : null}
              <span
                className={clsx(
                  'inline-flex min-w-[1.5rem] items-center justify-center rounded-lg px-1.5 py-0.5 text-2xs font-bold tabular-nums',
                  draft.lines.length > 0
                    ? 'bg-brand-600/15 text-brand-800'
                    : 'bg-ink-100 text-ink-500',
                )}
              >
                {draft.lines.length}
              </span>
            </div>
          </div>

          {draft.lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-ink-200/70 bg-white/25 px-3 py-8 text-center">
              <Layers className="mb-2 h-8 w-8 text-ink-300" aria-hidden />
              <p className="text-sm font-medium text-ink-600">No models yet</p>
              <p className="mt-1 text-xs text-ink-500">
                Select a model, set qty, then adjust with + / −
              </p>
            </div>
          ) : (
            <ul
              ref={selectedListRef}
              className="wizard-selected-models-list scroll-surface mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5"
            >
              {draft.lines.map((line, idx) => {
                const active = line.modelId === activeSelectedId;
                return (
                  <li key={line.modelId}>
                    <div
                      className={clsx(
                        'wizard-selected-model-card',
                        active && 'wizard-selected-model-card-active',
                      )}
                      onClick={() => setActiveSelectedId(line.modelId)}
                    >
                      <div className="flex items-center gap-2">
                        <kbd className="wizard-specs-hotkey">{idx + 1}</kbd>
                        <span className="wizard-avatar h-8 w-8 shrink-0 bg-brand-600/10 font-mono text-2xs text-brand-800">
                          {modelInitials(line.modelCode)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight text-ink-900">
                            {line.modelName}
                          </p>
                          <p className="font-mono text-2xs leading-tight text-ink-500">
                            {line.modelCode}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost h-8 w-8 min-h-0 shrink-0 rounded-lg p-0 text-ink-400 hover:text-danger-700"
                          aria-label={`Remove ${line.modelName}`}
                          title="Alt+X"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(line.modelId);
                          }}
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <div className="wizard-qty-stepper mt-2">
                        <button
                          type="button"
                          className="wizard-qty-stepper-btn"
                          aria-label={`Decrease quantity for ${line.modelName}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSelectedId(line.modelId);
                            onUpdateLine(line.modelId, {
                              quantity: Math.max(1, line.quantity - 1),
                            });
                          }}
                        >
                          −
                        </button>
                        <label className="sr-only" htmlFor={`qty-${line.modelId}`}>
                          Quantity for {line.modelName}
                        </label>
                        <input
                          ref={(el) => {
                            qtyInputRefs.current[line.modelId] = el;
                          }}
                          id={`qty-${line.modelId}`}
                          type="text"
                          inputMode="numeric"
                          className="wizard-qty-stepper-input"
                          value={line.quantity}
                          onFocus={() => setActiveSelectedId(line.modelId)}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            const next = Math.max(1, Number(digits) || 1);
                            onUpdateLine(line.modelId, { quantity: next });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              onUpdateLine(line.modelId, {
                                quantity: line.quantity + 1,
                              });
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              onUpdateLine(line.modelId, {
                                quantity: Math.max(1, line.quantity - 1),
                              });
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              goSelectedByOffset(1);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="wizard-qty-stepper-btn"
                          aria-label={`Increase quantity for ${line.modelName}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSelectedId(line.modelId);
                            onUpdateLine(line.modelId, {
                              quantity: line.quantity + 1,
                            });
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <ModelQuantityModal
        open={qtyModal !== null}
        model={qtyModal?.model ?? null}
        quantity={qtyModal?.quantity ?? 1}
        mode={qtyModal?.mode ?? 'add'}
        onQuantityChange={(quantity) =>
          setQtyModal((current) => (current ? { ...current, quantity } : null))
        }
        onClose={closeQtyModal}
        onConfirm={confirmQtyModal}
      />
    </StepSection>
  );
}

const SpecFieldInput = memo(function SpecFieldInput({
  field,
  value,
  detailValue,
  options: optionsOverride,
  onChange,
  onPatch,
  autoFocus,
}: {
  field: SpecField;
  value: string | number;
  detailValue?: string | number;
  /** Overrides field.options (used for customer/brand-linked selects). */
  options?: string[];
  onChange: (key: string, value: string | number) => void;
  onPatch?: (patch: Record<string, string | number>) => void;
  autoFocus?: boolean;
}) {
  const id = `spec-${field.key}`;
  const selectOptions = optionsOverride ?? field.options;

  if (field.type === 'customise') {
    const customise = isCustomiseMode(value);
    return (
      <div className="wizard-customise-field">
        <div className="wizard-mode-toggle" role="group" aria-label={field.label}>
          {(selectOptions ?? ['Regular', 'Customise']).map((opt) => (
            <button
              key={opt}
              type="button"
              className={clsx(
                'wizard-mode-toggle-btn',
                String(value) === opt && 'wizard-mode-toggle-btn-active',
              )}
              aria-pressed={String(value) === opt}
              onClick={() => {
                if (String(value) === opt) return;
                if (opt !== 'Customise' && field.detailKey) {
                  onPatch?.({ [field.key]: opt, [field.detailKey]: '' });
                } else {
                  onChange(field.key, opt);
                }
              }}
            >
              {opt}
            </button>
          ))}
        </div>
        {customise && field.detailKey ? (
          <RichTextBox
            id={`${id}-detail`}
            value={String(detailValue ?? '')}
            placeholder={field.placeholder ?? 'Describe customisation details…'}
            onChange={(html) => onChange(field.detailKey!, html)}
          />
        ) : null}
      </div>
    );
  }

  if (field.type === 'select') {
    const empty = !selectOptions || selectOptions.length === 0;
    return (
      <select
        id={id}
        className="input cursor-pointer py-1.5 text-sm"
        value={String(value)}
        autoFocus={autoFocus}
        onChange={(e) => onChange(field.key, e.target.value)}
        required={field.required}
        disabled={empty}
      >
        {empty ? (
          <option value="">
            {field.key === 'panel_sticker'
              ? 'Select a brand first'
              : 'No options available'}
          </option>
        ) : (
          <>
            {!value ? <option value="">Select…</option> : null}
            {selectOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </>
        )}
      </select>
    );
  }

  if (field.type === 'number') {
    return (
      <input
        id={id}
        type="number"
        className="input py-1.5 text-sm"
        value={value === '' ? '' : value}
        min={0}
        step="any"
        placeholder={field.placeholder}
        autoFocus={autoFocus}
        onChange={(e) =>
          onChange(
            field.key,
            e.target.value === '' ? '' : Number(e.target.value),
          )
        }
        required={field.required}
      />
    );
  }

  return (
    <input
      id={id}
      type="text"
      className="input py-1.5 text-sm"
      value={String(value)}
      placeholder={field.placeholder}
      autoFocus={autoFocus}
      onChange={(e) => onChange(field.key, e.target.value)}
      required={field.required}
    />
  );
});

function RichTextBox({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const run = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    onChange(editorRef.current?.innerHTML ?? '');
  };

  return (
    <div className="wizard-richtext">
      <div className="wizard-richtext-toolbar" role="toolbar" aria-label="Formatting">
        <button
          type="button"
          className="wizard-richtext-btn"
          aria-label="Bold"
          onMouseDown={(e) => {
            e.preventDefault();
            run('bold');
          }}
        >
          <Bold className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className="wizard-richtext-btn"
          aria-label="Italic"
          onMouseDown={(e) => {
            e.preventDefault();
            run('italic');
          }}
        >
          <Italic className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className="wizard-richtext-btn"
          aria-label="Bullet list"
          onMouseDown={(e) => {
            e.preventDefault();
            run('insertUnorderedList');
          }}
        >
          <List className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div
        ref={editorRef}
        id={id}
        className="wizard-richtext-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
        onBlur={() => onChange(editorRef.current?.innerHTML ?? '')}
      />
    </div>
  );
}

function SpecsStep({
  draft,
  customer,
  onUpdateLine,
  onApplySharedSpecs,
}: {
  draft: CreateOrderDraft;
  customer: Customer | null;
  onUpdateLine: (modelId: string, patch: Partial<OrderLineDraft>) => void;
  onApplySharedSpecs: (specs: Record<string, string | number>) => void;
}) {
  const [activeModelId, setActiveModelId] = useState(draft.lines[0]?.modelId ?? '');
  const [flashHint, setFlashHint] = useState<string | null>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!draft.lines.some((l) => l.modelId === activeModelId)) {
      setActiveModelId(draft.lines[0]?.modelId ?? '');
    }
  }, [draft.lines, activeModelId]);

  const activeIndex = draft.lines.findIndex((l) => l.modelId === activeModelId);
  const activeLine = activeIndex >= 0 ? draft.lines[activeIndex] : draft.lines[0];
  const activeModel = activeLine ? getModelById(activeLine.modelId) : null;
  const completedCount = draft.lines.filter((l) =>
    isLineSpecsComplete(l, customer),
  ).length;
  const progressPct =
    draft.lines.length === 0
      ? 0
      : Math.round((completedCount / draft.lines.length) * 100);

  const brandOptions = useMemo(
    () => (customer?.brands ?? []).map((b) => b.name),
    [customer],
  );
  const stickerOptions = useMemo(() => {
    const brandName = activeLine ? String(activeLine.specs.brand_name ?? '') : '';
    return (
      customer?.brands.find((b) => b.name === brandName)?.panelStickers ?? []
    );
  }, [customer, activeLine]);

  const resolveSelectOptions = (key: string) => {
    if (key === 'brand_name') return brandOptions;
    if (key === 'panel_sticker') return stickerOptions;
    return undefined;
  };

  const patchSpec = (key: string, value: string | number) => {
    if (!activeLine) return;
    if (key === 'brand_name') {
      const stickers =
        customer?.brands.find((b) => b.name === String(value))?.panelStickers ??
        [];
      const current = String(activeLine.specs.panel_sticker ?? '');
      const nextSticker = stickers.includes(current) ? current : (stickers[0] ?? '');
      onUpdateLine(activeLine.modelId, {
        specs: {
          ...activeLine.specs,
          brand_name: value,
          panel_sticker: nextSticker,
        },
      });
      return;
    }
    onUpdateLine(activeLine.modelId, {
      specs: { ...activeLine.specs, [key]: value },
    });
  };

  const patchSpecs = (patch: Record<string, string | number>) => {
    if (!activeLine) return;
    onUpdateLine(activeLine.modelId, {
      specs: { ...activeLine.specs, ...patch },
    });
  };

  const goToModel = useCallback(
    (modelId: string) => {
      setActiveModelId(modelId);
      requestAnimationFrame(() => {
        formTopRef.current
          ?.querySelector<HTMLElement>('select, input, button')
          ?.focus();
      });
    },
    [],
  );

  const goNextModel = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= draft.lines.length - 1) return false;
    goToModel(draft.lines[activeIndex + 1]!.modelId);
    return true;
  }, [activeIndex, draft.lines, goToModel]);

  const goPrevModel = useCallback(() => {
    if (activeIndex <= 0) return false;
    goToModel(draft.lines[activeIndex - 1]!.modelId);
    return true;
  }, [activeIndex, draft.lines, goToModel]);

  const copyFromPrevious = useCallback(() => {
    if (activeIndex <= 0 || !activeLine) return;
    const prev = draft.lines[activeIndex - 1]!;
    onUpdateLine(activeLine.modelId, { specs: { ...prev.specs } });
    setFlashHint('Copied specs from previous model');
  }, [activeIndex, activeLine, draft.lines, onUpdateLine]);

  const applyToAll = useCallback(() => {
    if (!activeLine) return;
    onApplySharedSpecs({ ...activeLine.specs });
    setFlashHint('Applied current specs to all models');
  }, [activeLine, onApplySharedSpecs]);

  useEffect(() => {
    if (!flashHint) return;
    const t = window.setTimeout(() => setFlashHint(null), 1800);
    return () => window.clearTimeout(t);
  }, [flashHint]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (!e.altKey || e.metaKey || e.ctrlKey) return;

      // Prefer e.code — on macOS Option+number changes e.key to symbols (¡™£…).
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        if (!goNextModel()) setFlashHint('Already on last model');
        return;
      }
      if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        if (!goPrevModel()) setFlashHint('Already on first model');
        return;
      }

      const digitMatch = /^Digit([1-9])$/.exec(e.code);
      if (digitMatch) {
        const idx = Number(digitMatch[1]) - 1;
        const line = draft.lines[idx];
        if (line) {
          e.preventDefault();
          e.stopPropagation();
          goToModel(line.modelId);
          setFlashHint(`Switched to model ${idx + 1}`);
        }
        return;
      }

      if (e.code === 'KeyC') {
        e.preventDefault();
        e.stopPropagation();
        copyFromPrevious();
        return;
      }
      if (e.code === 'KeyA') {
        e.preventDefault();
        e.stopPropagation();
        applyToAll();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [applyToAll, copyFromPrevious, draft.lines, goNextModel, goPrevModel, goToModel]);

  if (!activeLine || !activeModel) {
    return (
      <StepSection
        title="Technical specifications"
        description="Select models first, then set customisation for each line."
      >
        <p className="rounded-xl border border-dashed border-ink-200/70 bg-white/30 px-4 py-8 text-center text-sm text-ink-500">
          No models selected.
        </p>
      </StepSection>
    );
  }

  const selectFields = activeModel.specs.filter((f) => f.type === 'select');
  const customiseFields = activeModel.specs.filter((f) => f.type === 'customise');
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < draft.lines.length - 1;

  return (
    <StepSection
      className="min-h-0 flex-1"
      title="Technical specifications"
    >
      <div className="wizard-specs-layout">
        <aside className="wizard-specs-rail" aria-label="Models in this order">
          <div className="border-b border-ink-200/50 pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Models
              </h3>
              <span className="text-2xs font-bold tabular-nums text-ink-700">
                {completedCount}/{draft.lines.length}
              </span>
            </div>
            <div
              className="wizard-specs-progress mt-2"
              role="progressbar"
              aria-valuenow={completedCount}
              aria-valuemin={0}
              aria-valuemax={draft.lines.length}
              aria-label="Models complete"
            >
              <span style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <ul
            ref={railRef}
            className="wizard-specs-rail-list scroll-surface"
            role="tablist"
            aria-orientation="vertical"
          >
            {draft.lines.map((line, idx) => {
              const complete = isLineSpecsComplete(line, customer);
              const active = line.modelId === activeLine.modelId;
              return (
                <li key={line.modelId}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    title={`Alt+${idx + 1} — ${line.modelName}`}
                    className={clsx(
                      'wizard-specs-rail-item',
                      active && 'wizard-specs-rail-item-active',
                      complete && !active && 'wizard-specs-rail-item-done',
                    )}
                    onClick={() => goToModel(line.modelId)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = draft.lines[idx + 1];
                        if (next) {
                          goToModel(next.modelId);
                          railRef.current
                            ?.querySelectorAll<HTMLButtonElement>('button[role="tab"]')
                            [idx + 1]?.focus();
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = draft.lines[idx - 1];
                        if (prev) {
                          goToModel(prev.modelId);
                          railRef.current
                            ?.querySelectorAll<HTMLButtonElement>('button[role="tab"]')
                            [idx - 1]?.focus();
                        }
                      }
                    }}
                  >
                    <kbd className="wizard-specs-hotkey">{idx + 1}</kbd>
                    <span
                      className={clsx(
                        'wizard-avatar h-9 w-9 shrink-0 font-mono text-2xs',
                        active
                          ? 'bg-brand-600 text-white'
                          : 'bg-ink-100 text-ink-600',
                      )}
                    >
                      {modelInitials(line.modelCode)}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-semibold">
                        {line.modelName}
                      </span>
                      <span className="block truncate font-mono text-2xs text-ink-500">
                        {line.modelCode} · Qty {line.quantity}
                      </span>
                    </span>
                    {complete ? (
                      <Check className="h-4 w-4 shrink-0 text-success-700" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto flex flex-col gap-1.5 border-t border-ink-200/50 pt-2.5">
            <button
              type="button"
              className="btn-ghost min-h-9 w-full justify-between gap-1.5 px-2.5 text-xs"
              disabled={!canPrev}
              onClick={copyFromPrevious}
              title="Alt+C"
            >
              <span className="inline-flex items-center gap-1.5">
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy previous
              </span>
              <kbd className="wizard-kbd">Alt C</kbd>
            </button>
            <button
              type="button"
              className="btn-secondary min-h-9 w-full justify-between text-xs"
              disabled={draft.lines.length < 2}
              onClick={applyToAll}
              title="Alt+A"
            >
              <span>Apply to all</span>
              <kbd className="wizard-kbd wizard-kbd-on-secondary">Alt A</kbd>
            </button>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
          <div className="wizard-specs-shortcuts shrink-0" aria-label="Keyboard shortcuts">
            <span className="wizard-specs-shortcut">
              <kbd className="wizard-kbd">Alt</kbd>
              <kbd className="wizard-kbd">↓</kbd>
              <span>Next model</span>
            </span>
            <span className="wizard-specs-shortcut">
              <kbd className="wizard-kbd">Alt</kbd>
              <kbd className="wizard-kbd">↑</kbd>
              <span>Previous</span>
            </span>
            <span className="wizard-specs-shortcut">
              <kbd className="wizard-kbd">Alt</kbd>
              <kbd className="wizard-kbd">1–9</kbd>
              <span>Jump</span>
            </span>
            <span className="wizard-specs-shortcut hidden sm:inline-flex">
              <kbd className="wizard-kbd">Tab</kbd>
              <span>Fields</span>
            </span>
          </div>

          {flashHint ? (
            <p className="wizard-specs-toast" role="status">
              {flashHint}
            </p>
          ) : null}

          <div
            ref={formTopRef}
            key={activeLine.modelId}
            className="wizard-specs-form scroll-surface min-h-0 flex-1 overflow-y-auto"
            role="tabpanel"
            aria-label={`${activeLine.modelName} specifications`}
          >
            <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-ink-200/45 pb-3">
              <span className="wizard-avatar h-11 w-11 shrink-0 bg-brand-600 text-sm text-white">
                {modelInitials(activeLine.modelCode)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-ink-900">
                  {activeLine.modelName}
                </p>
                <p className="font-mono text-xs text-ink-500">
                  {activeLine.modelCode} · Model {activeIndex + 1} of{' '}
                  {draft.lines.length}
                  {isLineSpecsComplete(activeLine, customer)
                    ? ' · Complete'
                    : ''}
                </p>
              </div>
              <label className="shrink-0">
                <span className="mb-0.5 block text-2xs font-semibold uppercase tracking-wide text-ink-400">
                  Qty
                </span>
                <input
                  type="number"
                  min={1}
                  className="input w-[4.5rem] py-1.5 text-center text-sm font-semibold tabular-nums"
                  value={activeLine.quantity}
                  onChange={(e) =>
                    onUpdateLine(activeLine.modelId, {
                      quantity: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </label>
            </div>

            <section className="wizard-specs-section" aria-labelledby="appearance-heading">
              <h3 id="appearance-heading" className="wizard-specs-section-title">
                Appearance & branding
              </h3>
              <p className="mb-3 text-2xs text-ink-500">
                Brand Name comes from the selected customer. Panel Sticker options
                depend on the brand.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {selectFields.map((field, idx) => (
                  <div key={field.key} className="min-w-0">
                    <label
                      htmlFor={`spec-${field.key}`}
                      className="mb-1 block text-xs font-semibold text-ink-600"
                    >
                      {field.label}
                      {field.required ? ' *' : ''}
                    </label>
                    <SpecFieldInput
                      field={field}
                      value={activeLine.specs[field.key] ?? ''}
                      options={resolveSelectOptions(field.key)}
                      autoFocus={idx === 0}
                      onChange={patchSpec}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section
              className="wizard-specs-section mt-4"
              aria-labelledby="options-heading"
            >
              <h3 id="options-heading" className="wizard-specs-section-title">
                Accessories & packing
              </h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {customiseFields.map((field) => (
                  <div key={field.key} className="wizard-specs-option-card min-w-0">
                    <p className="mb-2 text-xs font-semibold text-ink-700">
                      {field.label}
                      {field.required ? ' *' : ''}
                    </p>
                    <SpecFieldInput
                      field={field}
                      value={activeLine.specs[field.key] ?? 'Regular'}
                      detailValue={
                        field.detailKey
                          ? activeLine.specs[field.detailKey] ?? ''
                          : ''
                      }
                      onChange={patchSpec}
                      onPatch={patchSpecs}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {draft.lines.length > 1 ? (
            <div className="wizard-specs-switcher shrink-0">
              <button
                type="button"
                className="btn-ghost min-h-10 flex-1 gap-2 sm:flex-none sm:min-w-[9rem]"
                disabled={!canPrev}
                onClick={goPrevModel}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Previous
                <kbd className="wizard-kbd hidden sm:inline">Alt ↑</kbd>
              </button>
              <p className="hidden text-center text-2xs font-medium tabular-nums text-ink-500 md:block">
                {activeIndex + 1} / {draft.lines.length}
              </p>
              <button
                type="button"
                className="btn-primary min-h-10 flex-1 gap-2 sm:flex-none sm:min-w-[9rem]"
                disabled={!canNext}
                onClick={goNextModel}
              >
                Next model
                <ArrowRight className="h-4 w-4" aria-hidden />
                <kbd className="wizard-kbd wizard-kbd-on-primary hidden sm:inline">
                  Alt ↓
                </kbd>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </StepSection>
  );
}

function ReviewStep({
  draft,
  customerName,
  customer,
}: {
  draft: CreateOrderDraft;
  customerName: string;
  customer: Customer | null;
}) {
  const totalQty = draft.lines.reduce((s, l) => s + l.quantity, 0);
  const checklist = [
    { label: 'Customer', done: !!customerName },
    { label: 'Models', done: draft.lines.length > 0 },
    {
      label: 'Specs',
      done:
        draft.lines.length > 0 &&
        draft.lines.every((l) => isLineSpecsComplete(l, customer)),
    },
    { label: 'Schedule', done: !!draft.dueDate },
  ];
  const allReady = checklist.every((item) => item.done);

  return (
    <StepSection className="min-h-0 flex-1" title="Review order">
      <div className="wizard-review scroll-surface min-h-0 flex-1 space-y-3 overflow-y-auto">
        <div className="wizard-review-hero">
          <div className="flex min-w-0 items-center gap-3">
            <span className="wizard-avatar h-11 w-11 shrink-0 bg-brand-600 text-sm text-white">
              {customerInitials(customerName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink-900">
                {customerName}
              </p>
              <p className="text-xs text-ink-500">
                {draft.lines.length} model{draft.lines.length === 1 ? '' : 's'} ·{' '}
                {totalQty} total qty
              </p>
            </div>
          </div>

          <div className="wizard-review-meta">
            <div className="wizard-review-meta-item">
              <Calendar className="h-3.5 w-3.5 text-ink-400" aria-hidden />
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
                  Due
                </p>
                <p className="text-sm font-semibold text-ink-900">
                  {draft.dueDate ? formatDueLabel(draft.dueDate) : '—'}
                </p>
              </div>
            </div>
            <div className="wizard-review-meta-item">
              <Flag className="h-3.5 w-3.5 text-ink-400" aria-hidden />
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
                  Priority
                </p>
                <span
                  className={clsx(
                    'wizard-review-priority',
                    draft.priority === 'High' && 'wizard-review-priority-high',
                    draft.priority === 'Medium' && 'wizard-review-priority-medium',
                    draft.priority === 'Low' && 'wizard-review-priority-low',
                  )}
                >
                  {draft.priority}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="wizard-review-ready">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Ready to create
            </p>
            <span
              className={clsx(
                'rounded-md px-2 py-0.5 text-2xs font-bold',
                allReady
                  ? 'bg-brand-600/15 text-brand-800'
                  : 'bg-ink-100 text-ink-500',
              )}
            >
              {checklist.filter((i) => i.done).length}/{checklist.length}
            </span>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {checklist.map((item) => (
              <li
                key={item.label}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium',
                  item.done
                    ? 'border-ink-200/60 bg-white text-ink-800'
                    : 'border-dashed border-ink-200/70 bg-ink-50/80 text-ink-400',
                )}
              >
                {item.done ? (
                  <Check className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-ink-300" aria-hidden />
                )}
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        {draft.notes ? (
          <div className="wizard-review-notes">
            <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
              Planner notes
            </p>
            <p className="mt-1 text-sm text-ink-700">{draft.notes}</p>
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Models & customisation
            </h3>
            <span className="text-2xs font-medium tabular-nums text-ink-500">
              {draft.lines.length} line{draft.lines.length === 1 ? '' : 's'}
            </span>
          </div>

          <ul className="space-y-2">
            {draft.lines.map((line, idx) => {
              const model = getModelById(line.modelId);
              const selectFields =
                model?.specs.filter((f) => f.type === 'select') ?? [];
              const customiseFields =
                model?.specs.filter((f) => f.type === 'customise') ?? [];

              return (
                <li key={line.modelId} className="wizard-review-line">
                  <div className="flex items-start gap-3 border-b border-ink-200/40 pb-2.5">
                    <span className="wizard-specs-hotkey mt-0.5">{idx + 1}</span>
                    <span className="wizard-avatar h-9 w-9 shrink-0 bg-brand-600/10 font-mono text-2xs text-brand-800">
                      {modelInitials(line.modelCode)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">
                        {line.modelName}
                      </p>
                      <p className="font-mono text-2xs text-ink-500">
                        {line.modelCode}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-ink-100 px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-ink-800">
                      ×{line.quantity}
                    </span>
                  </div>

                  {selectFields.length > 0 ? (
                    <div className="mt-2.5">
                      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                        Appearance & branding
                      </p>
                      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {selectFields.map((field) => (
                          <div key={field.key} className="wizard-review-spec">
                            <dt>{field.label}</dt>
                            <dd>
                              {specDisplayValue(field, line.specs[field.key])}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}

                  {customiseFields.length > 0 ? (
                    <div className="mt-2.5">
                      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                        Accessories & packing
                      </p>
                      <dl className="grid gap-2 sm:grid-cols-2">
                        {customiseFields.map((field) => (
                          <div key={field.key} className="wizard-review-spec">
                            <dt>{field.label}</dt>
                            <dd>
                              {specDisplayValue(
                                field,
                                line.specs[field.key],
                                field.detailKey
                                  ? line.specs[field.detailKey]
                                  : undefined,
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </StepSection>
  );
}

export function CreateOrderPage() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>(() => cloneCustomers(CUSTOMERS));
  const [draft, setDraft] = useState<CreateOrderDraft>(() => ({
    ...INITIAL_CREATE_ORDER_DRAFT,
    dueDate: addDays(14),
  }));
  const [error, setError] = useState<string | null>(null);

  const step = WIZARD_STEPS[stepIdx]!.id;
  const customer = draft.customerId
    ? customers.find((c) => c.id === draft.customerId)
    : null;

  const goToStep = useCallback((target: WizardStep) => {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === target);
    if (idx >= 0) setStepIdx(idx);
    setError(null);
  }, []);

  const next = () => {
    const err = validateStep(step, draft);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (stepIdx < WIZARD_STEPS.length - 1) {
      setStepIdx((i) => i + 1);
    }
  };

  const back = () => {
    setError(null);
    if (stepIdx > 0) setStepIdx((i) => i - 1);
    else navigate('/orders');
  };

  const submit = () => {
    const err = validateStep('details', draft);
    if (err) {
      setError(err);
      return;
    }
    if (!customer) return;

    const newOrder: DummyOrder = {
      id: String(Date.now()),
      orderNumber: 'ORD-NEW',
      customerName: customer.name,
      products: draft.lines.map((line) => ({
        name: line.modelName,
        quantity: line.quantity,
        modelId: line.modelId,
        specs: { ...line.specs },
      })),
      status: 'DRAFT',
      orderDate: new Date().toISOString().slice(0, 10),
      dueDate: draft.dueDate,
      priority: draft.priority,
      orderType: 'Standard',
      machineId: 'm1',
    };

    navigate('/orders', { state: { newOrder }, replace: false });
  };

  const addModelLine = (model: ProductModel, quantity: number) => {
    setDraft((d) => {
      if (d.lines.some((l) => l.modelId === model.id)) return d;
      const specs = defaultSpecsForModel(model);
      const selected = customers.find((c) => c.id === d.customerId) ?? null;
      const firstBrand = selected?.brands[0]?.name ?? '';
      const firstSticker =
        selected?.brands.find((b) => b.name === firstBrand)?.panelStickers[0] ??
        '';
      specs.brand_name = firstBrand;
      specs.panel_sticker = firstSticker;
      const line: OrderLineDraft = {
        modelId: model.id,
        modelName: model.name,
        modelCode: model.code,
        quantity: Math.max(1, quantity),
        specs,
      };
      return { ...d, lines: [...d.lines, line] };
    });
  };

  const nextRef = useRef(next);
  const submitRef = useRef(submit);
  const backRef = useRef(back);
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  nextRef.current = next;
  submitRef.current = submit;
  backRef.current = back;

  const focusDueDate = useCallback(() => {
    dueDateInputRef.current?.focus();
  }, []);

  const pendingFocusDueRef = useRef(false);
  const requestFocusDueDate = useCallback(() => {
    pendingFocusDueRef.current = true;
    // Retry — panel may not be mounted until after customer state commits.
    requestAnimationFrame(() => {
      focusDueDate();
      requestAnimationFrame(() => focusDueDate());
    });
  }, [focusDueDate]);

  const currentStepMeta = WIZARD_STEPS[stepIdx]!;
  const showSchedulePanel = !!customer && step === 'customer';

  useEffect(() => {
    if (!showSchedulePanel || !pendingFocusDueRef.current) return;
    pendingFocusDueRef.current = false;
    const t = window.setTimeout(() => focusDueDate(), 0);
    return () => window.clearTimeout(t);
  }, [showSchedulePanel, focusDueDate]);

  useEffect(() => {
    document.documentElement.classList.add('create-order-route');
    return () => document.documentElement.classList.remove('create-order-route');
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (
        e.target instanceof HTMLElement &&
        e.target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (step === 'details') submitRef.current();
        else nextRef.current();
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        backRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [step]);

  return (
    <div className="create-order-page">
      <div className="create-order-header">
        <div className="flex items-start gap-2 sm:items-center sm:gap-3">
          <Link
            to="/orders"
            className="btn-ghost inline-flex min-h-9 shrink-0 gap-1.5 px-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Back to orders</span>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold tracking-tight text-ink-900 sm:text-base">
              Create new order
            </h1>
            <p className="text-2xs text-ink-600 sm:text-xs">
              {currentStepMeta.description}
            </p>
          </div>
        </div>

        <Stepper current={step} onJump={goToStep} />
      </div>

      <div className="create-order-scroll">
        <div
          className={clsx(
            'create-order-body',
            !showSchedulePanel && 'lg:grid-cols-1',
            showSchedulePanel && 'create-order-body-with-sidebar',
          )}
        >
          <div
            className={clsx(
              'wizard-main-panel',
              step !== 'customer' &&
                step !== 'models' &&
                step !== 'specs' &&
                step !== 'details' &&
                'scroll-surface overflow-y-auto',
            )}
          >
            {step === 'customer' ? (
              <CustomerStep
                draft={draft}
                customers={customers}
                onAddCustomer={(c) => setCustomers((list) => [...list, c])}
                onFocusDueDate={requestFocusDueDate}
                onSelect={(customerId) =>
                  setDraft((d) => {
                    if (d.customerId === customerId) return d;
                    const selected =
                      customers.find((c) => c.id === customerId) ?? null;
                    const firstBrand = selected?.brands[0]?.name ?? '';
                    const firstSticker =
                      selected?.brands.find((b) => b.name === firstBrand)
                        ?.panelStickers[0] ?? '';
                    return {
                      ...d,
                      customerId,
                      lines: d.lines.map((line) => ({
                        ...line,
                        specs: {
                          ...line.specs,
                          brand_name: firstBrand,
                          panel_sticker: firstSticker,
                        },
                      })),
                    };
                  })
                }
              />
            ) : null}
            {step === 'models' ? (
              <ModelsStep
                draft={draft}
                onAddLine={addModelLine}
                onRemove={(modelId) =>
                  setDraft((d) => ({
                    ...d,
                    lines: d.lines.filter((l) => l.modelId !== modelId),
                  }))
                }
                onUpdateLine={(modelId, patch) =>
                  setDraft((d) => ({
                    ...d,
                    lines: d.lines.map((l) =>
                      l.modelId === modelId ? { ...l, ...patch } : l,
                    ),
                  }))
                }
              />
            ) : null}
            {step === 'specs' ? (
              <SpecsStep
                draft={draft}
                customer={customer ?? null}
                onUpdateLine={(modelId, patch) =>
                  setDraft((d) => ({
                    ...d,
                    lines: d.lines.map((l) =>
                      l.modelId === modelId ? { ...l, ...patch } : l,
                    ),
                  }))
                }
                onApplySharedSpecs={(specs) =>
                  setDraft((d) => ({
                    ...d,
                    lines: d.lines.map((l) => ({
                      ...l,
                      specs: { ...specs },
                    })),
                  }))
                }
              />
            ) : null}
            {step === 'details' && customer ? (
              <ReviewStep
                draft={draft}
                customerName={customer.name}
                customer={customer}
              />
            ) : null}

            {error ? (
              <p className="mt-3 text-sm font-medium text-danger-700" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          {showSchedulePanel ? (
            <div className="wizard-side-panel">
              <OrderSchedulePanel
                draft={draft}
                customerName={customer.name}
                customer={customer}
                dueDateRef={dueDateInputRef}
                onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
              />
            </div>
          ) : null}
        </div>
      </div>

      <footer className="create-order-footer">
        <div className="create-order-footer-inner">
          <button
            type="button"
            className="btn-secondary flex-1 sm:flex-none sm:min-w-[5.5rem]"
            onClick={back}
          >
            {stepIdx === 0 ? 'Cancel' : 'Back'}
          </button>
          {step === 'details' ? (
            <button
              type="button"
              className="btn-primary flex-1 sm:flex-none sm:min-w-[8.5rem]"
              onClick={submit}
            >
              Create order
            </button>
          ) : (
            <button
              id="wizard-next-btn"
              type="button"
              className="btn-primary flex-1 sm:flex-none sm:min-w-[5.5rem]"
              onClick={next}
            >
              Next
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
