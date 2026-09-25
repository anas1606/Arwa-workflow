import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import { Search, Plus, Filter, Printer, Pencil, Eye, Trash2, RefreshCw, LayoutList, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import { dueDaysLabel } from '@/common/dummy';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import OrderDetailsModal from './modals/OrderDetailsModal';
import FilterModal from './modals/FilterModal';
import DeleteModal from '@/common/modal/DeleteModal';
import { getOrdersApi, getOrdersByProductApi, getOrderFiltersApi } from '@/lib/fetcher';
import { StatusBadge, OrderTypeBadge } from './badges';
import OrdersListTab from './tabs/OrdersListTab';
import ByProductTab from './tabs/ByProductTab';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';
import { usePermission } from '@/hooks/usePermission';

export default function OrdersView() {
  const router = useRouter();
  const { canCreate, canUpdate, canDelete, canRead } = usePermission('orders');
  
  // Data state
  const [ordersData, setOrdersData] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('orders');

  const [productData, setProductData] = useState([]);
  const [productTotalItems, setProductTotalItems] = useState(0);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [productPageNo, setProductPageNo] = useState(1);
  
  // Table state
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('order_list');
  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getOrdersApi(pageNo, pageSize, debouncedQuery, activeFilters);
      
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
  }, [pageNo, pageSize, debouncedQuery, activeFilters]);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getOrdersByProductApi(productPageNo, pageSize, debouncedQuery, activeFilters);
      
      if (res.data?.success) {
        setProductData(res.data.data.data);
        setProductTotalItems(res.data.data.pagination.total);
        setProductTotalPages(res.data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch orders by product', error);
    } finally {
      setIsLoading(false);
    }
  }, [productPageNo, pageSize, debouncedQuery, activeFilters]);

  useEffect(() => {
    if (viewMode === 'orders') {
        fetchOrders();
    } else if (viewMode === 'product') {
        fetchProducts();
    }
  }, [fetchOrders, fetchProducts, viewMode]);

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

