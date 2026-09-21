import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import { Search, Plus, Filter, Printer, Pencil, Eye, Trash2, RefreshCw, LayoutList, Package, Tags, Factory } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import { dueDaysLabel, MACHINES } from '@/common/dummy';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import OrderDetailsModal from './modals/OrderDetailsModal';
import FilterModal from './modals/FilterModal';
import DeleteModal from '@/common/modal/DeleteModal';
import { getOrdersApi } from '@/lib/fetcher';
import { StatusBadge, OrderTypeBadge, MachineStatusBadge } from './badges';

export default function OrdersView() {
  const router = useRouter();
  
  // Data state
  const [ordersData, setOrdersData] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('orders');

  const productGrouped = useMemo(() => {
    const map = {};
    ordersData.forEach(order => {
      (order.orderLines || []).forEach(line => {
        const prod = line.product?.name || 'Unknown Product';
        if (!map[prod]) map[prod] = { product: prod, qty: 0, orders: [] };
        map[prod].qty += line.quantity;
        if (!map[prod].orders.find(o => o.id === order.id)) {
          map[prod].orders.push(order);
        }
      });
    });
    return Object.values(map);
  }, [ordersData]);

  const machineTypeGroups = useMemo(() => {
    // We deterministically assign orders to a machine to simulate the old layout
    const groups = MACHINES.map(m => ({ machine: m, orders: [], standard: 0, customised: 0 }));
    
    ordersData.forEach(order => {
      // hash order id to 0-3
      let hash = 0;
      for (let i = 0; i < order.id.length; i++) hash += order.id.charCodeAt(i);
      const mIdx = hash % MACHINES.length;
      
      groups[mIdx].orders.push(order);
      if (order.orderType?.toUpperCase() === 'CUSTOMIZE' || order.orderType?.toUpperCase() === 'CUSTOMISED') {
        groups[mIdx].customised++;
      } else {
        groups[mIdx].standard++;
      }
    });
    
    return groups;
  }, [ordersData]);
  
  
  // Table state
  const [query, setQuery] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('order_list');
  const [activeFilters, setActiveFilters] = useState({});

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        page: pageNo,
        limit: pageSize,
        search: query,
      });
      const filters = {};
      if (activeFilters.orderType) filters.orderType = activeFilters.orderType;
      if (activeFilters.priority) filters.priority = activeFilters.priority;
      if (activeFilters.status) filters.status = activeFilters.status;
      if (activeFilters.orderNumber) filters.orderNumber = activeFilters.orderNumber;
      if (activeFilters.customer) filters.customerId = activeFilters.customer;
      if (activeFilters.product) filters.productId = activeFilters.product;

      const res = await getOrdersApi(pageNo, pageSize, query, filters);
      
      if (res.data?.success) {
        setOrdersData(res.data.data.data);
        setKpis(res.data.data.kpis);
        setTotalItems(res.data.data.pagination.total);
        setTotalPages(res.data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setIsLoading(false);
    }
  }, [pageNo, pageSize, query, activeFilters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!actionMenu) return;
    const handleClose = () => setActionMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [actionMenu]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === '1') { e.preventDefault(); setViewMode('orders'); }
      if (e.altKey && e.key === '2') { e.preventDefault(); setViewMode('productGrouped'); }
      if (e.altKey && e.key === '3') { e.preventDefault(); setViewMode('orderTypeGrouped'); }
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        document.getElementById('search-orders')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalFilters = useMemo(() => {
    return Object.values(activeFilters).reduce((sum, filter) => {
      if (Array.isArray(filter)) return sum + filter.length;
      if (typeof filter === 'object' && filter !== null) {
        return sum + Object.values(filter).filter(v => v !== '').length;
      }
      return sum;
    }, 0);
  }, [activeFilters]);

  React.useEffect(() => {
    setPageNo(1);
  }, [query, activeTab]);



  const columns = [
    {
      key: 'orderNumber',
      label: 'Order',
      render: (row) => (
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setSelectedOrder(row); setIsDetailsModalOpen(true); }}>
          <span className="font-bold text-primary hover:text-primary-dark transition-colors">{row.orderNumber}</span>
        </div>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (row) => <span className="text-sm font-semibold text-grey-text-strong whitespace-nowrap">{row.customer?.name || '-'}</span>,
    },
    {
      key: 'orderType',
      label: 'Order Type',
      render: (row) => (
        <OrderTypeBadge orderType={row.orderType} />
      ),
    },
    {
      key: 'dueDate',
      label: 'Due',
      render: (row) => {
        const dueDate = new Date(row.dueDate);
        const today = new Date();
        // Zero out time
        dueDate.setHours(0,0,0,0);
        today.setHours(0,0,0,0);
        
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dateStr = dueDate.toISOString().split('T')[0];
        
        let dueText = '';
        let dueColor = 'text-grey-text-strong';
        if (diffDays < 0) {
          dueText = `${Math.abs(diffDays)} days overdue`;
          dueColor = 'text-danger-main font-bold';
        } else if (diffDays === 0) {
          dueText = 'Due today';
          dueColor = 'text-warning-dark font-bold';
        } else {
          dueText = `In ${diffDays} days`;
          dueColor = 'text-grey-text-strong font-semibold';
        }

        return (
          <div className="flex flex-col">
            <span className={clsx("text-sm", dueColor)}>{dueText}</span>
            <span className="text-xs text-grey-icon mt-0.5 font-mono">{dateStr}</span>
          </div>
        );
      },
    },
    {
      key: 'products',
      label: 'Products',
      render: (row) => {
        const lines = row.orderLines || [];
        if (lines.length === 0) return <span className="text-grey-muted">-</span>;
        
        const firstLine = lines[0];
        const extraCount = lines.length - 1;
        
        return (
          <div className="flex flex-col text-sm font-semibold text-grey-text-strong">
            <span className="truncate max-w-[200px]">{firstLine.product?.name || 'Unknown Product'}</span>
            {extraCount > 0 && (
              <span className="text-xs text-grey-icon mt-0.5 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-grey-icon inline-block" />
                <span className="truncate max-w-[150px]">{lines[1]?.product?.name || 'Unknown Product'}</span> 
                {extraCount > 1 && <span className="text-primary font-bold">+{extraCount - 1}</span>}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'qty',
      label: 'Qty',
      align: 'right',
      render: (row) => (
        <span className="text-sm font-semibold tabular-nums text-grey-text-dark">
          {(row.orderLines || []).reduce((sum, line) => sum + line.quantity, 0)}
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => {
        const p = row.priority?.toUpperCase();
        return (
          <span className={clsx("text-sm font-bold",
            p === 'HIGH' ? "text-danger-main" :
            p === 'MEDIUM' ? "text-warning-dark" : "text-success-main"
          )}>
            {row.priority ? row.priority.charAt(0).toUpperCase() + row.priority.slice(1).toLowerCase() : 'Low'}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center justify-end gap-3 text-grey-icon">
          <button onClick={(e) => { e.stopPropagation(); window.print(); }} className="hover:text-grey-text-strong transition-colors"><Printer size={18} /></button>
          <button onClick={(e) => { e.stopPropagation(); router.push(`/orders/${row.id}/edit`); }} className="hover:text-grey-text-strong transition-colors"><Pencil size={18} /></button>
        </div>
      ),
    }
  ];

  return (
    <>
      <Head>
        <title>Orders | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-5">

        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
              Orders
            </h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">
              Search, filter, and track customer / production orders.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Printer} text="Export" />
            <Button variant="secondary" icon={Printer} text="Print" />
            <Button
              variant="primary"
              onClick={() => router.push('/orders/new')}
              icon={Plus}
              text="Add new order"
            />
          </div>
        </div>

        {/* KPIs */}
        <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { label: "OPEN ORDERS", value: isLoading ? "..." : ordersData.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length, hint: "Not completed or cancelled" },
            { label: "IN PRODUCTION", value: isLoading ? "..." : ordersData.filter(o => o.status === 'IN_PRODUCTION').length, hint: "Active on the floor" },
            { label: "DUE THIS WEEK", value: isLoading ? "..." : ordersData.filter(o => new Date(o.dueDate) >= new Date() && new Date(o.dueDate) <= new Date(new Date().setDate(new Date().getDate() + 7))).length, hint: "Risk of delay" },
            { label: "LATE / BLOCKED", value: isLoading ? "..." : ordersData.filter(o => new Date(o.dueDate) < new Date() && o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length, hint: "Needs attention" },
          ].map((kpi, i) => (
            <article key={kpi.label} className="card-panel relative overflow-hidden !p-3 border-none rounded-md h-[90px]">
              <div
                className={clsx('absolute inset-y-0 left-0 w-1',
                  i === 0 ? 'bg-primary' :
                    i === 1 ? 'bg-primary' :
                      i === 2 ? 'bg-primary' : 'bg-warning-dark'
                )}
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
          ))}
        </section>

        {/* Tabs & Toolbar Container */}
        <div className="card-panel flex w-full flex-col gap-4 border-none !p-4 bg-white/40 backdrop-blur-md rounded-md shadow-sm">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('orders')}
              title="Alt+1"
              className={clsx(
                'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus:outline-none',
                viewMode === 'orders'
                  ? 'bg-white/90 text-grey-text-strong shadow-sm border border-grey-border'
                  : 'text-grey-icon hover:text-grey-text-strong bg-transparent',
              )}
            >
              <LayoutList className="h-3.5 w-3.5" aria-hidden />
              Order list
              <kbd className="ml-0.5 hidden rounded border border-grey-border/80 bg-white/80 px-1 font-mono text-[10px] font-semibold text-grey-muted lg:inline">
                1
              </kbd>
            </button>
            <button
              onClick={() => setViewMode('product')}
              title="Alt+2"
              className={clsx(
                'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus:outline-none',
                viewMode === 'product'
                  ? 'bg-white/90 text-grey-text-strong shadow-sm border border-grey-border'
                  : 'text-grey-icon hover:text-grey-text-strong bg-transparent',
              )}
            >
              <Package className="h-3.5 w-3.5" aria-hidden />
              By product
              <kbd className="ml-0.5 hidden rounded border border-grey-border/80 bg-white/80 px-1 font-mono text-[10px] font-semibold text-grey-muted lg:inline">
                2
              </kbd>
            </button>
            <button
              onClick={() => setViewMode('orderType')}
              title="Alt+3"
              className={clsx(
                'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus:outline-none',
                viewMode === 'orderType'
                  ? 'bg-white/90 text-grey-text-strong shadow-sm border border-grey-border'
                  : 'text-grey-icon hover:text-grey-text-strong bg-transparent',
              )}
            >
              <Tags className="h-3.5 w-3.5" aria-hidden />
              By order type
              <kbd className="ml-0.5 hidden rounded border border-grey-border/80 bg-white/80 px-1 font-mono text-[10px] font-semibold text-grey-muted lg:inline">
                3
              </kbd>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Input
                id="search-orders"
                type="text"
                startIcon={Search}
                placeholder="Search order #, customer..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white rounded-md border-grey-border shadow-sm"
              />
            </div>
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className={clsx(
                "flex items-center gap-2 px-3 h-10 rounded-md border text-sm font-bold transition-colors shrink-0",
                totalFilters > 0 ? "border-primary-subtle bg-primary-bg text-primary-dark" : "bg-white border-grey-border shadow-sm text-grey-text hover:bg-grey-bg"
              )}
            >
              <Filter size={16} className={totalFilters > 0 ? "text-primary" : "text-grey-muted"} />
              Filters
              {totalFilters > 0 && (
                <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-[11px] ml-0.5">
                  {totalFilters}
                </span>
              )}
            </button>
          </div>

          {/* Hints */}
          <div className="flex items-center gap-1 text-xs text-grey-icon font-medium flex-wrap">
            <span className="px-1 py-0.5 bg-grey-surface rounded text-grey-text-light border border-grey-border font-mono text-2xs">Alt</span>
            <span>+</span>
            <span className="px-1 py-0.5 bg-grey-surface rounded text-grey-text-light border border-grey-border font-mono text-2xs">S</span>
            <span>search ·</span>
            <span className="px-1 py-0.5 bg-grey-surface rounded text-grey-text-light border border-grey-border font-mono text-2xs">Alt</span>
            <span>+</span>
            <span className="px-1 py-0.5 bg-grey-surface rounded text-grey-text-light border border-grey-border font-mono text-2xs">1</span>
            <span className="px-1 py-0.5 bg-grey-surface rounded text-grey-text-light border border-grey-border font-mono text-2xs">2</span>
            <span className="px-1 py-0.5 bg-grey-surface rounded text-grey-text-light border border-grey-border font-mono text-2xs">3</span>
            <span>switch views ·</span>
            <Filter size={12} className="inline ml-1" />
            <span>Filters — order, order date, due date, quantity, customer, priority, status, product</span>
          </div>
        </div>

        {/* Views */}
        {viewMode === 'orders' && (
          <CommonTable
            columns={columns}
            data={ordersData}
            isLoading={isLoading}
            emptyState="No orders found."
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
        )}

        {viewMode === 'product' && (
          <div className="w-full space-y-4">
            {productGrouped.map((group) => (
              <section key={group.product} className="card-panel !p-0 w-full overflow-hidden bg-white shadow-sm border border-grey-border rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-border/60 bg-grey-bg/50 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-dark">
                      <Package className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-grey-text-strong">
                        {group.product}
                      </h2>
                      <p className="text-2xs font-medium text-grey-muted">
                        Total quantity: {group.qty}
                      </p>
                    </div>
                  </div>
                </div>
                <CommonTable
                  columns={columns}
                  data={group.orders}
                  isLoading={isLoading}
                  emptyState="No orders for this product."
                />
              </section>
            ))}
            {productGrouped.length === 0 && !isLoading && (
              <div className="text-center py-10 text-sm text-grey-muted bg-white rounded-lg border border-grey-border">
                No orders match your search or filter.
              </div>
            )}
          </div>
        )}

        {/* By Machine / Order Type view */}
        <div className={clsx("transition-opacity duration-300", viewMode === 'orderType' ? 'opacity-100 block' : 'opacity-0 hidden')}>
          {viewMode === 'orderType' && (
            <div className="w-full space-y-4">
              {machineTypeGroups.map((group) => (
                <section key={group.machine.id} className="card-panel !p-0 w-full overflow-hidden bg-white shadow-sm border border-grey-border rounded-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-border/60 bg-grey-bg/50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-dark">
                        <Factory className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-bold text-grey-text-strong">
                          {group.machine.name}
                        </h2>
                        <p className="text-2xs font-medium text-grey-muted">
                          {group.machine.station} · {group.machine.job}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <MachineStatusBadge status={group.machine.status} />
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-grey-surface px-2 py-1 text-2xs font-semibold text-grey-text-strong border border-grey-border">
                          Company standard
                          <span className="font-mono text-sm font-bold text-grey-text-strong">
                            {group.standard}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 text-2xs font-semibold text-primary-dark border border-primary/20">
                          Customised
                          <span className="font-mono text-sm font-bold">
                            {group.customised}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {group.orders.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-grey-muted">
                      No orders assigned to this machine for the current filters.
                    </p>
                  ) : (
                    <CommonTable
                      columns={columns}
                      data={group.orders}
                      isLoading={isLoading}
                      emptyState="No orders for this machine."
                    />
                  )}
                </section>
              ))}
              
              <p className="text-xs text-grey-muted px-1">
                {machineTypeGroups.length} machines · {ordersData.length} orders · 
                Company standard {machineTypeGroups.reduce((s, g) => s + g.standard, 0)} · 
                Customised {machineTypeGroups.reduce((s, g) => s + g.customised, 0)}
              </p>
            </div>
          )}
        </div>
      </div>

      <OrderDetailsModal
        open={isDetailsModalOpen}
        selectedOrder={selectedOrder}
        onClose={() => setIsDetailsModalOpen(false)}
        onEdit={() => { setIsDetailsModalOpen(false); router.push(`/orders/${selectedOrder?.id}/edit`); }}
      />

      <DeleteModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => setIsDeleteModalOpen(false)}
        title="Delete order"
      />

      <FilterModal
        open={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        ordersData={ordersData}
        initialFilters={activeFilters}
        onApply={(filters) => {
          setActiveFilters(filters);
          setPageNo(1);
        }}
      />
      {actionMenu && typeof document !== 'undefined' && createPortal(
        <div
          className="absolute z-[9999] bg-white rounded-md shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-grey-surface py-1.5 w-40 flex flex-col"
          style={{ top: actionMenu.top, left: actionMenu.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            className="w-full !justify-start !rounded-none !px-4 !py-2 hover:!bg-grey-bg !text-grey-text !min-h-0 !h-auto !font-medium border-0"
            onClick={() => { setSelectedOrder(actionMenu.row); setIsDetailsModalOpen(true); setActionMenu(null); }}
            icon={() => <Eye size={16} className="text-grey-icon" />}
            text="View details"
          />
          <Button
            variant="ghost"
            className="w-full !justify-start !rounded-none !px-4 !py-2 hover:!bg-grey-bg !text-grey-text !min-h-0 !h-auto !font-medium border-0"
            onClick={() => { setSelectedOrder(actionMenu.row); router.push(`/orders/${actionMenu.row.id}/edit`); setActionMenu(null); }}
            icon={() => <Pencil size={16} className="text-grey-icon" />}
            text="Edit"
          />
          <Button
            variant="ghost"
            className="w-full !justify-start !rounded-none !px-4 !py-2 hover:!bg-grey-bg !text-grey-text !min-h-0 !h-auto !font-medium border-0"
            onClick={() => { setActionMenu(null); window.print(); }}
            icon={() => <Printer size={16} className="text-grey-icon" />}
            text="Print"
          />
          <div className="h-px bg-grey-surface my-1 mx-2 shrink-0" />
          <Button
            variant="ghost"
            className="w-full !justify-start !rounded-none !px-4 !py-2 hover:!bg-danger-bg !text-danger-main !min-h-0 !h-auto !font-medium border-0"
            onClick={() => {
              setActionMenu(null);
              setIsDeleteModalOpen(true);

            }}
            icon={() => <Trash2 size={16} className="text-danger-main" />}
            text="Delete"
          />
        </div>,
        document.body
      )}
    </>
  );
}

