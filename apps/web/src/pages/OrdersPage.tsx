import {
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Factory,
  Filter,
  LayoutList,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
  Tags,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getModelById } from '../data/models';
import { specDisplayValue } from '../utils/createOrderValidation';
import {
  exportOrdersCsv,
  printOrder,
  printOrders,
} from '../utils/orderExport';
import {
  DUMMY_ORDERS,
  MACHINES,
  ORDER_KPIS,
  dueDaysLabel,
  orderTotalQty,
  type DummyOrder,
  type OrderStatus,
} from '../data/dummy';
import {
  EmptyState,
  KpiCard,
  MachineStatusBadge,
  Modal,
  OrderTypeBadge,
  PageHeader,
  StatusBadge,
} from '../components/ui';

const PAGE_SIZE = 10;
const PRIORITIES: DummyOrder['priority'][] = ['Low', 'Medium', 'High'];
const STATUS_OPTIONS: OrderStatus[] = [
  'DRAFT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'COMPLETED',
  'CANCELLED',
];

type SortKey = 'orderNumber' | 'customerName' | 'dueDate' | 'status';
type ViewMode = 'orders' | 'product' | 'orderType';
type FilterField =
  | 'orderNumbers'
  | 'customers'
  | 'products'
  | 'priorities'
  | 'statuses'
  | 'orderDate'
  | 'dueDate'
  | 'qty';

type ColumnFilters = {
  orderDateFrom: string;
  orderDateTo: string;
  dueDateFrom: string;
  dueDateTo: string;
  qtyMin: string;
  qtyMax: string;
  orderNumbers: string[];
  customers: string[];
  products: string[];
  priorities: DummyOrder['priority'][];
  statuses: OrderStatus[];
};

const EMPTY_FILTERS: ColumnFilters = {
  orderDateFrom: '',
  orderDateTo: '',
  dueDateFrom: '',
  dueDateTo: '',
  qtyMin: '',
  qtyMax: '',
  orderNumbers: [],
  customers: [],
  products: [],
  priorities: [],
  statuses: [],
};

function countActiveFilters(filters: ColumnFilters) {
  let count = 0;
  if (filters.orderDateFrom || filters.orderDateTo) count += 1;
  if (filters.dueDateFrom || filters.dueDateTo) count += 1;
  if (filters.qtyMin || filters.qtyMax) count += 1;
  count +=
    filters.orderNumbers.length +
    filters.customers.length +
    filters.products.length +
    filters.priorities.length +
    filters.statuses.length;
  return count;
}

