import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import { Search, Plus, Filter, Printer, Pencil, Eye, Trash2, RefreshCw } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import { dueDaysLabel } from '@/common/dummy';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import OrderDetailsModal from './modals/OrderDetailsModal';
import FilterModal from './modals/FilterModal';
import DeleteModal from '@/common/modal/DeleteModal';
import { getOrdersApi } from '@/lib/fetcher';

export default function OrdersView() {
  const router = useRouter();
  
  // Data state
  const [ordersData, setOrdersData] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
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
      if (e.altKey && e.key === '1') { e.preventDefault(); setActiveTab('order_list'); }
      if (e.altKey && e.key === '2') { e.preventDefault(); setActiveTab('by_product'); }
      if (e.altKey && e.key === '3') { e.preventDefault(); setActiveTab('by_order_type'); }
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

  const getStatusStyles = (status) => {
    const s = status.toUpperCase().replace('_', ' ');
    if (s === 'CANCELLED') return 'border-danger-subtle text-danger-dark bg-danger-bg';
    if (s === 'IN PRODUCTION') return 'border-grey-border text-primary-dark bg-white';
    if (s === 'CONFIRMED') return 'border-grey-border text-primary-dark bg-white';
    return 'border-grey-border text-grey-text bg-white';
  };

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order',
      render: (row) => (
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setSelectedOrder(row); setIsDetailsModalOpen(true); }}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-2xs font-bold text-primary-dark">
            {row.orderNumber.replace(/[^0-9]/g, '').slice(-3) || 'ORD'}
          </span>
          <p className="font-semibold text-grey-text-strong truncate hover:text-primary transition-colors">{row.orderNumber}</p>
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
        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary-dark whitespace-nowrap">
          {row.orderType}
        </span>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due',
      render: (row) => {
        const dateStr = new Date(row.dueDate).toLocaleDateString();
        return (
          <div className="max-w-[140px]">
            <p className="mt-0.5 text-2xs text-grey-icon truncate ">{dateStr}</p>
          </div>
        );
      },
    },
    {
      key: 'products',
      label: 'Products',
      render: (row) => {
        // Aggregate quantities by product name
        const productMap = (row.orderLines || []).reduce((acc, line) => {
          const name = line.product?.name;
          if (name) {
            acc[name] = (acc[name] || 0) + line.quantity;
          }
          return acc;
        }, {});
        
        const aggregatedOptions = Object.entries(productMap).map(([name, qty]) => `${name} (${qty})`);
        const MAX_VISIBLE = 1;
        const overflow = aggregatedOptions.length - MAX_VISIBLE;
        const visible = aggregatedOptions.slice(0, MAX_VISIBLE);
        
        return (
          <div className="flex items-center gap-1">
            {visible.map((opt, idx) => (
              <span key={idx} className="inline-flex rounded-md border border-grey-border/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-grey-text-dark max-w-[120px] truncate">{opt}</span>
            ))}
            {overflow > 0 && (
              <span className="relative inline-block">d
                <span className="peer inline-flex rounded-md bg-grey-bg px-1.5 py-0.5 text-2xs font-semibold text-grey-text-light cursor-help whitespace-nowrap">+{overflow} more</span>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 opacity-0 transition-opacity peer-hover:opacity-100 whitespace-nowrap rounded-md bg-grey-text-strong px-2 py-1.5 text-xs text-white shadow-lg">
                  <div className="flex flex-col gap-1">
                    {aggregatedOptions.slice(MAX_VISIBLE).map((opt, i) => (
                       <span key={i}>{opt}</span>
                    ))}
                  </div>
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-grey-text-strong"></div>
                </div>
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
      render: (row) => (
        <span className={clsx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-semibold whitespace-nowrap",
          row.priority === 'High' ? "bg-danger-subtle text-danger-dark" :
          row.priority === 'Medium' ? "bg-warning-subtle text-warning-dark" : "bg-success-subtle text-success-dark"
        )}>
          {row.priority}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        return (
          <span className={clsx("badge px-2 py-1 rounded-md text-xs font-semibold shadow-sm whitespace-nowrap", getStatusStyles(row.status))}>
            {row.status.toUpperCase().replace('_', ' ')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      type: 'action',
      align: 'center',
      onClick: (row, e) => {
        if (e) {
          const rect = e.currentTarget.getBoundingClientRect();
          setActionMenu({
            row,
            top: rect.bottom + window.scrollY + 4,
            left: rect.right + window.scrollX - 160
          });
        } else {
          setSelectedOrder(row);
          setIsDetailsModalOpen(true);
        }
      }
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
            {[
              { id: 'order_list', label: 'Order list', count: totalItems, shortcut: '1' },
            ].map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border",
                    active ? "bg-white text-grey-text-strong border-grey-border shadow-sm" : "bg-transparent text-grey-text-light border-transparent hover:bg-white/50"
                  )}
                >
                  {t.label}
                  <span className={clsx(
                    "px-1.5 py-0.5 rounded-md text-xs tabular-nums font-mono",
                    active ? "bg-grey-surface text-grey-text" : "bg-white/60 text-grey-muted"
                  )}>{t.count}</span>
                </button>
              )
            })}
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
            <span>switch views ·</span>
            <Filter size={12} className="inline ml-1" />
            <span>Filters — order, order date, due date, quantity, customer, priority, status, product</span>
          </div>
        </div>

        {/* Table */}
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
      </div>

      <OrderDetailsModal
        open={isDetailsModalOpen}
        selectedOrder={selectedOrder}
        onClose={() => setIsDetailsModalOpen(false)}
        onEdit={() => { setIsDetailsModalOpen(false); router.push(`/orders/${selectedOrder?.id}/edit`); }}
        getStatusStyles={getStatusStyles}
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

