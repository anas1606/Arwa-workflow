import React, { useState, useMemo, useRef, useEffect } from 'react';
import Head from 'next/head';
import { Building2, MapPin, Search, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import { CUSTOMERS, DUMMY_ORDERS } from '@/common/dummy';
import AddCustomer from './modal/AddCustomer';
import EditCustomer from './modal/EditCustomer';
import DeleteModal from '@/common/modal/DeleteModal';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import clsx from 'clsx';
import { toast } from 'sonner';

function customerInitials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

import { getCustomersApi, deleteCustomerApi } from '@/lib/fetcher';

export default function Customers() {
  const [customersData, setCustomersData] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [globalRegions, setGlobalRegions] = useState([]);
  const searchInputRef = useRef(null);
  const regionSelectRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key.toLowerCase() === 's' || e.code === 'KeyS')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.altKey && (e.key === 'ArrowRight' || e.code === 'ArrowRight')) {
        e.preventDefault();
        regionSelectRef.current?.focus();
      } else if (e.altKey && (e.key === 'ArrowLeft' || e.code === 'ArrowLeft')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [dropdownState, setDropdownState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const closeDropdown = () => setDropdownState(null);
    if (dropdownState) {
      window.addEventListener('click', closeDropdown);
    }
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownState]);

  // Fetch customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const response = await getCustomersApi(pageNo, pageSize, query, regionFilter);
        if (response.data && response.data.success) {
          setCustomersData(response.data.data.data || []);
          setTotalItems(response.data.data.total || 0);
          if (response.data.data.regions) {
            setGlobalRegions(response.data.data.regions);
          }
        } else {
          setCustomersData([]);
          setTotalItems(0);
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [pageNo, pageSize, query, regionFilter]);

  const paginatedData = customersData;

  const totalPages = Math.ceil(totalItems / pageSize);

  // Reset page when filter changes
  useEffect(() => {
    setPageNo(1);
  }, [query, regionFilter]);

  // Calculate KPIs
  const orderCountByCustomer = useMemo(() => {
    const map = new Map();
    for (const order of DUMMY_ORDERS) {
      map.set(order.customerName, (map.get(order.customerName) ?? 0) + 1);
    }
    return map;
  }, []);

  const totalBrands = customersData.reduce((sum, c) => sum + (c.brands?.length || 0), 0);
  
  const withOrders = customersData.filter(
    (c) => (orderCountByCustomer.get(c.name) ?? 0) > 0,
  ).length;

  const kpis = [
    {
      label: 'Total customers',
      value: isLoading ? '...' : String(customersData.length),
      hint: 'Accounts in master data',
      tone: 'neutral',
    },
    {
      label: 'Regions',
      value: isLoading ? '...' : String(globalRegions.length),
      hint: 'Geographic coverage',
      tone: 'info',
    },
    {
      label: 'Brands',
      value: isLoading ? '...' : String(totalBrands),
      hint: 'Linked brand names',
      tone: 'neutral',
    },
    {
      label: 'With orders',
      value: isLoading ? '...' : String(withOrders),
      hint: 'Linked to production orders',
      tone: 'warning',
    },
  ];

  const handleAdd = (customer) => {
    setCustomersData((list) => [...list, customer]);
    setAddOpen(false);
  };

  const handleEdit = (updatedCustomer) => {
    setCustomersData((list) => list.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    setEditOpen(false);
  };

  const handleDelete = async (deletedCustomer) => {
    try {
      const res = await deleteCustomerApi(deletedCustomer.id);
      if (res.error || (res.data && !res.data.success)) {
        throw new Error(res.error?.message || res.data?.message || 'Failed to delete customer');
      }
      setCustomersData((list) => list.filter(c => c.id !== deletedCustomer.id));
      setDeleteOpen(false);
      toast.success('Customer deleted successfully');
    } catch (err) {
      toast.error(err.message || 'An unexpected error occurred.');
      throw err; // Re-throw to let DeleteModal handle its internal state if needed
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary-dark">
            {customerInitials(row.name)}
          </span>
          <span className="font-semibold text-grey-text-strong truncate max-w-[180px] sm:max-w-[250px]" title={row.name}>{row.name}</span>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      render: (row) => <span className="font-mono text-sm text-grey-text block truncate max-w-[120px]" title={row.code}>{row.code || '-'}</span>,
    },
    {
      key: 'region',
      label: 'Region',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm text-grey-text max-w-[150px]" title={row.region}>
          <MapPin className="h-3.5 w-3.5 shrink-0 text-grey-icon" aria-hidden />
          <span className="truncate">{row.region || '-'}</span>
        </span>
      ),
    },
    {
      key: 'brands',
      label: 'Brands',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-sm font-semibold tabular-nums text-grey-text-dark">
          {row.brands?.length || 0}
        </span>
      ),
    },
    {
      key: 'orders',
      label: 'Orders',
      align: 'right',
      render: (row) => {
        const orders = orderCountByCustomer.get(row.name) ?? 0;
        return (
          <span className="font-mono text-sm font-semibold tabular-nums text-grey-text-dark">
            {orders}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      type: 'action',
      onClick: (row, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setDropdownState({
          row,
          x: rect.right - 120, // rough width of dropdown
          y: rect.bottom + window.scrollY,
        });
      },
    },
  ];

  return (
    <>
      <Head>
        <title>Customers | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-5">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
              Customers
            </h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">
              Search accounts and manage customer master data.
            </p>
          </div>
          <Button
            variant="primary"
            className="w-full sm:w-auto shrink-0"
            onClick={() => setAddOpen(true)}
            icon={Plus}
            text="Add customer"
          />
        </div>

        {/* KPIs */}
        <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Customer KPIs">
          {kpis.map((kpi) => {
            const toneBar = {
              neutral: 'bg-primary',
              success: 'bg-success-dark',
              warning: 'bg-warning-dark',
              danger: 'bg-danger-dark',
              info: 'bg-primary-dark',
            };
            return (
              <article key={kpi.label} className="card-panel relative overflow-hidden !p-3 border-none">
                <div
                  className={clsx('absolute inset-y-0 left-0 w-1', toneBar[kpi.tone])}
                  aria-hidden
                />
                <p className="pl-2 text-2xs font-semibold uppercase tracking-wide text-grey-muted">
                  {kpi.label}
                </p>
                <p className="mt-1 pl-2 font-mono text-xl font-semibold tabular-nums text-grey-text-strong sm:text-2xl">
                  {kpi.value}
                </p>
                {kpi.hint ? <p className="mt-1 pl-2 text-xs text-grey-muted">{kpi.hint}</p> : null}
              </article>
            );
          })}
        </section>

        {/* Toolbar */}
        <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="text"
              startIcon={Search}
              placeholder="Search name, code, or region…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 min-w-0"
              ref={searchInputRef}
            />
            <Input
              type="select"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="shrink-0 sm:w-44"
              hidePlaceholder={true}
              ref={regionSelectRef}
              options={[
                { label: 'All regions', value: 'ALL' },
                ...globalRegions.map((r) => ({ label: r, value: r })),
              ]}
            />
          </div>
          <div className="flex items-center gap-4 px-1 text-xs text-grey-muted font-medium">
            <span className="flex items-center gap-1.5">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">Alt</kbd>
                <span className="text-grey-icon">+</span>
                <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm">S</kbd>
              </span>
              Focus search
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text font-sans shadow-sm flex items-center h-[22px]">Alt</kbd>
                <span className="text-grey-icon">+</span>
                <kbd className="px-1 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text shadow-sm flex items-center justify-center h-[22px] w-[22px]"><ArrowLeft size={14} strokeWidth={2.5} /></kbd>
                <kbd className="px-1 py-0.5 border border-grey-border bg-grey-bg rounded text-grey-text shadow-sm flex items-center justify-center h-[22px] w-[22px]"><ArrowRight size={14} strokeWidth={2.5} /></kbd>
              </span>
              Switch focus
            </span>
          </div>
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={paginatedData}
          isLoading={isLoading}
          emptyState="No customers match your search or filter."
          pagination={{
            totalItems,
            pageSize,
            pageNo,
            totalPages,
          }}
          onPageChange={setPageNo}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageNo(1);
          }}
        />
      </div>

      {dropdownState && (
        <div
          className="absolute z-50 bg-white border border-grey-border shadow-lg rounded-md py-1 w-32 flex flex-col"
          style={{ top: dropdownState.y, left: dropdownState.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="text-left px-4 py-2 text-sm text-grey-text hover:bg-grey-bg hover:text-grey-text-strong transition-colors"
            onClick={() => {
              setSelectedCustomer(dropdownState.row);
              setEditOpen(true);
              setDropdownState(null);
            }}
          >
            Edit
          </button>
          <button
            className="text-left px-4 py-2 text-sm text-danger-main hover:bg-danger-bg transition-colors"
            onClick={() => {
              setSelectedCustomer(dropdownState.row);
              setDeleteOpen(true);
              setDropdownState(null);
            }}
          >
            Delete
          </button>
        </div>
      )}

      <AddCustomer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
      <EditCustomer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onEdit={handleEdit}
        customer={selectedCustomer}
      />
      <DeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        item={selectedCustomer}
        itemNameKey="name"
        title="Delete customer"
      />
    </>
  );
}
