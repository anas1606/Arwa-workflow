import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { Search, Plus, Pencil, Trash2, Eye, Hammer } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { toast } from 'sonner';
import { getJobWorksApi, deleteJobWorkApi } from '@/lib/fetcher';
import { usePermission } from '@/hooks/usePermission';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';
import { useRouter } from 'next/router';
import DeleteModal from '@/common/modal/DeleteModal';
import EditJobWorkModal from './modal/EditJobWork';

export default function JobWork() {
  const router = useRouter();
  const { canRead, canCreate, canUpdate, canDelete } = usePermission('production'); // Using production module permissions

  const [data, setData] = useState([]);
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
  const [isLoading, setIsLoading] = useState(true);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  useEffect(() => {
    const closeDropdown = () => setDropdownState(null);
    if (dropdownState) {
      window.addEventListener('click', closeDropdown);
    }
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownState]);

  useKeyboardShortcuts({
      onAdd: canCreate ? () => router.push('/production/bom-calculation') : undefined,
      onView: canRead ? (item) => router.push(`/production/job-work/${item.id}`) : undefined,
      onEdit: canUpdate ? (item) => { setItemToEdit(item); setEditModalOpen(true); } : undefined,
      onDelete: canDelete ? (item) => { setItemToDelete(item); setDeleteModalOpen(true); } : undefined,
      onRefresh: () => { fetchData(); },
      searchId: "jobwork-search-input",
      setPageNo,
      pageNo,
      totalPages,
      items: data,
      selectedRowIndex,
      setSelectedRowIndex,
      isModalOpen: deleteModalOpen,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await getJobWorksApi(pageNo, pageSize, query);
      if (response.data && response.data.success) {
        setData(response.data.data.data || []);
        setTotalItems(response.data.data.pagination?.totalItems || 0);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      } else {
        setData([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch Job Works:', error);
      toast.error('Failed to load Job Works');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pageNo, pageSize, query]);

  useEffect(() => {
    setPageNo(1);
  }, [query]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'CREATED': return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED': return 'bg-purple-100 text-purple-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'PAUSED': return 'bg-orange-100 text-orange-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      key: 'jobWorkNumber',
      label: 'Job Work No',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {canRead ? (
            <span 
              className="font-semibold text-primary hover:underline cursor-pointer truncate max-w-[150px]" 
              title={row.jobWorkNumber}
              onClick={() => router.push(`/production/job-work/${row.id}`)}
            >
              {row.jobWorkNumber?.toUpperCase()}
            </span>
          ) : (
            <span className="font-semibold text-grey-text-strong truncate max-w-[150px]" title={row.jobWorkNumber}>
              {row.jobWorkNumber?.toUpperCase()}
            </span>
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
      key: 'quantity',
      label: 'Quantity',
      align: 'center',
      render: (row) => (
        <div className="text-center">
          <span className="font-semibold text-sm text-grey-text-strong">
            {row.quantity || 0}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (row) => (
        <div className="text-center flex justify-center">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(row.status)}`}>
            {row.status ? row.status.replace('_', ' ') : 'UNKNOWN'}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-grey-text-strong">
            {row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric'}) : '-'}
          </span>
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
        <title>Job Work | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-5">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong flex items-center gap-2">
              <Hammer className="w-6 h-6 text-primary" />
              Job Work
            </h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">
              Manage manufacturing orders, track progress, and view material allocations.
            </p>
          </div>
          {canCreate && (
            <Button
              variant="primary"
              className="w-full sm:w-auto shrink-0"
              onClick={() => router.push('/production/bom-calculation')}
              icon={Plus}
              text="Add Job Work"
            />
          )}
        </div>

        {/* Toolbar */}
        <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="jobwork-search-input"
              type="text"
              startIcon={Search}
              placeholder="Search Job Work number, product name…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 min-w-0"
              ref={searchInputRef}
            />
          </div>
          <KeyboardShortcutBar
            onAdd={canCreate ? () => router.push('/production/bom-calculation') : undefined}
            onView={canRead ? (item) => router.push(`/production/job-work/${item.id}`) : undefined}
            onEdit={canUpdate ? (item) => { setItemToEdit(item); setEditModalOpen(true); } : undefined}
            onDelete={canDelete ? (item) => { setItemToDelete(item); setDeleteModalOpen(true); } : undefined}
            onRefresh={() => { fetchData(); }}
            searchId="jobwork-search-input"
            pageNo={pageNo}
            totalPages={totalPages}
            selectedItem={data[selectedRowIndex]}
            selectedRowIndex={selectedRowIndex}
            addLabel="Add Job Work"
          />
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          emptyState="No Job Works match your search or filter."
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
                router.push(`/production/job-work/${dropdownState.row.id}`);
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
                setItemToEdit(dropdownState.row);
                setEditModalOpen(true);
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
                setItemToDelete(dropdownState.row);
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
          setItemToDelete(null);
        }}
        onConfirm={async () => {
          if (!itemToDelete) return;
          try {
            const res = await deleteJobWorkApi(itemToDelete.id);
            if (res.data?.success) {
              toast.success('Job Work deleted successfully');
              fetchData();
              setDeleteModalOpen(false);
              setItemToDelete(null);
            } else {
              throw new Error(res.data?.message || 'Failed to delete Job Work');
            }
          } catch (error) {
            throw error;
          }
        }}
        item={itemToDelete}
        itemNameKey="jobWorkNumber"
        title="Delete Job Work"
        itemType="Job Work"
        verificationWord="DELETE"
      />

      <EditJobWorkModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setItemToEdit(null);
        }}
        onEdit={() => {
          fetchData();
        }}
        jobWork={itemToEdit}
      />
    </>
  );
}
