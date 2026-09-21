import React, { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Search, Plus, ArrowLeft, ArrowRight, Eye, Pencil, Printer, Trash2 } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import AddPackaging from './modal/AddPackaging';
import EditPackaging from './modal/EditPackaging';
import DeleteModal from '@/common/modal/DeleteModal';
import clsx from 'clsx';
import { toast } from 'sonner';
import { getPackagingsApi, deletePackagingApi, updatePackagingApi, getProductsApi } from '@/lib/fetcher';
import { usePermission } from '@/hooks/usePermission';

export default function Packaging() {
  const { canRead, canCreate, canUpdate, canDelete } = usePermission('packaging');
  const [packagingsData, setPackagingsData] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const [productFilter, setProductFilter] = useState(null);
  const searchInputRef = useRef(null);
  const filterSelectRef = useRef(null);

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPackaging, setSelectedPackaging] = useState(null);
  
  const [dropdownState, setDropdownState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
        filterSelectRef.current?.focus();
      } else if (e.altKey && (e.key === 'ArrowLeft' || e.code === 'ArrowLeft')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadProductOptions = async (inputValue) => {
    try {
      const res = await getProductsApi(1, 20, inputValue, 'ACTIVE');
      if (res.data && res.data.success) {
        return res.data.data.data.map(p => ({ label: p.name, value: p.id }));
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  useEffect(() => {
    const closeDropdown = () => setDropdownState(null);
    if (dropdownState) {
      window.addEventListener('click', closeDropdown);
    }
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownState]);

  useEffect(() => {
    setPageNo(1);
  }, [query]);

  const fetchPackagings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getPackagingsApi(pageNo, pageSize, query, productFilter ? productFilter.value : 'ALL');
      if (response.data && response.data.success) {
        setPackagingsData(response.data.data.data || []);
        setTotalItems(response.data.data.pagination?.total || 0);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      } else {
        setPackagingsData([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch packagings:', error);
      toast.error('Failed to load packagings');
    } finally {
      setIsLoading(false);
    }
  }, [pageNo, pageSize, query, productFilter, refreshTrigger]);

  useEffect(() => {
    fetchPackagings();
  }, [fetchPackagings]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleAdd = () => {
    triggerRefresh();
    setAddOpen(false);
  };

  const handleEdit = () => {
    triggerRefresh();
    setEditOpen(false);
  };

  const handleDelete = async (deletedPackaging) => {
    try {
      const res = await deletePackagingApi(deletedPackaging.id);
      if (res.data?.success) {
        toast.success('Packaging deleted successfully');
        setDeleteOpen(false);
        triggerRefresh();
      } else {
        toast.error(res.data?.message || 'Failed to delete packaging');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
      console.error(err);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'PACKAGING NAME',
      render: (row) => (
        <span className="font-semibold text-grey-text-strong">{row.name}</span>
      ),
    },
    {
      key: 'product',
      label: 'PRODUCT NAME',
      render: (row) => <span className="text-sm text-grey-text">{row.product?.name || '-'}</span>,
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
          label: 'Actions',
          type: 'action',
          align: 'center',
          onClick: (row, e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setDropdownState({
                  row,
                  x: rect.right - 160,
                  y: rect.bottom + window.scrollY,
              });
          },
      });
  }

  return (
    <>
      <Head>
        <title>Packaging | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-5">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
              Packaging
            </h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">
              Search and manage product packaging.
            </p>
          </div>
          {canCreate && (
            <Button
              variant="primary"
              className="w-full sm:w-auto shrink-0"
              onClick={() => setAddOpen(true)}
              icon={Plus}
              text="Add packaging"
            />
          )}
        </div>

        {/* Toolbar */}
        <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="text"
              startIcon={Search}
              placeholder="Search packaging name…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 min-w-0"
              ref={searchInputRef}
            />
            <div className="shrink-0 sm:w-56" ref={filterSelectRef} tabIndex={-1}>
              <AsyncSelectInput
                value={productFilter}
                onChange={(selected) => setProductFilter(selected)}
                loadOptions={loadProductOptions}
                defaultOptions={true}
                placeholder="All products"
                isClearable={true}
              />
            </div>
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
          data={packagingsData}
          isLoading={isLoading}
          emptyState="No packagings match your search."
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

      {/* Action Dropdown */}
      {dropdownState && (
        <div
          className="absolute z-50 bg-white border border-grey-border shadow-lg rounded-md py-1.5 w-36 flex flex-col"
          style={{ top: dropdownState.y, left: dropdownState.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {canUpdate && (
            <Button
              variant="ghost"
              icon={Pencil}
              text="Edit"
              className="w-full justify-start rounded-none px-4 py-2 font-medium"
              onClick={() => {
                setSelectedPackaging(dropdownState.row);
                setEditOpen(true);
                setDropdownState(null);
              }}
            />
          )}
          {canUpdate && canDelete && <div className="h-px bg-grey-border my-1" />}
          {canDelete && (
            <Button
              variant="ghost"
              icon={Trash2}
              text="Delete"
              className="w-full justify-start rounded-none px-4 py-2 font-medium text-red-500"
              onClick={() => {
                setSelectedPackaging(dropdownState.row);
                setDeleteOpen(true);
                setDropdownState(null);
              }}
            />
          )}
        </div>
      )}

      {/* Modals */}
      <AddPackaging
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
      <EditPackaging
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onEdit={handleEdit}
        packaging={selectedPackaging}
      />
      <DeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        item={selectedPackaging}
        itemNameKey="name"
        title="Delete packaging"
        itemType="packaging"
        verificationWord="DELETE"
      />
    </>
  );
}