useKeyboardShortcuts({
      onAdd: () => router.push('/orders/create'),
      onEdit: (item) => router.push(`/orders/edit/${item.id}`),
      onDelete: (item) => { setSelectedOrder(item); setIsDeleteModalOpen(true); },
      onRefresh: fetchOrders,
      searchId: "search-orders",
      pageNo: viewMode === 'orders' ? pageNo : productPageNo,
      setPageNo: viewMode === 'orders' ? setPageNo : setProductPageNo,
      totalPages: viewMode === 'orders' ? totalPages : productTotalPages,
      items: viewMode === 'orders' ? ordersData : productData,
      selectedRowIndex,
      setSelectedRowIndex,
      isModalOpen: isDetailsModalOpen || isDeleteModalOpen || isFilterModalOpen,
      customShortcuts: [
          { key: '1', altKey: true, action: () => setViewMode('orders') },
          { key: '2', altKey: true, action: () => setViewMode('product') },
          { key: 'ArrowRight', altKey: true, action: () => {
              if (viewMode === 'orders' && pageNo < totalPages) setPageNo(p => p + 1);
              else if (viewMode === 'product' && productPageNo < productTotalPages) setProductPageNo(p => p + 1);
          } },
          { key: 'ArrowLeft', altKey: true, action: () => {
              if (viewMode === 'orders' && pageNo > 1) setPageNo(p => p - 1);
              else if (viewMode === 'product' && productPageNo > 1) setProductPageNo(p => p - 1);
          } },
          { key: 'ArrowDown', action: () => {
              if (isDetailsModalOpen || isDeleteModalOpen || isFilterModalOpen) return;
              const max = viewMode === 'orders' ? ordersData.length - 1 : productData.length - 1;
              if (max >= 0) setSelectedRowIndex(prev => Math.min(prev + 1, max));
          } },
          { key: 'ArrowUp', action: () => {
              if (isDetailsModalOpen || isDeleteModalOpen || isFilterModalOpen) return;
              setSelectedRowIndex(prev => Math.max(prev - 1, 0));
          } }
      ]
  });

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
  }, [debouncedQuery, activeTab]);



  const columns = [
    {
      key: 'orderNumber',
      label: 'Order',
      render: (row) => (
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setSelectedOrder(row); setIsDetailsModalOpen(true); }}>
          <span className="font-bold text-primary hover:text-primary-dark transition-colors whitespace-nowrap">{row.orderNumber}</span>
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
          <div className="flex flex-col whitespace-nowrap">
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
          <div className="flex flex-col text-sm font-semibold text-grey-text-strong max-w-[180px]">
            <span className="truncate">{firstLine.product?.name || 'Unknown Product'}</span>
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
          {canUpdate && (
            <button onClick={(e) => { e.stopPropagation(); router.push(`/orders/edit/${row.id}`); }} className="hover:text-grey-text-strong transition-colors"><Pencil size={18} /></button>
          )}
        </div>
      ),
    }
  ];

  if (!canRead) {
    return (
      <div className="w-full flex items-center justify-center p-20">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-danger-main/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-danger-main font-bold text-xl">!</span>
          </div>
          <h2 className="text-lg font-bold text-grey-text-strong">Access Denied</h2>
          <p className="text-sm text-grey-muted mt-2">You do not have permission to view orders.</p>
        </div>
      </div>
    );
  }

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
            {canCreate && (
              <Button
                variant="primary"
                onClick={() => router.push('/orders/create')}
                icon={Plus}
                text="Add new order"
              />
            )}
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
            <article key={kpi.label} className="card-panel relative overflow-hidden !p-3 border-none rounded-xl h-[90px]">
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
        <div className="card-panel flex w-full flex-col gap-4 border-none !p-4 bg-white/40 backdrop-blur-md rounded-xl shadow-sm">
          {/* Tabs */}
          <nav className="relative inline-flex items-center p-1 bg-white/60 rounded-[10px] shrink-0 self-start gap-1">
            {/* Animated Background Pill */}
            <div
              className={clsx(
                "absolute left-1 top-1 bottom-1 w-[130px] rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-grey-border/50 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                viewMode === 'orders' ? "translate-x-0" : "translate-x-[134px]"
              )}
            />
            <button
              onClick={() => setViewMode('orders')}
              title="Alt+1"
              className={clsx(
                'relative z-10 w-[130px] inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none',
                viewMode === 'orders' ? 'text-grey-text-strong' : 'text-grey-icon hover:text-grey-text-strong'
              )}
            >
              <LayoutList className="h-3.5 w-3.5" aria-hidden />
              Order list
              <kbd className={clsx("ml-0.5 hidden rounded border px-1 font-mono text-[10px] font-semibold lg:inline", viewMode === 'orders' ? 'border-grey-border/80 bg-white text-grey-muted shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'border-grey-border/40 bg-transparent text-grey-icon/70')}>
                1
              </kbd>
            </button>
            <button
              onClick={() => setViewMode('product')}
              title="Alt+2"
              className={clsx(
                'relative z-10 w-[130px] inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none',
                viewMode === 'product' ? 'text-grey-text-strong' : 'text-grey-icon hover:text-grey-text-strong'
              )}
            >
              <Package className="h-3.5 w-3.5" aria-hidden />
              By product
              <kbd className={clsx("ml-0.5 hidden rounded border px-1 font-mono text-[10px] font-semibold lg:inline", viewMode === 'product' ? 'border-grey-border/80 bg-white text-grey-muted shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'border-grey-border/40 bg-transparent text-grey-icon/70')}>
                2
              </kbd>
            </button>
          </nav>

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
              />
            </div>
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className={clsx(
                "flex items-center gap-2 px-3 h-10 rounded-xl border text-sm font-bold transition-colors shrink-0",
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
         <KeyboardShortcutBar
            onAdd={canCreate ? () => router.push('/orders/create') : undefined}
            onEdit={canUpdate ? (item) => router.push(`/orders/edit/${item.id}`) : undefined}
            onRefresh={fetchOrders}
            searchId="search-orders"
            pageNo={viewMode === 'orders' ? pageNo : productPageNo}
            totalPages={viewMode === 'orders' ? totalPages : productTotalPages}
            selectedItem={viewMode === 'orders' ? ordersData[selectedRowIndex] : productData[selectedRowIndex]}
            selectedRowIndex={selectedRowIndex}
            addLabel="Add Order"
            customActions={[
                { label: 'Order List', keyCombo: ['Alt', '1'], onClick: () => setViewMode('orders') },
                { label: 'By Product', keyCombo: ['Alt', '2'], onClick: () => setViewMode('product') },
            ]}
          />
        </div>

        {/* Views */}
        {viewMode === 'orders' && (
          <OrdersListTab 
            columns={columns}
            ordersData={ordersData}
            isLoading={isLoading}
            totalItems={totalItems}
            pageSize={pageSize}
            pageNo={pageNo}
            totalPages={totalPages}
            setPageNo={setPageNo}
            setPageSize={setPageSize}
            selectedRowIndex={selectedRowIndex}
          />
        )}

        {viewMode === 'product' && (
          <ByProductTab
            columns={columns}
            productData={productData}
            isLoading={isLoading}
            productTotalItems={productTotalItems}
            pageSize={pageSize}
            productPageNo={productPageNo}
            productTotalPages={productTotalPages}
            setProductPageNo={setProductPageNo}
            setPageSize={setPageSize}
            query={query}
            activeFilters={activeFilters}
            selectedRowIndex={selectedRowIndex}
          />
        )}
      </div>

      <OrderDetailsModal
        open={isDetailsModalOpen}
        selectedOrder={selectedOrder}
        onClose={() => setIsDetailsModalOpen(false)}
        onEdit={() => { setIsDetailsModalOpen(false); router.push(`/orders/edit/${selectedOrder?.id}`); }}
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
        initialFilters={activeFilters}
        onApply={(filters) => {
          setActiveFilters(filters);
          setPageNo(1);
        }}
      />
      {actionMenu && typeof document !== 'undefined' && createPortal(
        <div
          className="absolute z-[9999] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-grey-surface py-1.5 w-40 flex flex-col"
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
            onClick={() => { setSelectedOrder(actionMenu.row); router.push(`/orders/edit/${actionMenu.row.id}`); setActionMenu(null); }}
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

