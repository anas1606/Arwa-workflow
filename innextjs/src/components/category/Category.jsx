import React, { useState, useMemo, useRef, useEffect } from 'react';
import Head from 'next/head';
import { LayoutList, Search, Plus, ChevronRight, ChevronDown, ArrowLeft, ArrowRight, FolderPlus, Pencil, ArrowRightLeft, Trash2 } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import { DUMMY_CATEGORIES } from '@/common/dummy';
import AddCategory from './modal/AddCategory';
import EditCategory from './modal/EditCategory';
import TransferCategory from './modal/TransferCategory';
import DeleteModal from '@/common/modal/DeleteModal';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { toast } from 'sonner';
import { getCategoriesApi, deleteCategoryApi, updateCategoryApi, getCategoryKpisApi } from '@/lib/fetcher';

export default function Category() {
    const [categoriesData, setCategoriesData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [query, setQuery] = useState('');

    const searchInputRef = useRef(null);
    const statusSelectRef = useRef(null);

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [pageNo, setPageNo] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalItems, setTotalItems] = useState(0);

    const [kpiData, setKpiData] = useState({ total: 0, root: 0, active: 0, inactive: 0 });

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const response = await getCategoriesApi(pageNo, pageSize, query, statusFilter);
            if (response.data && response.data.success) {
                setCategoriesData(response.data.data.data || []);
                setTotalItems(response.data.data.pagination?.total || 0);
            } else {
                setCategoriesData([]);
                setTotalItems(0);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchKpis = async () => {
        try {
            const response = await getCategoryKpisApi();
            if (response.data && response.data.success) {
                setKpiData(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch KPIs:', error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [pageNo, pageSize, query, statusFilter]);

    useEffect(() => {
        fetchKpis();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
                e.preventDefault();
                if (document.activeElement === searchInputRef.current) {
                    statusSelectRef.current?.focus();
                } else {
                    searchInputRef.current?.focus();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setQuery(inputValue);
        }, 500);
        return () => clearTimeout(timer);
    }, [inputValue]);



    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [addParentId, setAddParentId] = useState(null);

    const [dropdownState, setDropdownState] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState(new Set());

    useEffect(() => {
        const closeDropdown = () => setDropdownState(null);
        if (dropdownState) {
            window.addEventListener('click', closeDropdown);
        }
        return () => window.removeEventListener('click', closeDropdown);
    }, [dropdownState]);

    const toggleExpand = (id, e) => {
        e.stopPropagation();
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // API already filters based on query and status, so we don't need a local filteredData
    // We just use categoriesData directly for our tree logic.

    // Build tree logic for nesting
    const flattenedCategories = useMemo(() => {
        const map = new Map();
        const roots = [];

        categoriesData.forEach(cat => {
            map.set(cat.id, { ...cat, children: [] });
        });

        if (query || statusFilter !== 'ALL') {
            return categoriesData.map(c => ({ ...c, depth: 0, hasChildren: false }));
        }

        categoriesData.forEach(cat => {
            if (cat.parentId && map.has(cat.parentId)) {
                map.get(cat.parentId).children.push(map.get(cat.id));
            } else {
                roots.push(map.get(cat.id));
            }
        });

        const result = [];
        const traverse = (node, depth) => {
            const hasChildren = node.children && node.children.length > 0;
            result.push({ ...node, depth, hasChildren });
            if (expandedCategories.has(node.id) && hasChildren) {
                node.children.forEach(child => traverse(child, depth + 1));
            }
        };

        roots.forEach(r => traverse(r, 0));
        return result;
    }, [categoriesData, query, statusFilter, expandedCategories]);

    const paginatedData = flattenedCategories;

    // Reset page when query changes
    useEffect(() => {
        setPageNo(1);
    }, [query]);

    const kpis = [
        {
            label: 'Total Categories',
            value: String(kpiData.total),
            hint: 'All categories across levels',
            tone: 'neutral',
        },
        {
            label: 'Root Categories',
            value: String(kpiData.root),
            hint: 'Top-level categories',
            tone: 'info',
        },
        {
            label: 'Active',
            value: String(kpiData.active),
            hint: 'Currently active',
            tone: 'success',
        },
        {
            label: 'Inactive',
            value: String(kpiData.inactive),
            hint: 'Disabled categories',
            tone: 'danger',
        }
    ];

    const handleAdd = (cat) => {
        fetchCategories();
        fetchKpis();
    };

    const handleEdit = (updatedCat) => {
        fetchCategories();
        fetchKpis();
    };

    const handleTransfer = async (transferredCatId, newParentId) => {
        try {
            const response = await updateCategoryApi(transferredCatId, { parentId: newParentId });
            if (response.data && response.data.success) {
                fetchCategories();
                fetchKpis();
                setTransferOpen(false);
                toast.success('Category transferred successfully');
            } else {
                toast.error(response.data?.message || 'Failed to transfer category');
            }
        } catch (error) {
            toast.error('An unexpected error occurred.');
        }
    };

    const handleDelete = async (deletedCat) => {
        try {
            const response = await deleteCategoryApi(deletedCat.id);
            if (response.data && response.data.success) {
                fetchCategories();
                fetchKpis();
                setDeleteOpen(false);
                toast.success('Category deleted successfully');
            } else {
                toast.error(response.data?.message || 'Failed to delete category');
            }
        } catch (error) {
            toast.error('An unexpected error occurred.');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Category',
            render: (row) => (
                <div
                    className="flex items-center gap-2"
                    style={{ paddingLeft: `${row.depth * 20}px` }}
                >
                    {row.hasChildren ? (
                        <button
                            onClick={(e) => toggleExpand(row.id, e)}
                            className="p-1 hover:bg-grey-border rounded text-grey-icon"
                        >
                            {expandedCategories.has(row.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                    ) : (
                        <span className="w-6 inline-block" />
                    )}
                    <span className="font-semibold text-grey-text-strong truncate max-w-[200px]" title={row.name}>{row.name}</span>
                </div>
            ),
        },
        {
            key: 'parent',
            label: 'Parent Category',
            render: (row) => {
                const parent = categoriesData.find(c => c.id === row.parentId);
                return <span className="text-sm text-grey-text">{parent ? parent.name : '-'}</span>;
            },
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.isActive !== false ? 'bg-success-bg text-success-main' : 'bg-grey-bg text-grey-muted'}`}>
                    {row.isActive !== false ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            key: 'itemCount',
            label: 'Items',
            align: 'center',
            render: (row) => <span className="text-sm text-grey-text">{row.itemCount || 0}</span>,
        },
        {
            key: 'actions',
            label: 'Action',
            type: 'action',
            align: 'center',
            onClick: (row, e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const dropdownHeight = 160; // Approximate height of 4 menu items
                const spaceBelow = window.innerHeight - rect.bottom;
                
                let yPos = rect.bottom + window.scrollY;
                if (spaceBelow < dropdownHeight) {
                    yPos = rect.top + window.scrollY - dropdownHeight;
                }
                
                setDropdownState({
                    row,
                    x: rect.right - 192, // exact width for w-48 (12rem/192px)
                    y: yPos,
                });
            },
        },
    ];

    return (
        <>
            <Head>
                <title>Categories | Arwa Weld</title>
            </Head>

            <div className="w-full flex flex-col gap-5">

                {/* Page Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
                            Categories
                        </h1>
                        <p className="mt-1 text-sm leading-snug text-grey-muted">
                            Manage hierarchical categories for products.
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        className="w-full sm:w-auto shrink-0"
                        onClick={() => setAddOpen(true)}
                        icon={Plus}
                        text="Add category"
                    />
                </div>

                {/* KPIs */}
                <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Category KPIs">
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
                                    className={`absolute inset-y-0 left-0 w-1 ${toneBar[kpi.tone]}`}
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

                {/* Search & Filters */}
                <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                            type="text"
                            startIcon={Search}
                            placeholder="Search categories (Alt+S)"
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
                            ref={statusSelectRef}
                            options={[
                                { label: 'All Status', value: 'ALL' },
                                { label: 'Active', value: 'ACTIVE' },
                                { label: 'Inactive', value: 'INACTIVE' },
                            ]}
                        />
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

                {/* DATA TABLE */}
                <div className="relative">
                    <CommonTable
                        columns={columns}
                        data={paginatedData}
                        isLoading={isLoading}
                        emptyState={query ? "No categories found matching your search." : "No categories found."}
                        pagination={{
                            pageNo,
                            pageSize,
                            totalItems,
                            totalPages: Math.ceil(totalItems / pageSize),
                        }}
                        onPageChange={setPageNo}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setPageNo(1);
                        }}
                    />

                </div>
            </div>

            {dropdownState && (
                <div
                    className="absolute z-50 bg-white border border-grey-border shadow-lg rounded-md py-1 w-48 whitespace-nowrap flex flex-col"
                    style={{ top: dropdownState.y, left: dropdownState.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setAddParentId(dropdownState.row.id);
                            setAddOpen(true);
                            setDropdownState(null);
                        }}
                        className="text-left px-4 py-2 text-sm text-grey-text hover:bg-grey-bg hover:text-grey-text-strong transition-colors flex items-center gap-2"
                    >
                        <FolderPlus size={14} /> Add Subcategory
                    </button>
                    <button
                        onClick={() => {
                            setSelectedCategory(dropdownState.row);
                            setEditOpen(true);
                            setDropdownState(null);
                        }}
                        className="text-left px-4 py-2 text-sm text-grey-text hover:bg-grey-bg hover:text-grey-text-strong transition-colors flex items-center gap-2"
                    >
                        <Pencil size={14} /> Edit
                    </button>
                    <button
                        onClick={() => {
                            setSelectedCategory(dropdownState.row);
                            setTransferOpen(true);
                            setDropdownState(null);
                        }}
                        className="text-left px-4 py-2 text-sm text-grey-text hover:bg-grey-bg hover:text-grey-text-strong transition-colors flex items-center gap-2"
                    >
                        <ArrowRightLeft size={14} /> Transfer
                    </button>
                    <button
                        onClick={() => {
                            setSelectedCategory(dropdownState.row);
                            setDeleteOpen(true);
                            setDropdownState(null);
                        }}
                        className="text-left px-4 py-2 text-sm text-danger-main hover:bg-danger-bg transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}

            <AddCategory
                isOpen={addOpen}
                onClose={() => { setAddOpen(false); setAddParentId(null); }}
                onAdd={handleAdd}
                categories={categoriesData}
                initialParentId={addParentId}
            />

            <EditCategory
                isOpen={editOpen}
                onClose={() => { setEditOpen(false); setSelectedCategory(null); }}
                onEdit={handleEdit}
                category={selectedCategory}
                categories={categoriesData}
            />

            <TransferCategory
                isOpen={transferOpen}
                onClose={() => { setTransferOpen(false); setSelectedCategory(null); }}
                onTransfer={handleTransfer}
                category={selectedCategory}
                categories={categoriesData}
            />

            <DeleteModal
                open={deleteOpen}
                onClose={() => { setDeleteOpen(false); setSelectedCategory(null); }}
                onConfirm={() => handleDelete(selectedCategory)}
                title="Delete Category"
                message={`Are you sure you want to delete ${selectedCategory?.name}? Any child categories will be moved up to this category's parent level. This action cannot be undone.`}
                item={selectedCategory}
                itemNameKey="name"
            />
        </>
    );
}
