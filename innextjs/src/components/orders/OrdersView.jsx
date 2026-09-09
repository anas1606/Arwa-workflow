import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import { Search, Plus, Filter, Printer, Pencil, X, Eye, Trash2 } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import { DUMMY_ORDERS, ORDER_KPIS, dueDaysLabel, orderTotalQty } from '@/common/dummy';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/router';
import OrderDetailsModal from './modals/OrderDetailsModal';
import EditOrderModal from './modals/EditOrderModal';
import FilterModal from './modals/FilterModal';
import DeleteModal from '@/common/modal/DeleteModal';

export default function OrdersView() {
  const router = useRouter();
  const [ordersData] = useState(DUMMY_ORDERS);
  const [query, setQuery] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [activeTab, setActiveTab] = useState('order_list');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

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

  const filteredData = useMemo(() => {
    let data = [...ordersData];

    // Apply active filters
    if (activeFilters && Object.keys(activeFilters).length > 0) {
      if (activeFilters.orderNumber?.length) data = data.filter(d => activeFilters.orderNumber.includes(d.orderNumber));
      
      if (activeFilters.orderDate) {
        const { from, to } = activeFilters.orderDate;
        if (from) data = data.filter(d => new Date(d.orderDate || 'N/A') >= new Date(from));
        if (to) data = data.filter(d => new Date(d.orderDate || 'N/A') <= new Date(to));
      }
      
      if (activeFilters.dueDate) {
        const { from, to } = activeFilters.dueDate;
        if (from) data = data.filter(d => new Date(d.dueDate) >= new Date(from));
        if (to) data = data.filter(d => new Date(d.dueDate) <= new Date(to));
      }
      
      if (activeFilters.quantity) {
        const { min, max } = activeFilters.quantity;
        data = data.filter(d => {
          const qty = d.products?.reduce((sum, p) => sum + p.qty, 0) || 0;
          if (min && qty < parseInt(min, 10)) return false;
          if (max && qty > parseInt(max, 10)) return false;
          return true;
        });
      }
      
      if (activeFilters.customer?.length) data = data.filter(d => activeFilters.customer.includes(d.customerName));
      if (activeFilters.priority?.length) data = data.filter(d => activeFilters.priority.includes(d.priority));
      if (activeFilters.status?.length) data = data.filter(d => activeFilters.status.includes(d.status));
      if (activeFilters.product?.length) data = data.filter(d => {
        return d.products?.some(p => activeFilters.product.includes(p.name));
      });
    }

    // Add data according to tabs change
    if (activeTab === 'by_product') {
      data.sort((a, b) => (b.products?.length || 0) - (a.products?.length || 0));
    } else if (activeTab === 'by_order_type') {
      data.sort((a, b) => a.orderType.localeCompare(b.orderType));
    }

    const q = query.trim().toLowerCase();
    return data.filter((o) => {
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q)
      );
    });
  }, [ordersData, activeFilters, activeTab]);

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

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    const start = (pageNo - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pageNo, pageSize]);

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
      render: (row) => <span className="text-sm font-semibold text-grey-text-strong whitespace-nowrap">{row.customerName}</span>,
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
        const due = dueDaysLabel(row.dueDate);
        const toneBg = due.tone === 'danger' ? 'bg-danger-subtle text-danger-dark' :
                       due.tone === 'warning' ? 'bg-warning-subtle text-warning-dark' :
                       due.tone === 'info' ? 'bg-primary-subtle text-primary-dark' : 'bg-grey-surface text-grey-text-dark';
        return (
          <div className="max-w-[140px]">
            <span className={clsx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-semibold whitespace-nowrap", toneBg)}>
              {due.text}
            </span>
            <p className="mt-0.5 text-2xs text-grey-icon truncate ">{row.dueDate}</p>
          </div>
        );
      },
    },
    {
      key: 'products',
      label: 'Products',
      render: (row) => {
        const options = row.products.map(p => p.name);
        const MAX_VISIBLE = 1;
        const overflow = options.length - MAX_VISIBLE;
        const visible = options.slice(0, MAX_VISIBLE);
        return (
          <div className="flex items-center gap-1">
            {visible.map((opt, idx) => (
              <span key={idx} className="inline-flex rounded-md border border-grey-border/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-grey-text-dark max-w-[120px] truncate">{opt}</span>
            ))}
            {overflow > 0 && (
              <span className="relative inline-block">
                <span className="peer inline-flex rounded-md bg-grey-bg px-1.5 py-0.5 text-2xs font-semibold text-grey-text-light cursor-help whitespace-nowrap">+{overflow} more</span>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 opacity-0 transition-opacity peer-hover:opacity-100 whitespace-nowrap rounded-md bg-grey-text-strong px-2 py-1.5 text-xs text-white shadow-lg">
                  {options.slice(MAX_VISIBLE).join(', ')}
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
          {orderTotalQty(row)}
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
          {ORDER_KPIS.map((kpi, i) => (
            <article key={kpi.label} className="card-panel relative overflow-hidden !p-3 border-none rounded-md">
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
              { id: 'order_list', label: 'Order list', count: 18, shortcut: '1' },
              { id: 'by_product', label: 'By product', count: 2, shortcut: '2' },
              { id: 'by_order_type', label: 'By order type', count: 3, shortcut: '3' },
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
            <span className="px-1 py-0.5 bg-grey-surface rounded text-grey-text-light border border-grey-border font-mono text-2xs">2</span>
            <span className="px-1 py-0.5 bg-grey-surface rounded text-grey-text-light border border-grey-border font-mono text-2xs">3</span>
            <span>switch views ·</span>
            <Filter size={12} className="inline ml-1" />
            <span>Filters — order, order date, due date, quantity, customer, priority, status, product</span>
          </div>
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={paginatedData}
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
        onEdit={() => { setIsDetailsModalOpen(false); setIsEditModalOpen(true); }}
        getStatusStyles={getStatusStyles}
      />

      <EditOrderModal
        open={isEditModalOpen}
        selectedOrder={selectedOrder}
        onClose={() => setIsEditModalOpen(false)}
        onSave={() => setIsEditModalOpen(false)}
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
          className="absolute z-[9999] bg-white rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-grey-surface py-1.5 w-40 flex flex-col"
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
            onClick={() => { setSelectedOrder(actionMenu.row); setIsEditModalOpen(true); setActionMenu(null); }}
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

