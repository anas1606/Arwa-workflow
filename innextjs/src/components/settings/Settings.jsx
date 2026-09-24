import React, { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AddSetting from './modal/AddSetting';
import EditSetting from './modal/EditSetting';
import DeleteModal from '@/common/modal/DeleteModal';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';
import { toast } from 'sonner';
import { getSettingsListApi, deleteSettingApi } from '@/lib/fetcher';
import { usePermission } from '@/hooks/usePermission';

export default function Settings() {
  const { canRead, canCreate, canUpdate, canDelete } = usePermission('settings');
  const [settingsData, setSettingsData] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  
  const searchInputRef = useRef(null);

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(null);
  
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  useKeyboardShortcuts({
      onAdd: canCreate ? () => setAddOpen(true) : undefined,
      onEdit: canUpdate ? (item) => { setSelectedSetting(item); setEditOpen(true); } : undefined,
      onDelete: canDelete ? (item) => { setSelectedSetting(item); setDeleteOpen(true); } : undefined,
      onRefresh: () => setRefreshTrigger(prev => prev + 1),
      searchId: "settings-search-input",
      setPageNo,
      pageNo,
      totalPages: Math.ceil(totalItems / pageSize) || 1,
      items: settingsData,
      selectedRowIndex,
      setSelectedRowIndex,
      isModalOpen: addOpen || editOpen || deleteOpen,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    setPageNo(1);
  }, [query]);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getSettingsListApi(pageNo, pageSize, query);
      if (response.data && response.data.success) {
        setSettingsData(response.data.data.data || []);
        setTotalItems(response.data.data.pagination?.total || 0);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      } else {
        setSettingsData([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [pageNo, pageSize, query, refreshTrigger]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleEdit = (item) => {
    setSelectedSetting(item);
    setEditOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedSetting(item);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const res = await deleteSettingApi(selectedSetting.id);
      if (res.data?.success) {
        toast.success('Setting deleted successfully');
        setDeleteOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(res.data?.message || 'Failed to delete setting');
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
    }
  };

  const columns = [
    { 
      key: 'key', 
      label: 'SETTING KEY',
      render: (row) => <span className="font-semibold text-grey-text-strong">{row.key}</span> 
    },
    { 
      key: 'value', 
      label: 'SETTING VALUE',
      render: (row) => <span className="text-sm text-grey-text">{row.value}</span>
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
          {row.updatedBy && row.updatedAt && new Date(row.updatedAt).getTime() !== new Date(row.createdAt).getTime() ? (
            <span className="text-xs text-grey-muted">
              {new Date(row.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      render: (row) => (
        <div className="flex items-center gap-2">
          {canUpdate && (
            <button onClick={() => handleEdit(row)} className="p-1.5 text-grey-icon hover:text-primary transition-colors rounded-lg hover:bg-primary-subtle" title="Edit">
              <Pencil size={16} />
            </button>
          )}
          {canDelete && (
            <button onClick={() => handleDelete(row)} className="p-1.5 text-grey-icon hover:text-danger-main transition-colors rounded-lg hover:bg-danger-subtle" title="Delete">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <Head>
        <title>Settings | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-5">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
              Global Settings
            </h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">
              Manage application default labels and configurations.
            </p>
          </div>
          {canCreate && (
            <Button
              variant="primary"
              className="w-full sm:w-auto shrink-0"
              onClick={() => setAddOpen(true)}
              icon={Plus}
              text="Add Setting"
            />
          )}
        </div>

        {/* Toolbar */}
        <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="settings-search-input"
              type="text"
              startIcon={Search}
              placeholder="Search setting key or value…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 min-w-0"
              ref={searchInputRef}
            />
          </div>
          <KeyboardShortcutBar
            onAdd={canCreate ? () => setAddOpen(true) : undefined}
            onEdit={canUpdate ? (item) => { setSelectedSetting(item); setEditOpen(true); } : undefined}
            onDelete={canDelete ? (item) => { setSelectedSetting(item); setDeleteOpen(true); } : undefined}
            onRefresh={() => setRefreshTrigger(prev => prev + 1)}
            searchId="settings-search-input"
            pageNo={pageNo}
            totalPages={totalPages}
            selectedItem={settingsData[selectedRowIndex]}
            selectedRowIndex={selectedRowIndex}
            addLabel="Add Setting"
          />
        </div>

        {/* Table */}
        <div className="card-panel flex w-full flex-col border-none p-0">
          <CommonTable
            columns={columns}
            data={settingsData}
            isLoading={isLoading}
            selectedRowIndex={selectedRowIndex}
            onRowClick={() => {}}
            pagination={{
              totalItems,
              pageSize,
              pageNo,
              totalPages
            }}
            onPageChange={setPageNo}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageNo(1);
            }}
          />
        </div>
      </div>

      {/* Modals */}
      {addOpen && (
        <AddSetting 
          onClose={() => setAddOpen(false)} 
          onSuccess={() => { setAddOpen(false); setRefreshTrigger(prev => prev + 1); }} 
        />
      )}
      {editOpen && (
        <EditSetting 
          setting={selectedSetting} 
          onClose={() => setEditOpen(false)} 
          onSuccess={() => { setEditOpen(false); setRefreshTrigger(prev => prev + 1); }} 
        />
      )}
      <DeleteModal 
        open={deleteOpen} 
        onClose={() => setDeleteOpen(false)} 
        onConfirm={confirmDelete} 
        item={selectedSetting}
        itemNameKey="key"
        title="Delete Setting"
        itemType="Setting"
      />
    </>
  );
}
