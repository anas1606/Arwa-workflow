import React, { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Search, Plus, ArrowLeft, ArrowRight, Eye, Pencil, Printer, Trash2 } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import AddUnit from './modal/AddUnit';
import EditUnit from './modal/EditUnit';
import DeleteModal from '@/common/modal/DeleteModal';
import clsx from 'clsx';
import { toast } from 'sonner';
import { getUnitsApi, deleteUnitApi, updateUnitApi } from '@/lib/fetcher';
import { usePermission } from '@/hooks/usePermission';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';

export default function Unit() {
  const { canRead, canCreate, canUpdate, canDelete } = usePermission('units');
  const [unitsData, setUnitsData] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const searchInputRef = useRef(null);
  const filterSelectRef = useRef(null);

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ active: 0, inactive: 0, total: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  
  const [dropdownState, setDropdownState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  useEffect(() => {
    const closeDropdown = () => setDropdownState(null);
    if (dropdownState) {
      window.addEventListener('click', closeDropdown);
    }
    return () => window.removeEventListener('click', closeDropdown);
  }, [dropdownState]);

  useEffect(() => {
    setPageNo(1);
  }, [query, statusFilter]);

  useKeyboardShortcuts({
      onAdd: canCreate ? () => setAddOpen(true) : undefined,
      onEdit: canUpdate ? (item) => { setSelectedUnit(item); setEditOpen(true); } : undefined,
      onDelete: canDelete ? (item) => { setSelectedUnit(item); setDeleteOpen(true); } : undefined,
      onRefresh: () => setRefreshTrigger(prev => prev + 1),
      searchId: "unit-search-input",
      setPageNo,
      pageNo,
      totalPages: Math.ceil(totalItems / pageSize) || 1,
      items: unitsData,
      selectedRowIndex,
      setSelectedRowIndex,
      isModalOpen: addOpen || editOpen || deleteOpen,
  });

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getUnitsApi(pageNo, pageSize, query, statusFilter);
      if (response.data && response.data.success) {
        setUnitsData(response.data.data.data || []);
        setTotalItems(response.data.data.pagination?.total || 0);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
        setStats(response.data.data.stats || { active: 0, inactive: 0, total: 0 });
      } else {
        setUnitsData([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch units:', error);
      toast.error('Failed to load units');
    } finally {
      setIsLoading(false);
    }
  }, [pageNo, pageSize, query, statusFilter, refreshTrigger]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleAdd = () => {
    triggerRefresh();
    setAddOpen(false);
  };

  const handleEdit = () => {
    triggerRefresh();
    setEditOpen(false);
  };

  const handleDelete = async (deletedUnit) => {
    try {
      const res = await deleteUnitApi(deletedUnit.id);
      if (res.data?.success) {
        toast.success('Unit deleted successfully');
        setDeleteOpen(false);
        triggerRefresh();
      } else {
        toast.error(res.data?.message || 'Failed to delete unit');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
      console.error(err);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      setUnitsData(list => list.map(u => u.id === id ? { ...u, status: !currentStatus } : u));
      
      const res = await updateUnitApi(id, { status: !currentStatus });
      if (res.data?.success) {
        toast.success('Status updated');
        triggerRefresh();
      } else {
        setUnitsData(list => list.map(u => u.id === id ? { ...u, status: currentStatus } : u));
        toast.error(res.data?.message || 'Failed to update status');
      }
    } catch (err) {
      setUnitsData(list => list.map(u => u.id === id ? { ...u, status: currentStatus } : u));
      toast.error('An unexpected error occurred.');
    }
  };

  const kpis = [
    {
      label: 'Total units',
      value: isLoading ? '...' : String(stats.total),
      hint: 'Measurement records',
      tone: 'neutral',
    },
    {
      label: 'Active',
      value: isLoading ? '...' : String(stats.active),
      hint: 'Currently in use',
      tone: 'success',
    },
    {
      label: 'Inactive',
      value: isLoading ? '...' : String(stats.inactive),
      hint: 'Disabled units',
      tone: 'warning',
    },
    {
      label: 'Most used',
      value: 'Dozen',
      hint: 'Popular quantity',
      tone: 'info',
    },
  ];

  const columns = [
    {
      key: 'name',
      label: 'UNIT NAME',
      render: (row) => (
        <span className="font-semibold text-grey-text-strong">{row.name}</span>
      ),
    },
    {
      key: 'shortName',
      label: 'SHORT NAME',
      render: (row) => <span className="text-sm text-grey-text">{row.shortName || '-'}</span>,
    },
    {
      key: 'quantityUnit',
      label: 'QUANTITY UNIT',
      render: (row) => (
        <span className="font-mono text-sm font-semibold tabular-nums text-grey-text-dark">
          {row.quantityUnit}
        </span>
      ),
    },
    {
      key: 'productCount',
      label: 'PRODUCT COUNT',
      align: 'center',
      render: (row) => (
           <span className="font-mono text-sm font-semibold tabular-nums text-grey-text-dark">
            {row.productCount || 0}
          </span>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      ...(canUpdate ? {
        type: 'toggle',
        onChange: (row) => toggleStatus(row.id, row.status),
      } : {
        render: (row) => (
          <span className={`badge ${row.status === 'ACTIVE' ? 'bg-success-subtle text-success-text' : 'bg-danger-subtle text-danger-text'}`}>
            {row.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          </span>
        )
      })
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
        <title>Units | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-5">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
              Units
            </h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">
              Search and manage units of measurement.
            </p>
          </div>
          {canCreate && (
            <Button
              variant="primary"
              className="w-full sm:w-auto shrink-0"
              onClick={() => setAddOpen(true)}
              icon={Plus}
              text="Add unit"
            />
          )}
        </div>

        {/* KPIs */}
        <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Unit KPIs">
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
              id="unit-search-input"
              type="text"
              startIcon={Search}
              placeholder="Search name, short name, or quantity…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 min-w-0"
              ref={searchInputRef}
            />
            <Input
              type="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="shrink-0 sm:w-44"
              hidePlaceholder={true}
              ref={filterSelectRef}
              options={[
                { label: 'All status', value: 'ALL' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Inactive', value: 'INACTIVE' },
              ]}
            />
          </div>
          <KeyboardShortcutBar
            onAdd={canCreate ? () => setAddOpen(true) : undefined}
            onEdit={canUpdate ? (item) => { setSelectedUnit(item); setEditOpen(true); } : undefined}
            onDelete={canDelete ? (item) => { setSelectedUnit(item); setDeleteOpen(true); } : undefined}
            onRefresh={() => setRefreshTrigger(prev => prev + 1)}
            searchId="unit-search-input"
            pageNo={pageNo}
            totalPages={totalPages}
            selectedItem={unitsData[selectedRowIndex]}
            selectedRowIndex={selectedRowIndex}
            addLabel="Add Unit"
          />
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={unitsData}
          isLoading={isLoading}
          emptyState="No units match your search or filter."
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
                setSelectedUnit(dropdownState.row);
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
                setSelectedUnit(dropdownState.row);
                setDeleteOpen(true);
                setDropdownState(null);
              }}
            />
          )}
        </div>
      )}

      {/* Modals */}
      <AddUnit
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
      <EditUnit
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onEdit={handleEdit}
        unit={selectedUnit}
      />
      <DeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        item={selectedUnit}
        itemNameKey="name"
        title="Delete unit"
        itemType="unit"
        verificationWord="DELETE"
      />
    </>
  );
}
