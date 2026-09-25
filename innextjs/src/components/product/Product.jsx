import React, { useState, useMemo, useRef, useEffect } from 'react';
import Head from 'next/head';
import { Package, Search, Plus, ArrowLeft, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import clsx from 'clsx';
import { toast } from 'sonner';
import { getProductsApi, getCategoriesApi, getUnitsApi, getProductKpisApi, updateProductApi, deleteProductApi } from '@/lib/fetcher';
import { usePermission } from '@/hooks/usePermission';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';

import { useRouter } from 'next/router';
import DeleteModal from '@/common/modal/DeleteModal';

function productInitials(name) {
  return (name || 'NA')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function Product() {
  const router = useRouter();
  const { canRead, canCreate, canUpdate, canDelete } = usePermission('products');

  const [productsData, setProductsData] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState({ label: 'All categories', value: 'ALL' });
  const [stockFilter, setStockFilter] = useState('ALL');
  const [unitFilter, setUnitFilter] = useState({ label: 'All units', value: 'ALL' });
  
  const searchInputRef = useRef(null);
  const categoryRef = useRef(null);
  const stockRef = useRef(null);
  const unitRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [dropdownState, setDropdownState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [kpiData, setKpiData] = useState({ total: 0, active: 0, inactive: 0, lowStock: 0 });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  useEffect(() => {
    const closeDropdown = () => setDropdownState(null);
    if (dropdownState) {
      window.addEventListener('click', closeDropdown);
    }
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownState]);

  useKeyboardShortcuts({
      onAdd: canCreate ? () => router.push('/inventory/product/create') : undefined,
      onEdit: canUpdate ? (item) => router.push(`/inventory/product/edit/${item.id}`) : undefined,
      onDelete: canDelete ? (item) => { setProductToDelete(item); setDeleteModalOpen(true); } : undefined,
      onRefresh: () => { fetchProducts(); fetchKpis(); },
      searchId: "product-search-input",
      setPageNo,
      pageNo,
      totalPages,
      items: productsData,
      selectedRowIndex,
      setSelectedRowIndex,
      isModalOpen: deleteModalOpen,
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const categoryId = categoryFilter ? categoryFilter.value : 'ALL';
      const unitId = unitFilter ? unitFilter.value : 'ALL';
      const response = await getProductsApi(pageNo, pageSize, query, statusFilter, categoryId, stockFilter, unitId);
      if (response.data && response.data.success) {
        setProductsData(response.data.data.data || []);
        setTotalItems(response.data.data.pagination?.totalItems || 0);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      } else {
        setProductsData([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKpis = async () => {
    try {
      const response = await getProductKpisApi();
      if (response.data && response.data.success) {
        setKpiData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pageNo, pageSize, query, statusFilter, categoryFilter, stockFilter, unitFilter]);

  useEffect(() => {
    fetchKpis();
  }, []); // Refetch KPIs when needed (e.g. after add/edit)

  useEffect(() => {
    setPageNo(1);
  }, [query, statusFilter, categoryFilter, stockFilter, unitFilter]);

  const loadCategories = async (input) => {
    try {
      const response = await getCategoriesApi(1, 10, input, 'ACTIVE');
      if (response.data && response.data.success) {
        const options = response.data.data.data.map(c => ({ label: c.name, value: c.id }));
        return [{ label: 'All categories', value: 'ALL' }, ...options];
      }
    } catch (error) {
      console.error('Failed to load categories', error);
    }
    return [];
  };

  const loadUnits = async (input) => {
    try {
      const response = await getUnitsApi(1, 10, input, 'ACTIVE');
      if (response.data && response.data.success) {
        const options = response.data.data.data.map(u => ({ label: `${u.name} ${u.shortName ? `(${u.shortName})` : ''}`, value: u.id }));
        return [{ label: 'All units', value: 'ALL' }, ...options];
      }
    } catch (error) {
      console.error('Failed to load units', error);
    }
    return [];
  };

  const kpis = [
    {
      label: 'Total products',
      value: String(kpiData.total),
      hint: 'Items in catalog',
      tone: 'neutral',
    },
    {
      label: 'Active',
      value: String(kpiData.active),
      hint: 'Currently available',
      tone: 'success',
    },
    {
      label: 'Low stock',
      value: String(kpiData.lowStock),
      hint: 'Below minimum threshold',
      tone: 'warning',
    },
    {
      label: 'Inactive',
      value: String(kpiData.inactive),
      hint: 'Disabled items',
      tone: 'danger',
    },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary-dark">
            {productInitials(row.name)}
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
      key: 'category',
      label: 'Category',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm text-grey-text max-w-[150px]" title={row.category?.name}>
          <span className="text-grey-text-strong font-medium text-[13px]">{row.category ? row.category.name : '-'}</span>
        </span>
      ),
    },
    {
      key: 'stockQuantity',
      label: 'Stock',
      align: 'center',
      render: (row) => (
        <div className="text-center">
          <span className={clsx(
            "font-semibold text-sm",
            row.stockQuantity <= (row.lowStockThreshold ?? 10) ? "text-danger-main" : "text-grey-text-strong"
          )}>
            {row.stockQuantity}
          </span>

        </div>
      ),
    },
    {
      key: 'unit',
      label: 'Unit',
      render: (row) => <span className="text-sm text-grey-text">{row.unit ? (row.unit.shortName || row.unit.name) : '-'}</span>,
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-grey-text-strong">{row.createdByName || '-'}</span>
          <span className="text-xs text-grey-muted">{row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</span>
        </div>
      ),
    },
    {
      key: 'updatedBy',
      label: 'Updated By',
      render: (row) => row.updatedBy || row.updatedByName ? (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-grey-text-strong">{row.updatedByName || '-'}</span>
          <span className="text-xs text-grey-muted">{row.updatedAt ? new Date(row.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
        </div>
      ) : <span className="text-sm font-medium text-grey-text-strong">-</span>,
    },
    {
      key: 'isActive',
      label: 'Status',
      ...(canUpdate ? {
        type: 'toggle',
        onChange: async (row, newValue) => {
        try {
          // Optimistic update
          setProductsData(prev => prev.map(p => p.id === row.id ? { ...p, isActive: newValue } : p));
          const res = await updateProductApi(row.id, { isActive: newValue });
          if (res.data?.success) {
            toast.success('Product status updated');
            fetchKpis();
          } else {
            throw new Error(res.data?.message || 'Failed to update status');
          }
        } catch (error) {
          // Revert on error
          setProductsData(prev => prev.map(p => p.id === row.id ? { ...p, isActive: !newValue } : p));
          toast.error(error.message || 'Error updating product status');
        }
      }
      } : {
        render: (row) => (
          <span className={`badge ${row.isActive ? 'bg-success-subtle text-success-text' : 'bg-danger-subtle text-danger-text'}`}>
            {row.isActive ? 'Active' : 'Inactive'}
          </span>
        )
      })
    },
    ];

    if (canUpdate || canDelete) {
        columns.push({
            key: 'actions',
            label: 'Action',
            type: 'action',
            align: 'center',
            onClick: (row, e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const dropdownHeight = 85; 
                const spaceBelow = window.innerHeight - rect.bottom;
                
                let yPos = rect.bottom + window.scrollY;
                if (spaceBelow < dropdownHeight) {
                    yPos = rect.top + window.scrollY - dropdownHeight;
                }
                
                setDropdownState({
                    row,
                    x: rect.right - 128,
                    y: yPos,
                });
            },
        });
    }

  return (
    <>
      <Head>
        <title>Products | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-5">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
              Products
            </h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">
              Manage your inventory catalog and stock levels.
            </p>
          </div>
          {canCreate && (
            <Button
              variant="primary"
              className="w-full sm:w-auto shrink-0"
              onClick={() => router.push('/inventory/product/create')}
              icon={Plus}
              text="Add product"
            />
          )}
        </div>

        {/* KPIs */}
        <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Product KPIs">
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
              id="product-search-input"
              type="text"
              startIcon={Search}
              placeholder="Search name, code…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 min-w-0"
              ref={searchInputRef}
            />
            <div className="shrink-0 sm:w-48 z-20">
              <AsyncSelectInput
                ref={categoryRef}
                value={categoryFilter}
                onChange={(option) => setCategoryFilter(option || null)}
                defaultOptions={true}
                loadOptions={loadCategories}
                placeholder="All categories"
              />
            </div>
            <Input
              type="select"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="shrink-0 sm:w-32"
              hidePlaceholder={true}
              ref={stockRef}
              options={[
                { label: 'All stock', value: 'ALL' },
                { label: 'Low stock', value: 'LOW' },
              ]}
            />
            <div className="shrink-0 sm:w-36 z-20">
              <AsyncSelectInput
                ref={unitRef}
                value={unitFilter}
                onChange={(option) => setUnitFilter(option || null)}
                defaultOptions={true}
                loadOptions={loadUnits}
                placeholder="All units"
              />
            </div>
            <Input
              type="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="shrink-0 sm:w-32"
              hidePlaceholder={true}
              ref={statusRef}
              options={[
                { label: 'All status', value: 'ALL' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Inactive', value: 'INACTIVE' },
              ]}
            />
          </div>
          <KeyboardShortcutBar
            onAdd={canCreate ? () => router.push('/inventory/product/create') : undefined}
            onEdit={canUpdate ? (item) => router.push(`/inventory/product/edit/${item.id}`) : undefined}
            onDelete={canDelete ? (item) => { setProductToDelete(item); setDeleteModalOpen(true); } : undefined}
            onRefresh={() => { fetchProducts(); fetchKpis(); }}
            searchId="product-search-input"
            pageNo={pageNo}
            totalPages={totalPages}
            selectedItem={productsData[selectedRowIndex]}
            selectedRowIndex={selectedRowIndex}
            addLabel="Add Product"
          />
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={productsData}
          isLoading={isLoading}
          emptyState="No products match your search or filter."
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
                router.push(`/inventory/product/edit/${dropdownState.row.id}`);
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
                setProductToDelete(dropdownState.row);
                setDeleteModalOpen(true);
                setDropdownState(null);
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}



      <DeleteModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={async () => {
          if (!productToDelete) return;
          try {
            const res = await deleteProductApi(productToDelete.id);
            if (res.data?.success) {
              toast.success('Product deleted successfully');
              fetchProducts();
              fetchKpis();
              setDeleteModalOpen(false);
              setProductToDelete(null);
            } else {
              throw new Error(res.data?.message || 'Failed to delete product');
            }
          } catch (error) {
            throw error;
          }
        }}
        item={productToDelete}
        itemNameKey="name"
        title="Delete Product"
        itemType="product"
        verificationWord="DELETE"
      />
    </>
  );
}
