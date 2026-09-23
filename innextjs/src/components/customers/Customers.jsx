import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Building2, MapPin, Search, Plus, ArrowLeft, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import { CUSTOMERS, DUMMY_ORDERS } from '@/common/dummy';
import AddCustomer from './modal/AddCustomer';
import EditCustomer from './modal/EditCustomer';
import DeleteModal from '@/common/modal/DeleteModal';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';
import clsx from 'clsx';
import { toast } from 'sonner';

function customerInitials(name) {
  return (name || 'NA')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

import { getCustomersApi, deleteCustomerApi } from '@/lib/fetcher';
import { usePermission } from '@/hooks/usePermission';

export default function Customers() {
  const { canRead, canCreate, canUpdate, canDelete } = usePermission('customers');
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

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  
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

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Fetch customers from API
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getCustomersApi(pageNo, pageSize, query, regionFilter);
      if (response.data && response.data.success) {
        setCustomersData(response.data.data.data || []);
        setTotalItems(response.data.data.pagination?.total || 0);
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
  }, [pageNo, pageSize, query, regionFilter, refreshTrigger]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const paginatedData = customersData;

  const totalPages = Math.ceil(totalItems / pageSize);

  useKeyboardShortcuts({
      onAdd: canCreate ? () => setAddOpen(true) : undefined,
      onEdit: canUpdate ? (item) => { setSelectedCustomer(item); setEditOpen(true); } : undefined,
      onDelete: canDelete ? (item) => { setSelectedCustomer(item); setDeleteOpen(true); } : undefined,
      onRefresh: triggerRefresh,
      searchId: "customer-search-input",
      setPageNo,
      pageNo,
      totalPages,
      items: paginatedData,
      selectedRowIndex,
      setSelectedRowIndex,
      isModalOpen: addOpen || editOpen || deleteOpen,
  });

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

  const totalBrands = customersData.reduce((sum, c) => sum + (typeof c.brands === 'number' ? c.brands : (c.brands?.length || 0)), 0);
  
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

  const handleAdd = () => {
    triggerRefresh();
    setAddOpen(false);
  };

  const handleEdit = () => {
    triggerRefresh();
    setEditOpen(false);
  };

  const handleDelete = async (deletedCustomer) => {
    try {
      const res = await deleteCustomerApi(deletedCustomer.id);
      if (res.error || (res.data && !res.data.success)) {
        throw new Error(res.error?.message || res.data?.message || 'Failed to delete customer');
      }
      triggerRefresh();
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
      align: 'center',
      render: (row) => (
        <span className="font-mono text-sm font-semibold tabular-nums text-grey-text-dark">
          {typeof row.brands === 'number' ? row.brands : (row.brands?.length || 0)}
        </span>
      ),
    },
    {
      key: 'orders',
      label: 'Orders',
      align: 'center',
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
        key: 'createdBy',
        label: 'Created By',
        render: (row) => (
            <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-grey-text-strong">{row.createdByName || '-'}</span>
                <span className="text-xs text-grey-muted">
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '-'}
                </span>
            </div>
        ),
    },
    {
        key: 'updatedBy',
        label: 'Updated By',
        render: (row) => (
            <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-grey-text-strong">{row.updatedByName || '-'}</span>
                {row.updatedBy ? (
                    <span className="text-xs text-grey-muted">
                        {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : ''}
                    </span>
                ) : null}
            </div>
        ),
    }
    ];

    if (canUpdate || canDelete) {
        columns.push({
            key: 'actions',
            label: 'Action',
            type: 'action',
            align: 'center',
            onClick: (row, e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const dropdownHeight = 85; // Approximate height of 2 menu items
                const spaceBelow = window.innerHeight - rect.bottom;
                
                let yPos = rect.bottom + window.scrollY;
                if (spaceBelow < dropdownHeight) {
                    yPos = rect.top + window.scrollY - dropdownHeight;
                }
                
                setDropdownState({
                    row,
                    x: rect.right - 128, // exact width for w-32 (8rem/128px)
                    y: yPos,
                });
            },
        });
    }

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
          {canCreate && (
            <Button
              variant="primary"
              className="w-full sm:w-auto shrink-0"
              onClick={() => setAddOpen(true)}
              icon={Plus}
              text="Add customer"
            />
          )}
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
              id="customer-search-input"
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
          <KeyboardShortcutBar
            onAdd={canCreate ? () => setAddOpen(true) : undefined}
            onEdit={canUpdate ? (item) => { setSelectedCustomer(item); setEditOpen(true); } : undefined}
            onDelete={canDelete ? (item) => { setSelectedCustomer(item); setDeleteOpen(true); } : undefined}
            onRefresh={triggerRefresh}
            searchId="customer-search-input"
            pageNo={pageNo}
            totalPages={totalPages}
            selectedItem={paginatedData[selectedRowIndex]}
            selectedRowIndex={selectedRowIndex}
            addLabel="Add Customer"
          />
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
          selectedRowIndex={selectedRowIndex}
        />
      </div>

      {dropdownState && (
        <div
          className="absolute z-50 bg-white border border-grey-border shadow-lg rounded-md py-1 w-32 flex flex-col"
          style={{ top: dropdownState.y, left: dropdownState.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {canUpdate && (
            <button
              className="text-left px-4 py-2 text-sm text-grey-text hover:bg-grey-bg hover:text-grey-text-strong transition-colors flex items-center gap-2"
              onClick={() => {
                setSelectedCustomer(dropdownState.row);
                setEditOpen(true);
                setDropdownState(null);
              }}
            >
              <Pencil size={14} /> Edit
            </button>
          )}
          {canDelete && (
            <button
              className="text-left px-4 py-2 text-sm text-danger-main hover:bg-danger-bg transition-colors flex items-center gap-2"
              onClick={() => {
                setSelectedCustomer(dropdownState.row);
                setDeleteOpen(true);
                setDropdownState(null);
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
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
