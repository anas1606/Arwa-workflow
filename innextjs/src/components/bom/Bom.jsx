import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { Package, Search, Plus, Pencil, Trash2, Layers, Eye } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { toast } from 'sonner';
import { getBomsApi, deleteBomApi } from '@/lib/fetcher';
import { usePermission } from '@/hooks/usePermission';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';
import { useRouter } from 'next/router';
import DeleteModal from '@/common/modal/DeleteModal';
import BomDetailModal from '@/common/modal/BomDetailModal';

export default function Bom() {
  const router = useRouter();
  const { canRead, canCreate, canUpdate, canDelete } = usePermission('bom'); 

  const [bomsData, setBomsData] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  
  const searchInputRef = useRef(null);

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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bomToDelete, setBomToDelete] = useState(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [bomToView, setBomToView] = useState(null);

  useEffect(() => {
    const closeDropdown = () => setDropdownState(null);
    if (dropdownState) {
      window.addEventListener('click', closeDropdown);
    }
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownState]);

  useKeyboardShortcuts({
      onAdd: canCreate ? () => router.push('/bom/create') : undefined,
      onView: canRead ? (item) => { setBomToView(item); setDetailModalOpen(true); } : undefined,
      onEdit: canUpdate ? (item) => router.push(`/bom/edit/${item.id}`) : undefined,
      onDelete: canDelete ? (item) => { setBomToDelete(item); setDeleteModalOpen(true); } : undefined,
      onRefresh: () => { fetchBoms(); },
      searchId: "bom-search-input",
      setPageNo,
      pageNo,
      totalPages,
      items: bomsData,
      selectedRowIndex,
      setSelectedRowIndex,
      isModalOpen: deleteModalOpen || detailModalOpen,
  });

  const fetchBoms = async () => {
    setIsLoading(true);
    try {
      const response = await getBomsApi(pageNo, pageSize, query);
      if (response.data && response.data.success) {
        setBomsData(response.data.data.data || []);
        setTotalItems(response.data.data.pagination?.totalItems || 0);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      } else {
        setBomsData([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch BOMs:', error);
      toast.error('Failed to load BOMs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoms();
  }, [pageNo, pageSize, query]);

  useEffect(() => {
    setPageNo(1);
  }, [query]);

  const columns = [
    {
      key: 'name',
      label: 'BOM Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {canRead ? (
            <span 
              className="font-semibold text-primary hover:underline cursor-pointer truncate max-w-[250px]" 
              title={row.name}
              onClick={() => {
                setBomToView(row);
                setDetailModalOpen(true);
              }}
            >
              {row.name}
            </span>
          ) : (
            <span className="font-semibold text-grey-text-strong truncate max-w-[250px]" title={row.name}>{row.name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'product',
      label: 'Main Product',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-sm text-grey-text max-w-[250px]" title={row.product?.name}>
          <span className="text-grey-text-strong font-medium text-[13px]">{row.product ? row.product.name : '-'}</span>
        </span>
      ),
    },
    {
      key: 'items',
      label: 'Components Count',
      align: 'center',
      render: (row) => (
        <div className="text-center">
          <span className="font-semibold text-sm text-grey-text-strong">
            {row.items?.length || 0}
          </span>
        </div>
      ),
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
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-grey-text-strong">{row.updatedByName === '-' ? '-' : (row.updatedByName || '-')}</span>
          {row.updatedByName && row.updatedByName !== '-' ? (
            <span className="text-xs text-grey-muted">
              {row.updatedAt ? new Date(row.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric'}) : ''}
            </span>
          ) : null}
        </div>
      ),
    }
  ];

  if (canRead || canUpdate || canDelete) {
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
        <title>Bill of Materials | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-5">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
              Bill of Materials (BOM)
            </h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">
              Manage product structures and required components.
            </p>
          </div>
          {canCreate && (
            <Button
              variant="primary"
              className="w-full sm:w-auto shrink-0"
              onClick={() => router.push('/bom/create')}
              icon={Plus}
              text="Add BOM"
            />
          )}
        </div>

        {/* Toolbar */}
        <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="bom-search-input"
              type="text"
              startIcon={Search}
              placeholder="Search BOM name, product name…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 min-w-0"
              ref={searchInputRef}
            />
          </div>
          <KeyboardShortcutBar
            onAdd={canCreate ? () => router.push('/bom/create') : undefined}
            onView={canRead ? (item) => { setBomToView(item); setDetailModalOpen(true); } : undefined}
            onEdit={canUpdate ? (item) => router.push(`/bom/edit/${item.id}`) : undefined}
            onDelete={canDelete ? (item) => { setBomToDelete(item); setDeleteModalOpen(true); } : undefined}
            onRefresh={() => { fetchBoms(); }}
            searchId="bom-search-input"
            pageNo={pageNo}
            totalPages={totalPages}
            selectedItem={bomsData[selectedRowIndex]}
            selectedRowIndex={selectedRowIndex}
            addLabel="Add BOM"
          />
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={bomsData}
          isLoading={isLoading}
          emptyState="No BOMs match your search or filter."
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
          {canRead && (
            <button
              className="text-left px-4 py-2 text-sm text-grey-text hover:bg-grey-bg hover:text-grey-text-strong transition-colors flex items-center gap-2"
              onClick={() => {
                setBomToView(dropdownState.row);
                setDetailModalOpen(true);
                setDropdownState(null);
              }}
            >
              <Eye size={14} /> View
            </button>
          )}
          {canUpdate && (
            <button
              className="text-left px-4 py-2 text-sm text-grey-text hover:bg-grey-bg hover:text-grey-text-strong transition-colors flex items-center gap-2"
              onClick={() => {
                router.push(`/bom/edit/${dropdownState.row.id}`);
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
                setBomToDelete(dropdownState.row);
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
          setBomToDelete(null);
        }}
        onConfirm={async () => {
          if (!bomToDelete) return;
          try {
            const res = await deleteBomApi(bomToDelete.id);
            if (res.data?.success) {
              toast.success('BOM deleted successfully');
              fetchBoms();
              setDeleteModalOpen(false);
              setBomToDelete(null);
            } else {
              throw new Error(res.data?.message || 'Failed to delete BOM');
            }
          } catch (error) {
            throw error;
          }
        }}
        item={bomToDelete}
        itemNameKey="name"
        title="Delete BOM"
        itemType="BOM"
        verificationWord="DELETE"
      />

      <BomDetailModal 
        open={detailModalOpen}
        bomId={bomToView?.id}
        onClose={() => {
          setDetailModalOpen(false);
          setBomToView(null);
        }}
      />
    </>
  );
}
