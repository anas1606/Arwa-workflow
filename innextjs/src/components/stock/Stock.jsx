import React, { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { Package, Search, Plus, ArrowLeft, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import DeleteModal from '@/common/modal/DeleteModal';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

import { getBoxesApi, deleteBoxApi, getBoxKpisApi } from '@/lib/fetcher';
import { usePermission } from '@/hooks/usePermission';

export default function Stock() {
  const router = useRouter();
  const { canRead, canCreate, canUpdate, canDelete } = usePermission('godown');
  const [boxesData, setBoxesData] = useState([]);
  const [kpiData, setKpiData] = useState(null);
  
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState(null);
  
  const [dropdownState, setDropdownState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const closeDropdown = () => setDropdownState(null);
    if (dropdownState) {
      window.addEventListener('click', closeDropdown);
    }
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownState]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const fetchKpis = async () => {
    try {
      const res = await getBoxKpisApi();
      if (res.data?.success) {
        setKpiData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch Box KPIs:', err);
    }
  };

  const fetchBoxes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getBoxesApi(pageNo, pageSize, query);
      if (response.data && response.data.success) {
        setBoxesData(response.data.data.data || []);
        setTotalItems(response.data.data.pagination?.totalItems || 0);
      } else {
        setBoxesData([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pageNo, pageSize, query, refreshTrigger]);

  useEffect(() => {
    if (canRead) {
      fetchBoxes();
      fetchKpis();
    }
  }, [fetchBoxes, canRead]);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  useKeyboardShortcuts({
      onAdd: canCreate ? () => setAddOpen(true) : undefined,
      onEdit: canUpdate ? (item) => { setSelectedBox(item); setEditOpen(true); } : undefined,
      onDelete: canDelete ? (item) => { setSelectedBox(item); setDeleteOpen(true); } : undefined,
      data: boxesData,
      selectedIndex: selectedRowIndex,
      setSelectedIndex: setSelectedRowIndex,
      onSearchFocus: () => searchInputRef.current?.focus(),
  });

  const handleDelete = async () => {
    if (!selectedBox?.id) return;
    try {
      const res = await deleteBoxApi(selectedBox.id);
      if (res.data?.success) {
        toast.success(res.data.message || 'Godown Box deleted successfully');
        setDeleteOpen(false);
        triggerRefresh();
      } else {
        toast.error(res.data?.message || 'Failed to delete godown box');
      }
    } catch (err) {
      toast.error('An error occurred');
    }
  };

  if (!canRead) {
    return <div className="p-8 text-center text-grey-primary">You don't have permission to view Godowns.</div>;
  }

  const columns = [
    {
      header: 'NAME',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-light flex flex-shrink-0 items-center justify-center text-brand-primary font-medium border border-brand-primary/10">
            <Package size={18} />
          </div>
          <div>
            <div className="font-medium text-grey-primary">{item.name}</div>
          </div>
        </div>
      )
    },
    {
      header: 'SECTIONS',
      render: (item) => (
        <span className="text-grey-secondary bg-grey-bg px-2 py-1 rounded-md text-sm">
          {item.sectionsCount} Sections
        </span>
      )
    },
    {
      header: 'TRAYS',
      render: (item) => (
        <span className="text-grey-secondary bg-grey-bg px-2 py-1 rounded-md text-sm">
          {item.traysCount} Trays
        </span>
      )
    },
    {
      header: 'ACTIONS',
      render: (item, idx) => {
        const isDropdownOpen = dropdownState === idx;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (canUpdate) router.push(`/inventory/stock/edit/${item.id}`);
              }}
              disabled={!canUpdate}
              className="p-1.5 text-grey-secondary hover:text-brand-primary hover:bg-brand-light rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Edit Box"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRowIndex(idx);
                setSelectedBox(item);
                if (canDelete) setDeleteOpen(true);
              }}
              disabled={!canDelete}
              className="p-1.5 text-grey-secondary hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete Box"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  const kpis = [
    { label: 'Total Boxes', value: kpiData?.totalBoxes || 0, tone: 'info', hint: 'Boxes in warehouse' },
    { label: 'Total Sections', value: kpiData?.totalSections || 0, tone: 'success', hint: 'Active sections' },
    { label: 'Total Trays', value: kpiData?.totalTrays || 0, tone: 'neutral', hint: 'Available trays' },
    { label: 'Empty Boxes', value: kpiData?.boxesWithoutSections || 0, tone: 'warning', hint: 'Boxes missing sections' },
  ];

  return (
    <>
      <div className="w-full flex flex-col gap-5">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
              Stock
            </h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">
              Manage your warehouse boxes, sections, and trays
            </p>
          </div>
          {canCreate && (
            <Button
              variant="primary"
              className="w-full sm:w-auto shrink-0"
              onClick={() => router.push('/inventory/stock/create')}
              icon={Plus}
              text="Add Stock"
            />
          )}
        </div>

        {/* KPIs */}
        <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Stock KPIs">
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
              id="stock-search-input"
              ref={searchInputRef}
              type="text"
              startIcon={Search}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search boxes..."
              className="flex-1 min-w-0"
            />
          </div>
          <KeyboardShortcutBar
            onAdd={canCreate ? () => setAddOpen(true) : undefined}
            onEdit={canUpdate ? (item) => { setSelectedBox(item); setEditOpen(true); } : undefined}
            onDelete={canDelete ? (item) => { setSelectedBox(item); setDeleteOpen(true); } : undefined}
            onRefresh={() => { fetchBoxes(); fetchKpis(); }}
            searchId="stock-search-input"
            pageNo={pageNo}
            totalPages={totalPages}
            selectedItem={boxesData[selectedRowIndex]}
            selectedRowIndex={selectedRowIndex}
            addLabel="Add Box"
          />
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={boxesData}
          isLoading={isLoading}
          emptyState="No boxes match your search."
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
          onRowClick={(idx, item) => setSelectedRowIndex(idx)}
        />
      </div>


      <DeleteModal
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setSelectedBox(null); }}
        onConfirm={handleDelete}
        title="Delete Box"
        message={`Are you sure you want to delete the box "${selectedBox?.name}"? This action cannot be undone.`}
        itemName={selectedBox?.name}
      />
    </>
  );
}
