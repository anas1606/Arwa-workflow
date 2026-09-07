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
    if (s === 'CANCELLED') return 'border-danger-200 text-danger-700 bg-danger-50';
    if (s === 'IN PRODUCTION') return 'border-ink-200 text-brand-700 bg-white';
    if (s === 'CONFIRMED') return 'border-ink-200 text-indigo-700 bg-white';
    return 'border-ink-200 text-ink-700 bg-white';
  };

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order',
      render: (row) => (
        <button
          onClick={() => { setSelectedOrder(row); setIsDetailsModalOpen(true); }}
          className="font-mono text-sm font-semibold text-brand-600 hover:underline cursor-pointer"
        >
          {row.orderNumber}
        </button>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (row) => <span className="text-sm font-semibold text-ink-900">{row.customerName}</span>,
    },
    {
      key: 'orderType',
      label: 'Order Type',
      render: (row) => (
        <span className="badge border border-brand-200 text-brand-800 bg-brand-50">
          {row.orderType}
        </span>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due',
      render: (row) => {
        const due = dueDaysLabel(row.dueDate);
        return (
          <div className="flex flex-col">
            <span className={clsx(
              "text-sm font-semibold",
              due.tone === 'danger' && "text-danger-700",
              due.tone === 'warning' && "text-warning-700",
              due.tone === 'info' && "text-brand-700",
              due.tone === 'neutral' && "text-ink-800"
            )}>
              {due.text}
            </span>
            <span className="text-2xs font-mono text-ink-400">{row.dueDate}</span>
          </div>
        );
      },
    },
    {
      key: 'products',
      label: 'Products',
      render: (row) => {
        const firstTwo = row.products.slice(0, 2);
        const extra = row.products.length - 2;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {firstTwo.map((p, i) => (
              <span key={i} className="text-xs font-medium text-ink-800 flex items-center">
                {i > 0 && <span className="text-ink-300 mx-1">·</span>}
                {p.name}
              </span>
            ))}
            {extra > 0 && (
              <span className="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-2xs font-bold text-brand-700">
                +{extra}
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
        <span className="text-sm font-semibold tabular-nums text-ink-800">
          {orderTotalQty(row)}
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <span className={clsx(
          "text-xs font-semibold",
          row.priority === 'High' ? "text-danger-700" :
            row.priority === 'Medium' ? "text-warning-700" : "text-success-700"
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
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-ink-900">
              Orders
            </h1>
            <p className="mt-1 text-sm leading-snug text-ink-500">
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
                  i === 0 ? 'bg-brand-600' :
                    i === 1 ? 'bg-brand-600' :
                      i === 2 ? 'bg-brand-600' : 'bg-warning-700'
                )}
                aria-hidden
              />
              <p className="pl-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                {kpi.label}
              </p>
              <p className="mt-1 pl-2 font-mono text-xl font-semibold tabular-nums text-ink-900 sm:text-2xl">
                {kpi.value}
              </p>
              {kpi.hint ? <p className="mt-1 pl-2 text-xs text-ink-500">{kpi.hint}</p> : null}
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
                    active ? "bg-white text-ink-900 border-ink-200 shadow-sm" : "bg-transparent text-ink-600 border-transparent hover:bg-white/50"
                  )}
                >
                  {t.label}
                  <span className={clsx(
                    "px-1.5 py-0.5 rounded-md text-xs tabular-nums font-mono",
                    active ? "bg-ink-100 text-ink-700" : "bg-white/60 text-ink-500"
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
                className="w-full bg-white rounded-md border-ink-200 shadow-sm"
              />
            </div>
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className={clsx(
                "flex items-center gap-2 px-3 h-10 rounded-md border text-sm font-bold transition-colors shrink-0",
                totalFilters > 0 ? "border-brand-200 bg-brand-50 text-brand-700" : "bg-white border-ink-200 shadow-sm text-ink-700 hover:bg-ink-50"
              )}
            >
              <Filter size={16} className={totalFilters > 0 ? "text-brand-600" : "text-ink-500"} />
              Filters
              {totalFilters > 0 && (
                <span className="bg-brand-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[11px] ml-0.5">
                  {totalFilters}
                </span>
              )}
            </button>
          </div>

          {/* Hints */}
          <div className="flex items-center gap-1 text-xs text-ink-400 font-medium flex-wrap">
            <span className="px-1 py-0.5 bg-ink-100 rounded text-ink-600 border border-ink-200 font-mono text-2xs">Alt</span>
            <span>+</span>
            <span className="px-1 py-0.5 bg-ink-100 rounded text-ink-600 border border-ink-200 font-mono text-2xs">S</span>
            <span>search ·</span>
            <span className="px-1 py-0.5 bg-ink-100 rounded text-ink-600 border border-ink-200 font-mono text-2xs">Alt</span>
            <span>+</span>
            <span className="px-1 py-0.5 bg-ink-100 rounded text-ink-600 border border-ink-200 font-mono text-2xs">1</span>
            <span className="px-1 py-0.5 bg-ink-100 rounded text-ink-600 border border-ink-200 font-mono text-2xs">2</span>
            <span className="px-1 py-0.5 bg-ink-100 rounded text-ink-600 border border-ink-200 font-mono text-2xs">3</span>
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
          className="absolute z-[9999] bg-white rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-ink-100 py-1.5 w-40 flex flex-col"
          style={{ top: actionMenu.top, left: actionMenu.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            className="w-full !justify-start !rounded-none !px-4 !py-2 hover:!bg-ink-50 !text-ink-700 !min-h-0 !h-auto !font-medium border-0"
            onClick={() => { setSelectedOrder(actionMenu.row); setIsDetailsModalOpen(true); setActionMenu(null); }}
            icon={() => <Eye size={16} className="text-ink-400" />}
            text="View details"
          />
          <Button
            variant="ghost"
            className="w-full !justify-start !rounded-none !px-4 !py-2 hover:!bg-ink-50 !text-ink-700 !min-h-0 !h-auto !font-medium border-0"
            onClick={() => { setSelectedOrder(actionMenu.row); setIsEditModalOpen(true); setActionMenu(null); }}
            icon={() => <Pencil size={16} className="text-ink-400" />}
            text="Edit"
          />
          <Button
            variant="ghost"
            className="w-full !justify-start !rounded-none !px-4 !py-2 hover:!bg-ink-50 !text-ink-700 !min-h-0 !h-auto !font-medium border-0"
            onClick={() => { setActionMenu(null); window.print(); }}
            icon={() => <Printer size={16} className="text-ink-400" />}
            text="Print"
          />
          <div className="h-px bg-ink-100 my-1 mx-2 shrink-0" />
          <Button
            variant="ghost"
            className="w-full !justify-start !rounded-none !px-4 !py-2 hover:!bg-danger-50 !text-danger-600 !min-h-0 !h-auto !font-medium border-0"
            onClick={() => {
              setActionMenu(null);
              setIsDeleteModalOpen(true);

            }}
            icon={() => <Trash2 size={16} className="text-danger-600" />}
            text="Delete"
          />
        </div>,
        document.body
      )}
    </>
  );
}

