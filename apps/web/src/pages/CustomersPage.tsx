import { useMemo, useState, type FormEvent } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Search,
} from 'lucide-react';
import clsx from 'clsx';
import { CUSTOMERS, cloneCustomers, type Customer } from '../data/customers';
import { DUMMY_ORDERS } from '../data/dummy';
import { EmptyState, KpiCard, Modal, PageHeader } from '../components/ui';

function customerInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
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
          <button type="submit" form="customers-add-form" className="btn-primary flex-1">
            Add customer
          </button>
        </div>
      }
    >
      <form id="customers-add-form" className="space-y-3" onSubmit={submit}>
        <div>
          <label className="label" htmlFor="customers-name">
            Customer name *
          </label>
          <input
            id="customers-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apex Manufacturing"
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="customers-code">
            Code *
          </label>
          <input
            id="customers-code"
            className="input font-mono uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. APEX"
            maxLength={8}
          />
        </div>
        <div>
          <label className="label" htmlFor="customers-region">
            Region *
          </label>
          <input
            id="customers-region"
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

export function CustomersPage() {
  const [customers, setCustomers] = useState(() => cloneCustomers(CUSTOMERS));
  const [query, setQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [addOpen, setAddOpen] = useState(false);

  const regions = useMemo(
    () => [...new Set(customers.map((c) => c.region))].sort(),
    [customers],
  );

  const orderCountByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of DUMMY_ORDERS) {
      map.set(order.customerName, (map.get(order.customerName) ?? 0) + 1);
    }
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const matchRegion = regionFilter === 'ALL' || c.region === regionFilter;
      const matchQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q);
      return matchRegion && matchQ;
    });
  }, [customers, query, regionFilter]);

  const withOrders = customers.filter(
    (c) => (orderCountByCustomer.get(c.name) ?? 0) > 0,
  ).length;

  const totalBrands = customers.reduce((sum, c) => sum + c.brands.length, 0);

  const kpis = [
    {
      label: 'Total customers',
      value: String(customers.length),
      hint: 'Accounts in master data',
      tone: 'neutral' as const,
    },
    {
      label: 'Regions',
      value: String(regions.length),
      hint: 'Geographic coverage',
      tone: 'info' as const,
    },
    {
      label: 'Brands',
      value: String(totalBrands),
      hint: 'Linked brand names',
      tone: 'neutral' as const,
    },
    {
      label: 'With orders',
      value: String(withOrders),
      hint: 'Linked to production orders',
      tone: 'warning' as const,
    },
  ];

  const handleAdd = (customer: Customer) => {
    setCustomers((list) => [...list, customer]);
    setAddOpen(false);
  };

  return (
    <div className="w-full">
      <PageHeader
        title="Customers"
        subtitle="Search accounts and manage customer master data."
        actions={
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add customer
          </button>
        }
      />

      <section
        className="mb-3 grid w-full grid-cols-2 gap-2 sm:mb-4 lg:grid-cols-4"
        aria-label="Customer KPIs"
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

      <div className="card-panel mb-3 flex w-full flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search customers</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-600"
              strokeWidth={2.5}
              aria-hidden
            />
            <input
              className="input pl-10"
              placeholder="Search name, code, or region…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="shrink-0 sm:w-44">
            <span className="sr-only">Filter by region</span>
            <select
              className="input cursor-pointer"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <option value="ALL">All regions</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
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
          of {customers.length} customers
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No customers match your search or filter." />
      ) : (
        <>
          <div className="card-panel hidden overflow-x-auto md:block">
            <table className="data-table w-full min-w-[640px]">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Code</th>
                  <th>Region</th>
                  <th className="text-right">Brands</th>
                  <th className="text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => {
                  const orders = orderCountByCustomer.get(customer.name) ?? 0;
                  return (
                    <tr key={customer.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-xs font-bold text-brand-800">
                            {customerInitials(customer.name)}
                          </span>
                          <span className="font-semibold text-ink-900">
                            {customer.name}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono text-sm text-ink-700">
                        {customer.code}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-sm text-ink-700">
                          <MapPin className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                          {customer.region}
                        </span>
                      </td>
                      <td className="text-right font-mono text-sm font-semibold tabular-nums text-ink-800">
                        {customer.brands.length}
                      </td>
                      <td className="text-right font-mono text-sm font-semibold tabular-nums text-ink-800">
                        {orders}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden" aria-label="Customers">
            {filtered.map((customer) => {
              const orders = orderCountByCustomer.get(customer.name) ?? 0;
              return (
                <li key={customer.id} className="card-panel !p-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-xs font-bold text-brand-800">
                      {customerInitials(customer.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{customer.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Building2 className="h-3 w-3" aria-hidden />
                          {customer.code}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {customer.region}
                        </span>
                        <span aria-hidden>·</span>
                        <span>
                          {customer.brands.length} brand
                          {customer.brands.length === 1 ? '' : 's'}
                        </span>
                      </p>
                    </div>
                    <span
                      className={clsx(
                        'shrink-0 rounded-lg px-2 py-1 font-mono text-xs font-bold tabular-nums',
                        orders > 0
                          ? 'bg-brand-600/10 text-brand-800'
                          : 'bg-ink-100 text-ink-500',
                      )}
                    >
                      {orders} ord.
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <AddCustomerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