function matchesDateRange(date: string, from: string, to: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

type FilterSection =
  | 'order'
  | 'orderDate'
  | 'dueDate'
  | 'quantity'
  | 'customer'
  | 'priority'
  | 'status'
  | 'product';

const FILTER_SECTIONS: { id: FilterSection; label: string }[] = [
  { id: 'order', label: 'Order' },
  { id: 'orderDate', label: 'Order date' },
  { id: 'dueDate', label: 'Due date' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'customer', label: 'Customer' },
  { id: 'priority', label: 'Priority' },
  { id: 'status', label: 'Status' },
  { id: 'product', label: 'Product' },
];

function getModalRoot(): HTMLElement {
  return document.getElementById('modal-root') ?? document.body;
}

function sectionActiveCount(section: FilterSection, filters: ColumnFilters) {
  switch (section) {
    case 'order':
      return filters.orderNumbers.length;
    case 'orderDate':
      return filters.orderDateFrom || filters.orderDateTo ? 1 : 0;
    case 'dueDate':
      return filters.dueDateFrom || filters.dueDateTo ? 1 : 0;
    case 'quantity':
      return filters.qtyMin || filters.qtyMax ? 1 : 0;
    case 'customer':
      return filters.customers.length;
    case 'priority':
      return filters.priorities.length;
    case 'status':
      return filters.statuses.length;
    case 'product':
      return filters.products.length;
  }
}

function clearFilterSection(
  section: FilterSection,
  filters: ColumnFilters,
): ColumnFilters {
  switch (section) {
    case 'order':
      return { ...filters, orderNumbers: [] };
    case 'orderDate':
      return { ...filters, orderDateFrom: '', orderDateTo: '' };
    case 'dueDate':
      return { ...filters, dueDateFrom: '', dueDateTo: '' };
    case 'quantity':
      return { ...filters, qtyMin: '', qtyMax: '' };
    case 'customer':
      return { ...filters, customers: [] };
    case 'priority':
      return { ...filters, priorities: [] };
    case 'status':
      return { ...filters, statuses: [] };
    case 'product':
      return { ...filters, products: [] };
  }
}

function countBy<T extends string>(
  items: T[],
  values: readonly T[],
): Map<T, number> {
  const map = new Map<T, number>(values.map((v) => [v, 0]));
  for (const item of items) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return map;
}

function PriorityLabel({ priority }: { priority: DummyOrder['priority'] }) {
  return (
    <span
      className={
        priority === 'High'
          ? 'text-xs font-semibold text-danger-700'
          : priority === 'Medium'
            ? 'text-xs font-semibold text-warning-700'
            : 'text-xs font-semibold text-success-700'
      }
    >
      {priority}
    </span>
  );
}

function OrderTypeLabel({ orderType }: { orderType: DummyOrder['orderType'] }) {
  return <OrderTypeBadge orderType={orderType} />;
}

function DueCell({ dueDate }: { dueDate: string }) {
  const due = dueDaysLabel(dueDate);
  return (
    <div>
      <p
        className={clsx(
          'text-sm font-semibold',
          due.tone === 'danger' && 'text-danger-700',
          due.tone === 'warning' && 'text-warning-700',
          due.tone === 'info' && 'text-info-700',
          due.tone === 'neutral' && 'text-ink-800',
        )}
      >
        {due.text}
      </p>
      <p className="font-mono text-2xs text-ink-400">{dueDate}</p>
    </div>
  );
}

/** Show first two products inline; remaining as +N */
function ProductsCell({ products }: { products: DummyOrder['products'] }) {
  const visible = products.slice(0, 2);
  const extra = products.length - visible.length;
  const title = products.map((p) => `${p.name} ×${p.quantity}`).join(', ');

  return (
    <div
      className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left"
      title={title}
    >
      {visible.map((line, i) => (
        <span
          key={line.name}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-800"
        >
          {i > 0 ? (
            <span className="text-ink-300" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="max-w-[9rem] truncate">{line.name}</span>
        </span>
      ))}
      {extra > 0 ? (
        <span className="rounded bg-brand-50 px-1.5 py-0.5 text-2xs font-bold text-brand-700">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

function OrderIdButton({
  order,
  onOpen,
}: {
  order: DummyOrder;
  onOpen: (order: DummyOrder) => void;
}) {
  return (
    <button
      type="button"
      className="cursor-pointer font-mono text-sm font-semibold text-brand-600 hover:text-brand-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      onClick={() => onOpen(order)}
    >
      {order.orderNumber}
    </button>
  );
}

function OrderRowActions({
  order,
  onEdit,
  onPrint,
}: {
  order: DummyOrder;
  onEdit: (order: DummyOrder) => void;
  onPrint: (order: DummyOrder) => void;
}) {
  return (
    <div className="inline-flex items-center justify-center gap-0.5">
      <button
        type="button"
        className="btn-ghost h-9 w-9 min-h-0 p-0"
        aria-label={`Print ${order.orderNumber}`}
        title="Print order"
        onClick={() => onPrint(order)}
      >
        <Printer className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="btn-ghost h-9 w-9 min-h-0 p-0"
        aria-label={`Edit ${order.orderNumber}`}
        title="Edit order"
        onClick={() => onEdit(order)}
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

function FilterDateRangeFields({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="label">From</label>
        <input
          type="date"
          className="input"
          value={from}
          max={to || undefined}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <div>
        <label className="label">To</label>
        <input
          type="date"
          className="input"
          value={to}
          min={from || undefined}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function FilterQtyRangeFields({
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Min</label>
        <input
          type="number"
          min={0}
          className="input"
          placeholder="0"
          value={min}
          onChange={(e) => onMinChange(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Max</label>
        <input
          type="number"
          min={0}
          className="input"
          placeholder="Any"
          value={max}
          onChange={(e) => onMaxChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function FilterCheckboxList({
  options,
  selected,
  onChange,
  emptyMessage = 'No options available.',
}: {
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyMessage?: string;
}) {
  function toggleValue(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  if (options.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="max-h-[min(18rem,50vh)] space-y-0.5 overflow-y-auto rounded-xl border border-ink-100 bg-white/50 p-1">
      {options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <li key={opt.value}>
            <label
              className={clsx(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-ink-50',
                checked && 'bg-brand-50/70',
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                checked={checked}
                onChange={() => toggleValue(opt.value)}
              />
              <span className="min-w-0 flex-1 truncate font-medium text-ink-800">
                {opt.label}
              </span>
              <span className="shrink-0 rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-2xs font-semibold text-ink-600">
                {opt.count}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function OrdersFilterPopover({
  open,
  onOpenChange,
  filters,
  onChange,
  orderOptions,
  customerOptions,
  productOptions,
  priorityOptions,
  statusOptions,
  activeCount,
  initialSection = 'orderDate',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ColumnFilters;
  onChange: (next: ColumnFilters) => void;
  orderOptions: FilterOption[];
  customerOptions: FilterOption[];
  productOptions: FilterOption[];
  priorityOptions: FilterOption[];
  statusOptions: FilterOption[];
  activeCount: number;
  initialSection?: FilterSection;
}) {
  const panelId = useId();
  const [activeSection, setActiveSection] =
    useState<FilterSection>(initialSection);

  useEffect(() => {
    if (open) setActiveSection(initialSection);
  }, [open, initialSection]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  if (!open) {
    return (
      <button
        type="button"
        className={clsx(
          'btn-secondary relative inline-flex min-h-10 gap-1.5 px-3',
          activeCount > 0 ? 'border-brand-200 bg-brand-50/80 text-brand-800' : '',
        )}
        aria-label={`Filters${activeCount ? `, ${activeCount} active` : ''}`}
        aria-expanded={false}
        onClick={() => onOpenChange(true)}
      >
        <Filter className="h-4 w-4" aria-hidden />
        <span>Filters</span>
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-2xs font-bold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
    );
  }

  const sectionMeta = FILTER_SECTIONS.find((s) => s.id === activeSection)!;
  const sectionCount = sectionActiveCount(activeSection, filters);

  const sectionPanel = (() => {
    switch (activeSection) {
      case 'order':
        return (
          <FilterCheckboxList
            options={orderOptions}
            selected={filters.orderNumbers}
            onChange={(orderNumbers) => onChange({ ...filters, orderNumbers })}
          />
        );
      case 'orderDate':
        return (
          <FilterDateRangeFields
            from={filters.orderDateFrom}
            to={filters.orderDateTo}
            onFromChange={(orderDateFrom) =>
              onChange({ ...filters, orderDateFrom })
            }
            onToChange={(orderDateTo) =>
              onChange({ ...filters, orderDateTo })
            }
          />
        );
      case 'dueDate':
        return (
          <FilterDateRangeFields
            from={filters.dueDateFrom}
            to={filters.dueDateTo}
            onFromChange={(dueDateFrom) =>
              onChange({ ...filters, dueDateFrom })
            }
            onToChange={(dueDateTo) => onChange({ ...filters, dueDateTo })}
          />
        );
      case 'quantity':
        return (
          <FilterQtyRangeFields
            min={filters.qtyMin}
            max={filters.qtyMax}
            onMinChange={(qtyMin) => onChange({ ...filters, qtyMin })}
            onMaxChange={(qtyMax) => onChange({ ...filters, qtyMax })}
          />
        );
      case 'customer':
        return (
          <FilterCheckboxList
            options={customerOptions}
            selected={filters.customers}
            onChange={(customers) => onChange({ ...filters, customers })}
          />
        );
      case 'priority':
        return (
          <FilterCheckboxList
            options={priorityOptions}
            selected={filters.priorities}
            onChange={(priorities) =>
              onChange({
                ...filters,
                priorities: priorities as DummyOrder['priority'][],
              })
            }
          />
        );
      case 'status':
        return (
          <FilterCheckboxList
            options={statusOptions}
            selected={filters.statuses}
            onChange={(statuses) =>
              onChange({
                ...filters,
                statuses: statuses as OrderStatus[],
              })
            }
          />
        );
      case 'product':
        return (
          <FilterCheckboxList
            options={productOptions}
            selected={filters.products}
            onChange={(products) => onChange({ ...filters, products })}
          />
        );
    }
  })();

  const modal = (
    <div className="app-modal-layer" role="presentation">
      <button
        type="button"
        className="app-modal-backdrop"
        aria-label="Close filters"
        onClick={() => onOpenChange(false)}
      />
      <div
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-label="Filter orders"
        className="app-modal-panel glass-modal !max-w-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/40 px-4 py-3">
          <h2 className="text-base font-bold text-ink-900">Filter orders</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 disabled:text-ink-300"
              disabled={activeCount === 0}
              onClick={() => onChange(EMPTY_FILTERS)}
            >
              Clear all
            </button>
            <button
              type="button"
              className="btn-ghost h-9 w-9 min-h-0 rounded-xl p-0"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav
            className="shrink-0 border-b border-white/40 bg-white/25 sm:w-44 sm:border-b-0 sm:border-r"
            aria-label="Filter categories"
          >
            <ul className="flex gap-1 overflow-x-auto p-2 sm:flex-col sm:overflow-visible">
              {FILTER_SECTIONS.map((section) => {
                const count = sectionActiveCount(section.id, filters);
                const active = activeSection === section.id;
                return (
                  <li key={section.id} className="shrink-0 sm:shrink">
                    <button
                      type="button"
                      className={clsx(
                        'flex w-full min-w-[7.5rem] items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors sm:min-w-0',
                        active
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-ink-700 hover:bg-white/70',
                      )}
                      aria-current={active ? 'true' : undefined}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <span className="truncate">{section.label}</span>
                      {count > 0 ? (
                        <span
                          className={clsx(
                            'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-2xs font-bold',
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-brand-100 text-brand-700',
                          )}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-white/30 px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">
                {sectionMeta.label}
              </p>
              {sectionCount > 0 ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-700 hover:text-brand-900"
                  onClick={() =>
                    onChange(clearFilterSection(activeSection, filters))
                  }
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {sectionPanel}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-white/40 px-4 py-3">
          <button
            type="button"
            className="btn-primary min-w-[7rem]"
            onClick={() => onOpenChange(false)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className={clsx(
          'btn-secondary relative inline-flex min-h-10 gap-1.5 px-3',
          activeCount > 0 ? 'border-brand-200 bg-brand-50/80 text-brand-800' : '',
        )}
        aria-label={`Filters${activeCount ? `, ${activeCount} active` : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(true)}
      >
        <Filter className="h-4 w-4" aria-hidden />
        <span>Filters</span>
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-2xs font-bold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
      {createPortal(modal, getModalRoot())}
    </>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  sortDir,
  onSort,
}: {
  label: string;
  sortKey?: SortKey;
  activeKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort?: (key: SortKey) => void;
}) {
  const sorted = sortKey && activeKey === sortKey;
  return (
    <div className="flex items-center gap-1">
      <span className="font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </span>
      {sortKey && onSort ? (
        <button
          type="button"
          className="cursor-pointer text-ink-400 hover:text-ink-800"
          aria-label={`Sort by ${label}`}
          onClick={() => onSort(sortKey)}
        >
          {sorted ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </button>
      ) : null}
    </div>
  );
}

function ColumnHeaderFilter({
  label,
  sortKey,
  activeKey,
  sortDir,
  onSort,
  options,
  selected,
  onChange,
  open,
  onOpenChange,
  onOpenAllFilters,
}: {
  label: string;
  sortKey?: SortKey;
  activeKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort?: (key: SortKey) => void;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAllFilters: () => void;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 240 });
  const sorted = sortKey && activeKey === sortKey;
  const activeCount = selected.length;

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const panelWidth = 256;
      const panelHeight = panelRef.current?.offsetHeight ?? 280;
      const margin = 8;
      let top = rect.bottom + 6;
      let left = rect.left;

      if (top + panelHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - panelHeight - 6);
      }
      left = Math.max(
        margin,
        Math.min(left, window.innerWidth - panelWidth - margin),
      );
      setPanelStyle({ top, left, width: panelWidth });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, options.length, selected.length]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  const panel = open ? (
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-label={`Filter ${label}`}
      style={{
        position: 'fixed',
        top: panelStyle.top,
        left: panelStyle.left,
        width: panelStyle.width,
        zIndex: 70,
      }}
      className="overflow-hidden rounded-xl border border-ink-200/80 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
        <p className="text-xs font-semibold text-ink-800">Filter {label}</p>
        {activeCount > 0 ? (
          <button
            type="button"
            className="text-2xs font-semibold text-brand-700 hover:text-brand-900"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="p-2">
        <FilterCheckboxList
          options={options}
          selected={selected}
          onChange={onChange}
        />
      </div>
      <div className="border-t border-ink-100 px-3 py-2">
        <button
          type="button"
          className="text-2xs font-semibold text-brand-700 hover:text-brand-900"
          onClick={() => {
            onOpenChange(false);
            onOpenAllFilters();
          }}
        >
          Open all filters
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="inline-flex items-center gap-1">
      <span className="font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </span>
      {sortKey && onSort ? (
        <button
          type="button"
          className="cursor-pointer text-ink-400 hover:text-ink-800"
          aria-label={`Sort by ${label}`}
          onClick={() => onSort(sortKey)}
        >
          {sorted ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </button>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className={clsx(
          'relative inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors',
          open || activeCount > 0
            ? 'bg-brand-50 text-brand-700'
            : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700',
        )}
        aria-label={`Filter ${label}${activeCount ? `, ${activeCount} selected` : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
      >
        <Filter className="h-3.5 w-3.5" aria-hidden />
        {activeCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand-600 px-0.5 text-[9px] font-bold leading-none text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

export function OrdersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const viewMode: ViewMode = location.pathname.includes('/by-order-type')
    ? 'orderType'
    : location.pathname.includes('/by-product')
      ? 'product'
      : 'orders';

  const [orders, setOrders] = useState(DUMMY_ORDERS);
  const [query, setQuery] = useState('');
  const [columnFilters, setColumnFilters] =
    useState<ColumnFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterInitialSection, setFilterInitialSection] =
    useState<FilterSection>('orderDate');
  const [columnFilterOpen, setColumnFilterOpen] = useState<
    'order' | 'priority' | 'status' | null
  >(null);
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DummyOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<DummyOrder | null>(null);
  const [formMsg, setFormMsg] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPage(1);
  }, [viewMode]);

  useEffect(() => {
    setPage(1);
  }, [query, columnFilters]);

  useEffect(() => {
    const incoming = (location.state as { newOrder?: DummyOrder } | null)
      ?.newOrder;
    if (!incoming) return;
    setOrders((prev) => {
      const orderNumber = `ORD-${String(prev.length + 12).padStart(5, '0')}`;
      return [{ ...incoming, orderNumber }, ...prev];
    });
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

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

      // Alt+1 Order list · Alt+2 By product · Alt+3 By order type
      const viewPath =
        e.code === 'Digit1' || e.code === 'Numpad1'
          ? '/orders'
          : e.code === 'Digit2' || e.code === 'Numpad2'
            ? '/orders/by-product'
            : e.code === 'Digit3' || e.code === 'Numpad3'
              ? '/orders/by-order-type'
              : null;
      if (!viewPath) return;
      e.preventDefault();
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();
      if (location.pathname !== viewPath) {
        navigate(viewPath);
      }
      // Keep focus on the matching tab — avoid main/page focus ring
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-orders-view="${viewPath}"]`)
          ?.focus({ preventScroll: true });
      });
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [navigate, location.pathname]);

  const searchMatched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.products.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [orders, query]);

  function applyExcept(rows: DummyOrder[], except: FilterField | null) {
    return rows.filter((o) => {
      if (
        except !== 'orderDate' &&
        !matchesDateRange(
          o.orderDate,
          columnFilters.orderDateFrom,
          columnFilters.orderDateTo,
        )
      ) {
        return false;
      }
      if (
        except !== 'dueDate' &&
        !matchesDateRange(
          o.dueDate,
          columnFilters.dueDateFrom,
          columnFilters.dueDateTo,
        )
      ) {
        return false;
      }
      if (except !== 'qty') {
        const qty = orderTotalQty(o);
        if (columnFilters.qtyMin && qty < Number(columnFilters.qtyMin)) {
          return false;
        }
        if (columnFilters.qtyMax && qty > Number(columnFilters.qtyMax)) {
          return false;
        }
      }
      if (
        except !== 'orderNumbers' &&
        columnFilters.orderNumbers.length > 0 &&
        !columnFilters.orderNumbers.includes(o.orderNumber)
      ) {
        return false;
      }
      if (
        except !== 'customers' &&
        columnFilters.customers.length > 0 &&
        !columnFilters.customers.includes(o.customerName)
      ) {
        return false;
      }
      if (
        except !== 'statuses' &&
        columnFilters.statuses.length > 0 &&
        !columnFilters.statuses.includes(o.status)
      ) {
        return false;
      }
      if (
        except !== 'priorities' &&
        columnFilters.priorities.length > 0 &&
        !columnFilters.priorities.includes(o.priority)
      ) {
        return false;
      }
      if (
        except !== 'products' &&
        columnFilters.products.length > 0 &&
        !o.products.some((p) => columnFilters.products.includes(p.name))
      ) {
        return false;
      }
      return true;
    });
  }

  const filtered = useMemo(() => {
    const rows = [...applyExcept(searchMatched, null)].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = String(av).localeCompare(String(bv), undefined, {
        numeric: true,
      });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [searchMatched, columnFilters, sortKey, sortDir]);

  const orderOptions = useMemo(() => {
    const base = applyExcept(searchMatched, 'orderNumbers');
    const numbers = [...new Set(base.map((o) => o.orderNumber))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
    const counts = countBy(
      base.map((o) => o.orderNumber),
      numbers,
    );
    return numbers.map((num) => ({
      value: num,
      label: num,
      count: counts.get(num) ?? 0,
    }));
  }, [searchMatched, columnFilters]);

  const customerOptions = useMemo(() => {
    const base = applyExcept(searchMatched, 'customers');
    const names = [...new Set(base.map((o) => o.customerName))].sort();
    const counts = countBy(
      base.map((o) => o.customerName),
      names,
    );
    return names.map((name) => ({
      value: name,
      label: name,
      count: counts.get(name) ?? 0,
    }));
  }, [searchMatched, columnFilters]);

  const statusOptions = useMemo(() => {
    const base = applyExcept(searchMatched, 'statuses');
    const counts = countBy(
      base.map((o) => o.status),
      STATUS_OPTIONS,
    );
    return STATUS_OPTIONS.map((s) => ({
      value: s,
      label: s.replaceAll('_', ' '),
      count: counts.get(s) ?? 0,
    })).filter((o) => o.count > 0 || columnFilters.statuses.includes(o.value as OrderStatus));
  }, [searchMatched, columnFilters]);

  const priorityOptions = useMemo(() => {
    const base = applyExcept(searchMatched, 'priorities');
    const counts = countBy(
      base.map((o) => o.priority),
      PRIORITIES,
    );
    return PRIORITIES.map((p) => ({
      value: p,
      label: p,
      count: counts.get(p) ?? 0,
    }));
  }, [searchMatched, columnFilters]);

  const productOptions = useMemo(() => {
    const base = applyExcept(searchMatched, 'products');
    const names = [
      ...new Set(base.flatMap((o) => o.products.map((p) => p.name))),
    ].sort();
    const counts = new Map<string, number>();
    for (const order of base) {
      for (const line of order.products) {
        counts.set(line.name, (counts.get(line.name) ?? 0) + 1);
      }
    }
    return names.map((name) => ({
      value: name,
      label: name,
      count: counts.get(name) ?? 0,
    }));
  }, [searchMatched, columnFilters]);

  const activeFilterCount = countActiveFilters(columnFilters);

  const productGroups = useMemo(() => {
    const map = new Map<
      string,
      { product: string; orders: DummyOrder[]; totalQty: number }
    >();
    for (const order of filtered) {
      for (const line of order.products) {
        const existing = map.get(line.name);
        if (existing) {
          if (!existing.orders.find((o) => o.id === order.id)) {
            existing.orders.push(order);
          }
          existing.totalQty += line.quantity;
        } else {
          map.set(line.name, {
            product: line.name,
            orders: [order],
            totalQty: line.quantity,
          });
        }
      }
    }
    return [...map.values()].sort((a, b) =>
      a.product.localeCompare(b.product),
    );
  }, [filtered]);

  const machineTypeGroups = useMemo(() => {
    const byMachine = new Map<string, DummyOrder[]>();
    for (const order of filtered) {
      const key = order.machineId || 'unassigned';
      const list = byMachine.get(key) ?? [];
      list.push(order);
      byMachine.set(key, list);
    }

    return MACHINES.map((machine) => {
      const orders = byMachine.get(machine.id) ?? [];
      const standard = orders.filter((o) => o.orderType === 'Standard').length;
      const customised = orders.filter(
        (o) => o.orderType === 'Customised',
      ).length;
      return {
        machine,
        orders,
        standard,
        customised,
        total: orders.length,
      };
    });
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function openMainFilters(section: FilterSection = 'orderDate') {
    setFilterInitialSection(section);
    setColumnFilterOpen(null);
    setFiltersOpen(true);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function openEdit(order: DummyOrder) {
    setDetailOrder(null);
    setEditing(order);
    setFormMsg('');
    setModalOpen(true);
  }

  function openDetail(order: DummyOrder) {
    setDetailOrder(order);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setFormMsg('');
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const customerName = String(fd.get('customer') || '').trim();
    const productRaw = String(fd.get('products') || '').trim();
    const quantity = Number(fd.get('quantity') || 0);
    if (!customerName || !productRaw || quantity <= 0) {
      setFormMsg('Fill customer, products, and a valid quantity.');
      return;
    }
    const names = productRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const products = names.map((name, i) => ({
      name,
      quantity:
        i === 0 ? quantity : Math.max(1, Math.round(quantity / names.length)),
    }));
    if (products[0]) products[0].quantity = quantity;

    if (editing) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editing.id
            ? {
                ...o,
                customerName,
                products,
                dueDate: String(fd.get('due') || o.dueDate),
              }
            : o,
        ),
      );
      setFormMsg('Order updated (UI only).');
      setTimeout(closeModal, 500);
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Orders"
        subtitle="Search, filter, and track customer / production orders."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              disabled={filtered.length === 0}
              onClick={() => exportOrdersCsv(filtered)}
              title="Export filtered orders as CSV"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export
            </button>
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              disabled={filtered.length === 0}
              onClick={() => printOrders(filtered, 'Arwa Weld — Orders')}
              title="Print filtered orders"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Print
            </button>
            <Link to="/orders/new" className="btn-primary w-full sm:w-auto">
              <Plus className="h-4 w-4" aria-hidden />
              Add new order
            </Link>
          </>
        }
      />

      <div className="mb-3 grid w-full grid-cols-2 gap-2 sm:mb-4 lg:grid-cols-4">
        {ORDER_KPIS.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            tone={i === 3 ? 'warning' : i === 2 ? 'info' : 'neutral'}
          />
        ))}
      </div>

      <div className="card-panel mb-3 flex w-full flex-col gap-3">
        <div
          className="hidden w-fit rounded-xl border border-white/50 bg-white/30 p-0.5 backdrop-blur-md md:inline-flex"
          role="tablist"
          aria-label="Orders view"
        >
          <Link
            to="/orders"
            role="tab"
            data-orders-view="/orders"
            aria-selected={viewMode === 'orders'}
            title="Alt+1"
            className={clsx(
              'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-offset-1',
              viewMode === 'orders'
                ? 'bg-white/90 text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            <LayoutList className="h-3.5 w-3.5" aria-hidden />
            Order list
            <kbd className="ml-0.5 hidden rounded border border-ink-200/80 bg-white/80 px-1 font-mono text-[10px] font-semibold text-ink-400 lg:inline">
              1
            </kbd>
          </Link>
          <Link
            to="/orders/by-product"
            role="tab"
            data-orders-view="/orders/by-product"
            aria-selected={viewMode === 'product'}
            title="Alt+2"
            className={clsx(
              'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-offset-1',
              viewMode === 'product'
                ? 'bg-white/90 text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            <Package className="h-3.5 w-3.5" aria-hidden />
            By product
            <kbd className="ml-0.5 hidden rounded border border-ink-200/80 bg-white/80 px-1 font-mono text-[10px] font-semibold text-ink-400 lg:inline">
              2
            </kbd>
          </Link>
          <Link
            to="/orders/by-order-type"
            role="tab"
            data-orders-view="/orders/by-order-type"
            aria-selected={viewMode === 'orderType'}
            title="Alt+3"
            className={clsx(
              'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-offset-1',
              viewMode === 'orderType'
                ? 'bg-white/90 text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            <Tags className="h-3.5 w-3.5" aria-hidden />
            By order type
            <kbd className="ml-0.5 hidden rounded border border-ink-200/80 bg-white/80 px-1 font-mono text-[10px] font-semibold text-ink-400 lg:inline">
              3
            </kbd>
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <label className="wizard-search-field">
              <span className="sr-only">Search orders</span>
              <Search
                className="wizard-search-icon"
                strokeWidth={2.5}
                aria-hidden
              />
              <input
                ref={searchRef}
                className="wizard-search-input"
                placeholder="Search order #, customer…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <OrdersFilterPopover
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              filters={columnFilters}
              onChange={setColumnFilters}
              orderOptions={orderOptions}
              customerOptions={customerOptions}
              productOptions={productOptions}
              priorityOptions={priorityOptions}
              statusOptions={statusOptions}
              activeCount={activeFilterCount}
              initialSection={filterInitialSection}
            />
          </div>

          {viewMode === 'orders' ? (
            <label className="w-full sm:w-40 md:hidden">
              <span className="sr-only">Sort orders</span>
              <select
                className="input cursor-pointer"
                value={`${sortKey}:${sortDir}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split(':') as [
                    SortKey,
                    'asc' | 'desc',
                  ];
                  setSortKey(key);
                  setSortDir(dir);
                }}
              >
                <option value="dueDate:asc">Due ↑</option>
                <option value="dueDate:desc">Due ↓</option>
                <option value="orderNumber:asc">Order ↑</option>
                <option value="orderNumber:desc">Order ↓</option>
                <option value="customerName:asc">Customer ↑</option>
                <option value="customerName:desc">Customer ↓</option>
                <option value="status:asc">Status ↑</option>
                <option value="status:desc">Status ↓</option>
              </select>
            </label>
          ) : null}
        </div>

        <p className="text-2xs text-ink-400">
          <kbd className="rounded border border-ink-200 bg-white/70 px-1 font-mono">Alt</kbd>
          {' + '}
          <kbd className="rounded border border-ink-200 bg-white/70 px-1 font-mono">S</kbd>
          {' search · '}
          <kbd className="rounded border border-ink-200 bg-white/70 px-1 font-mono">Alt</kbd>
          {' + '}
          <kbd className="rounded border border-ink-200 bg-white/70 px-1 font-mono">1</kbd>
          <kbd className="rounded border border-ink-200 bg-white/70 px-1 font-mono">2</kbd>
          <kbd className="rounded border border-ink-200 bg-white/70 px-1 font-mono">3</kbd>
          {' switch views · '}
          <Filter className="inline h-3 w-3" aria-hidden />
          {' Filters — order, order date, due date, quantity, customer, priority, status, product'}
        </p>
      </div>

      {viewMode === 'orderType' ? (
        <div className="w-full space-y-3">
          {machineTypeGroups.map((group) => (
            <section
              key={group.machine.id}
              className="card-panel !p-0 w-full overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/40 bg-white/25 px-3 py-2.5 backdrop-blur-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-brand-700">
                    <Factory className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-ink-900">
                      {group.machine.name}
                    </h2>
                    <p className="text-2xs font-medium text-ink-500">
                      {group.machine.station} · {group.machine.job}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MachineStatusBadge status={group.machine.status} />
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink-100 px-2 py-1 text-2xs font-semibold text-ink-700">
                      Company standard
                      <span className="font-mono text-sm font-bold text-ink-900">
                        {group.standard}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-info-50 px-2 py-1 text-2xs font-semibold text-info-800 ring-1 ring-info-100">
                      Customised
                      <span className="font-mono text-sm font-bold">
                        {group.customised}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {group.orders.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-ink-500">
                  No orders assigned to this machine for the current filters.
                </p>
              ) : (
                <>
                  <div className="table-wrap hidden w-full border-0 md:block">
                    <table className="data-table w-full table-fixed">
                      <thead>
                        <tr>
                          <th className="w-[12%]">Order</th>
                          <th className="w-[18%]">Customer</th>
                          <th className="w-[14%]">Order type</th>
                          <th className="w-[14%]">Due</th>
                          <th className="w-[8%]">Qty</th>
                          <th className="w-[10%]">Priority</th>
                          <th className="w-[14%]">Status</th>
                          <th className="w-[10%] text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.orders.map((order) => (
                          <tr key={`${group.machine.id}-${order.id}`}>
                            <td>
                              <OrderIdButton
                                order={order}
                                onOpen={openDetail}
                              />
                            </td>
                            <td className="font-medium">
                              {order.customerName}
                            </td>
                            <td>
                              <OrderTypeLabel orderType={order.orderType} />
                            </td>
                            <td>
                              <DueCell dueDate={order.dueDate} />
                            </td>
                            <td className="font-mono font-semibold">
                              {orderTotalQty(order)}
                            </td>
                            <td>
                              <PriorityLabel priority={order.priority} />
                            </td>
                            <td>
                              <StatusBadge status={order.status} />
                            </td>
                            <td className="text-center">
                              <OrderRowActions
                                order={order}
                                onEdit={openEdit}
                                onPrint={printOrder}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <ul className="divide-y divide-ink-100/80 md:hidden">
                    {group.orders.map((order) => (
                      <li
                        key={order.id}
                        className="flex flex-col gap-2 px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <OrderIdButton order={order} onOpen={openDetail} />
                          <OrderTypeLabel orderType={order.orderType} />
                        </div>
                        <p className="text-sm font-semibold text-ink-900">
                          {order.customerName}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <DueCell dueDate={order.dueDate} />
                          <StatusBadge status={order.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          ))}
          <p className="text-xs text-ink-500">
            {machineTypeGroups.length} machines · {filtered.length} orders ·
            Company standard{' '}
            {machineTypeGroups.reduce((s, g) => s + g.standard, 0)} ·
            Customised{' '}
            {machineTypeGroups.reduce((s, g) => s + g.customised, 0)}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message="No orders match your search or filter." />
      ) : viewMode === 'product' ? (
        <div className="w-full space-y-3">
          {productGroups.map((group) => (
            <section
              key={group.product}
              className="card-panel !p-0 w-full overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/40 bg-white/25 px-3 py-2.5 backdrop-blur-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Package
                    className="h-4 w-4 shrink-0 text-brand-600"
                    aria-hidden
                  />
                  <h2 className="truncate text-sm font-bold text-ink-900">
                    {group.product}
                  </h2>
                </div>
                <p className="text-xs font-medium text-ink-500">
                  {group.orders.length} order
                  {group.orders.length === 1 ? '' : 's'} · Total qty{' '}
                  <span className="font-mono font-semibold text-ink-800">
                    {group.totalQty}
                  </span>
                </p>
              </div>

              <div className="table-wrap hidden w-full border-0 md:block">
                <table className="data-table w-full table-fixed">
                  <thead>
                    <tr>
                      <th className="w-[12%]">Order</th>
                      <th className="w-[16%]">Customer</th>
                      <th className="w-[12%]">Order type</th>
                      <th className="w-[14%]">Due</th>
                      <th className="w-[8%]">Qty</th>
                      <th className="w-[10%]">Priority</th>
                      <th className="w-[14%]">Status</th>
                      <th className="w-[10%] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.orders.map((order) => {
                      const lineQty =
                        order.products.find((p) => p.name === group.product)
                          ?.quantity ?? 0;
                      return (
                        <tr key={`${group.product}-${order.id}`}>
                          <td>
                            <OrderIdButton order={order} onOpen={openDetail} />
                          </td>
                          <td className="font-medium">{order.customerName}</td>
                          <td>
                            <OrderTypeLabel orderType={order.orderType} />
                          </td>
                          <td>
                            <DueCell dueDate={order.dueDate} />
                          </td>
                          <td className="font-mono font-semibold">{lineQty}</td>
                          <td>
                            <PriorityLabel priority={order.priority} />
                          </td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="text-center">
                            <OrderRowActions
                              order={order}
                              onEdit={openEdit}
                              onPrint={printOrder}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-ink-100/80 md:hidden">
                {group.orders.map((order) => {
                  const lineQty =
                    order.products.find((p) => p.name === group.product)
                      ?.quantity ?? 0;
                  return (
                    <li
                      key={order.id}
                      className="flex flex-col gap-2 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <OrderIdButton order={order} onOpen={openDetail} />
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm font-semibold text-ink-900">
                        {order.customerName}
                      </p>
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <DueCell dueDate={order.dueDate} />
                        <p className="font-mono text-sm font-semibold text-ink-800">
                          Qty {lineQty}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-secondary min-h-10 flex-1"
                          onClick={() => printOrder(order)}
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </button>
                        <button
                          type="button"
                          className="btn-secondary min-h-10 flex-1"
                          aria-label={`Edit ${order.orderNumber}`}
                          onClick={() => openEdit(order)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="text-xs text-ink-500">
            {productGroups.length} products · {filtered.length} orders
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrap hidden w-full md:block">
            <table className="data-table w-full table-fixed">
              <thead>
                <tr>
                  <th className="w-[11%]">
                    <ColumnHeaderFilter
                      label="Order"
                      sortKey="orderNumber"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                      options={orderOptions}
                      selected={columnFilters.orderNumbers}
                      onChange={(orderNumbers) =>
                        setColumnFilters((f) => ({ ...f, orderNumbers }))
                      }
                      open={columnFilterOpen === 'order'}
                      onOpenChange={(next) =>
                        setColumnFilterOpen(next ? 'order' : null)
                      }
                      onOpenAllFilters={() => openMainFilters('order')}
                    />
                  </th>
                  <th className="w-[13%]">
                    <SortableHeader
                      label="Customer"
                      sortKey="customerName"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                  </th>
                  <th className="w-[12%]">
                    <span className="font-semibold uppercase tracking-wide text-ink-500">
                      Order type
                    </span>
                  </th>
                  <th className="w-[11%]">
                    <SortableHeader
                      label="Due"
                      sortKey="dueDate"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                  </th>
                  <th className="w-[15%] text-left">
                    <span className="font-semibold uppercase tracking-wide text-ink-500">
                      Products
                    </span>
                  </th>
                  <th className="w-[6%]">Qty</th>
                  <th className="w-[8%]">
                    <ColumnHeaderFilter
                      label="Priority"
                      options={priorityOptions}
                      selected={columnFilters.priorities}
                      onChange={(priorities) =>
                        setColumnFilters((f) => ({
                          ...f,
                          priorities: priorities as DummyOrder['priority'][],
                        }))
                      }
                      open={columnFilterOpen === 'priority'}
                      onOpenChange={(next) =>
                        setColumnFilterOpen(next ? 'priority' : null)
                      }
                      onOpenAllFilters={() => openMainFilters('priority')}
                      activeKey={sortKey}
                      sortDir={sortDir}
                    />
                  </th>
                  <th className="w-[13%]">
                    <ColumnHeaderFilter
                      label="Status"
                      sortKey="status"
                      activeKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                      options={statusOptions}
                      selected={columnFilters.statuses}
                      onChange={(statuses) =>
                        setColumnFilters((f) => ({
                          ...f,
                          statuses: statuses as OrderStatus[],
                        }))
                      }
                      open={columnFilterOpen === 'status'}
                      onOpenChange={(next) =>
                        setColumnFilterOpen(next ? 'status' : null)
                      }
                      onOpenAllFilters={() => openMainFilters('status')}
                    />
                  </th>
                  <th className="w-[11%] text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <OrderIdButton order={order} onOpen={openDetail} />
                    </td>
                    <td className="font-medium">{order.customerName}</td>
                    <td>
                      <OrderTypeLabel orderType={order.orderType} />
                    </td>
                    <td>
                      <DueCell dueDate={order.dueDate} />
                    </td>
                    <td>
                      <ProductsCell products={order.products} />
                    </td>
                    <td className="font-mono font-semibold">
                      {orderTotalQty(order)}
                    </td>
                    <td>
                      <PriorityLabel priority={order.priority} />
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="text-center">
                      <OrderRowActions
                        order={order}
                        onEdit={openEdit}
                        onPrint={printOrder}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-2 space-y-2 md:hidden">
            {pageRows.map((order) => (
              <li key={order.id} className="card-panel">
                <div className="flex items-start justify-between gap-2">
                  <OrderIdButton order={order} onOpen={openDetail} />
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1.5 text-sm font-semibold text-ink-900">
                  {order.customerName}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  Order type · {order.orderType}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
                      Due
                    </p>
                    <DueCell dueDate={order.dueDate} />
                  </div>
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
                      Priority
                    </p>
                    <PriorityLabel priority={order.priority} />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                    Products
                  </p>
                  <ProductsCell products={order.products} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-100/80 pt-2.5">
                  <p className="text-xs font-medium text-ink-500">
                    Qty{' '}
                    <span className="font-mono font-semibold text-ink-800">
                      {orderTotalQty(order)}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary min-h-10 px-3"
                      aria-label={`Print ${order.orderNumber}`}
                      onClick={() => printOrder(order)}
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn-secondary min-h-10 px-3"
                      aria-label={`Edit ${order.orderNumber}`}
                      onClick={() => openEdit(order)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-500">
              {filtered.length} results · Page {currentPage} of {pageCount}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary min-h-11 flex-1 px-3 sm:min-h-9 sm:flex-none"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sm:sr-only">Prev</span>
              </button>
              <button
                type="button"
                className="btn-secondary min-h-11 flex-1 px-3 sm:min-h-9 sm:flex-none"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label="Next page"
              >
                <span className="sm:sr-only">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {editing && modalOpen ? (
        <Modal
          open={modalOpen}
          title={`Edit ${editing.orderNumber}`}
          onClose={closeModal}
          footer={
            <>
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="order-form"
                className="btn-primary w-full sm:w-auto"
              >
                {editing ? 'Save changes' : 'Save'}
              </button>
            </>
          }
        >
          <form id="order-form" className="space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="label" htmlFor="customer">
                Customer
              </label>
              <input
                id="customer"
                name="customer"
                className="input"
                required
                defaultValue={editing?.customerName ?? ''}
                key={`customer-${editing?.id ?? 'new'}`}
              />
            </div>
            <div>
              <label className="label" htmlFor="products">
                Products (comma-separated)
              </label>
              <input
                id="products"
                name="products"
                className="input"
                required
                placeholder="Steel Frame, Bracket Kit B, …"
                defaultValue={
                  editing?.products.map((p) => p.name).join(', ') ?? ''
                }
                key={`products-${editing?.id ?? 'new'}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="quantity">
                  Primary qty
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={editing ? orderTotalQty(editing) : 1}
                  className="input"
                  required
                  key={`qty-${editing?.id ?? 'new'}`}
                />
              </div>
              <div>
                <label className="label" htmlFor="due">
                  Due date
                </label>
                <input
                  id="due"
                  name="due"
                  type="date"
                  defaultValue={editing?.dueDate ?? '2026-09-15'}
                  className="input"
                  key={`due-${editing?.id ?? 'new'}`}
                />
              </div>
            </div>
            {formMsg ? (
              <p
                className="text-sm text-ink-700"
                role="status"
                aria-live="polite"
              >
                {formMsg}
              </p>
            ) : null}
          </form>
        </Modal>
      ) : null}

      <Modal
        open={!!detailOrder}
        title={detailOrder ? `Order ${detailOrder.orderNumber}` : 'Order detail'}
        onClose={() => setDetailOrder(null)}
        footer={
          detailOrder ? (
            <>
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto"
                onClick={() => setDetailOrder(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto"
                onClick={() => printOrder(detailOrder)}
              >
                <Printer className="h-4 w-4" aria-hidden />
                Print
              </button>
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                onClick={() => {
                  const order = detailOrder;
                  setDetailOrder(null);
                  openEdit(order);
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Edit order
              </button>
            </>
          ) : null
        }
      >
        {detailOrder ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  Customer
                </dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {detailOrder.customerName}
                </dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  Order type
                </dt>
                <dd className="mt-0.5">
                  <OrderTypeLabel orderType={detailOrder.orderType} />
                </dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  Status
                </dt>
                <dd className="mt-1">
                  <StatusBadge status={detailOrder.status} />
                </dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  Due
                </dt>
                <dd className="mt-0.5">
                  <DueCell dueDate={detailOrder.dueDate} />
                </dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  Priority
                </dt>
                <dd className="mt-0.5">
                  <PriorityLabel priority={detailOrder.priority} />
                </dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  Total qty
                </dt>
                <dd className="mt-0.5 font-mono text-base font-bold text-ink-900">
                  {orderTotalQty(detailOrder)}
                </dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  Lines
                </dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {detailOrder.products.length} product
                  {detailOrder.products.length === 1 ? '' : 's'}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                Products
              </h3>
              <ul className="divide-y divide-white/40 rounded-xl border border-white/50 bg-white/30 backdrop-blur-sm">
                {detailOrder.products.map((line) => {
                  const model = line.modelId
                    ? getModelById(line.modelId)
                    : null;
                  return (
                    <li
                      key={`${line.name}-${line.modelId ?? 'line'}`}
                      className="px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-ink-800">
                          {line.name}
                        </span>
                        <span className="font-mono font-semibold text-ink-900">
                          ×{line.quantity}
                        </span>
                      </div>
                      {line.specs && model ? (
                        <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-2xs">
                          {model.specs.map((field) => (
                            <div key={field.key}>
                              <dt className="text-ink-400">{field.label}</dt>
                              <dd className="font-medium text-ink-700">
                                {specDisplayValue(
                                  field,
                                  line.specs![field.key],
                                  field.detailKey
                                    ? line.specs![field.detailKey]
                                    : undefined,
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
