import React, { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import { ChevronRight, ChevronDown, ChevronLeft, Plus, Search } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';
import { usePermission } from '@/hooks/usePermission';
import UpdateStock from './modal/UpdateStock';

export default function Stock() {
    const { canUpdate } = usePermission('stock');
    const { canUpdate: canUpdateProduct } = usePermission('products');
    const [categoriesData, setCategoriesData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [inputValue, setInputValue] = useState('');
    const [loadingChildren, setLoadingChildren] = useState(new Set());
    const [apiPagination, setApiPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    
    // Stats for KPIs
    const [totalStock, setTotalStock] = useState(0);
    const [totalProducts, setTotalProducts] = useState(0);

    const [loadedCounts, setLoadedCounts] = useState({});
    
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

    const loadInitialData = async (page = 1) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/v1/stock?parentId=null&page=${page}&limit=${apiPagination.limit}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            const data = result.data?.data || [];
            
            setTotalProducts(result.data?.kpis?.totalProducts || 0);
            setTotalStock(result.data?.kpis?.totalStock || 0);
            setApiPagination(result.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
            setCategoriesData(data);
        } catch (error) {
            console.error('Failed to fetch stock categories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData(1);
    }, []);

    const toggleExpand = async (id, e) => {
        e.stopPropagation();
        
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

        // Lazy load children
        if (!expandedNodes.has(id) && !loadingChildren.has(id)) {
            // Find if children are already loaded
            let node = null;
            const findNode = (nodes) => {
                for (const n of nodes) {
                    if (n.id === id) { node = n; return; }
                    if (n.children) findNode(n.children);
                }
            };
            findNode(categoriesData);
            
            // Only fetch if it hasn't been loaded yet AND it actually has either products or subcategories!
            if (node && node.hasChildren && !node.childrenLoaded) {
                setLoadingChildren(prev => new Set(prev).add(id));
                try {
                    const res = await fetch(`/api/v1/stock?parentId=${id}&limit=100`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    const result = await res.json();
                    
                    const childrenData = result.data?.data || [];
                    const productsData = result.data?.products || [];
                    
                    setCategoriesData(prev => {
                        const updateNode = (nodes) => nodes.map(n => {
                            if (n.id === id) {
                                return { 
                                    ...n, 
                                    children: childrenData, 
                                    products: productsData,
                                    childrenLoaded: true 
                                };
                            }
                            if (n.children) return { ...n, children: updateNode(n.children) };
                            return n;
                        });
                        return updateNode(prev);
                    });
                } catch (error) {
                    console.error('Failed to fetch children:', error);
                } finally {
                    setLoadingChildren(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                }
            }
        }
    };

    const flattenedData = useMemo(() => {
        const result = [];
        const searchLower = inputValue.toLowerCase();
        
        // Flatten the tree
        const traverse = (node, depth, isMatchingParent = false) => {
            const nodeMatches = node.name.toLowerCase().includes(searchLower);
            
            // Check if any products match
            const matchingProducts = node.products?.filter(p => 
                p.name.toLowerCase().includes(searchLower) || 
                (p.code && p.code.toLowerCase().includes(searchLower))
            ) || [];
            
            // Check if any children match deeply
            const hasMatchingDescendant = (n) => {
                if (n.name.toLowerCase().includes(searchLower)) return true;
                if (n.products?.some(p => p.name.toLowerCase().includes(searchLower) || (p.code && p.code.toLowerCase().includes(searchLower)))) return true;
                return n.children?.some(child => hasMatchingDescendant(child));
            };
            
            const matchesSearch = !inputValue || nodeMatches || matchingProducts.length > 0 || node.children?.some(c => hasMatchingDescendant(c));
            
            if (!matchesSearch && !isMatchingParent) return; // Hide if nothing matches

            const hasCategoryChildren = node.children?.length > 0 || (node._count?.children > 0);
            const hasProducts = node.products?.length > 0;
            const hasChildren = hasCategoryChildren || hasProducts || node.hasChildren;
            
            result.push({ 
                ...node, 
                depth, 
                hasChildren, 
                rowType: 'category',
                id: `cat-${node.id}`,
                rawId: node.id,
                isLoadingChildren: loadingChildren.has(node.id)
            });

            if (expandedNodes.has(node.id) || inputValue) {
                // 1. Products
                const prodsToRender = inputValue ? (nodeMatches ? node.products : matchingProducts) : node.products;
                
                if (prodsToRender?.length > 0) {
                    const limit = loadedCounts[node.id] || 5;
                    const visibleProds = inputValue ? prodsToRender : prodsToRender.slice(0, limit);
                    
                    visibleProds.forEach(prod => {
                        result.push({
                            ...prod,
                            depth: depth + 1,
                            hasChildren: false,
                            rowType: 'product',
                            totalStock: prod.stockQuantity || 0,
                            id: `prod-${prod.id}`
                        });
                    });
                    
                    if (!inputValue && prodsToRender.length > limit) {
                        result.push({
                            id: `load-more-${node.id}`,
                            rowType: 'load-more',
                            categoryId: node.id,
                            depth: depth + 1,
                            remainingCount: prodsToRender.length - limit
                        });
                    }
                }

                // 2. Skeletons for subcategories (loading state)
                if (loadingChildren.has(node.id)) {
                    result.push({
                        id: `skel-1-${node.id}`,
                        rowType: 'skeleton',
                        depth: depth + 1
                    });
                    result.push({
                        id: `skel-2-${node.id}`,
                        rowType: 'skeleton',
                        depth: depth + 1
                    });
                }
                
                // 3. Subcategories
                if (node.children?.length > 0) {
                    node.children.forEach(child => traverse(child, depth + 1, !!inputValue));
                }
            }
        };

        categoriesData.forEach(root => traverse(root, 0));
        return result;
    }, [categoriesData, expandedNodes, inputValue, loadedCounts, loadingChildren]);

    const handleNextPage = () => {
        if (apiPagination.page < apiPagination.totalPages) {
            loadInitialData(apiPagination.page + 1);
        }
    };

    const handlePrevPage = () => {
        if (apiPagination.page > 1) {
            loadInitialData(apiPagination.page - 1);
        }
    };

    useKeyboardShortcuts({
        onRefresh: () => loadInitialData(apiPagination.page),
        searchId: "stock-search-input",
        onNextPage: handleNextPage,
        onPrevPage: handlePrevPage,
        pageNo: apiPagination.page,
        totalPages: apiPagination.totalPages,
        items: flattenedData,
        selectedRowIndex,
        setSelectedRowIndex,
    });

    const columns = [
        {
            key: 'name',
            label: 'Category / Product',
            render: (row) => {
                if (row.rowType === 'skeleton') {
                    return (
                        <div
                            className="flex items-center gap-2 py-1.5"
                            style={{ paddingLeft: `${row.depth * 28}px` }}
                        >
                            <div className="w-3 h-4 border-l-2 border-b-2 border-grey-border rounded-bl-sm -mt-3 mr-1 opacity-60" />
                            <div className="w-6 h-6 rounded-md bg-grey-border opacity-50 animate-pulse" />
                            <div className="h-4 w-32 bg-grey-border rounded opacity-50 animate-pulse" />
                        </div>
                    );
                }

                if (row.rowType === 'load-more') {
                    return (
                        <div
                            className="flex items-center gap-3 py-1.5"
                            style={{ paddingLeft: `${row.depth * 28}px` }}
                        >
                            <div className="w-3 h-4 border-l-2 border-b-2 border-grey-border rounded-bl-sm -mt-3 mr-1 opacity-60" />
                            <button
                                onClick={() => {
                                    setLoadedCounts(prev => ({
                                        ...prev,
                                        [row.categoryId]: (prev[row.categoryId] || 5) + 10
                                    }));
                                }}
                                className="text-xs text-primary bg-primary-subtle hover:bg-primary hover:text-white font-semibold flex items-center gap-2 px-4 py-1.5 rounded-md transition-all duration-300 shadow-sm border border-primary-bg"
                            >
                                <ChevronDown size={14} /> 
                                Load {row.remainingCount} more products
                            </button>
                        </div>
                    );
                }

                const isChild = row.depth > 0;
                return (
                    <div
                        className="flex items-center gap-2"
                        style={{ paddingLeft: `${row.depth * 28}px` }}
                    >
                        {isChild && (
                            <div className="w-3 h-4 border-l-2 border-b-2 border-grey-border rounded-bl-sm -mt-3 mr-1 opacity-60" />
                        )}
                        
                        {row.rowType === 'category' ? (
                            <button
                                onClick={(e) => row.hasChildren && toggleExpand(row.rawId, e)}
                                disabled={!row.hasChildren || row.isLoadingChildren}
                                className={`p-1 rounded-md transition-colors flex items-center justify-center w-6 h-6 ${
                                    isChild 
                                        ? 'bg-grey-divider text-grey-icon-strong' 
                                        : 'bg-primary-subtle text-primary-text'
                                } ${
                                    row.hasChildren 
                                        ? (isChild ? 'hover:bg-grey-border' : 'hover:bg-primary-light') 
                                        : 'opacity-40 cursor-not-allowed'
                                }`}
                            >
                                {row.hasChildren && (expandedNodes.has(row.rawId) || inputValue) ? (
                                    <ChevronDown size={16} />
                                ) : (
                                    <ChevronRight size={16} />
                                )}
                            </button>
                        ) : (
                            <div className="w-6 flex justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-grey-muted" />
                            </div>
                        )}
                        
                        <span className={`truncate max-w-[300px] ${
                            row.rowType === 'category' 
                                ? (isChild ? 'font-medium text-grey-text-strong' : 'font-semibold text-grey-text-strong text-base') 
                                : 'text-grey-text text-sm'
                        }`} title={row.name}>
                            {row.name}
                        </span>
                        
                        {row.rowType === 'product' && row.code && (
                            <span className="text-[10px] bg-grey-bg px-1.5 py-0.5 rounded text-grey-text border border-grey-border-strong ml-2">{row.code}</span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'stock',
            label: 'Total Stock',
            render: (row) => {
                if (row.rowType === 'load-more' || row.rowType === 'skeleton') return null;
                
                if (row.rowType === 'category') {
                    return (
                        <span className="font-semibold text-primary-text-strong">
                            {row.totalStock || 0}
                        </span>
                    );
                }
                return (
                    <span className="font-semibold text-grey-text-strong">
                        {row.totalStock || 0} {row.unit?.shortName ? <span className="text-xs text-grey-muted font-normal ml-1">{row.unit.shortName}</span> : ''}
                    </span>
                );
            },
        }
    ];

    const kpis = [
        { label: 'Total Products', value: String(totalProducts), hint: 'Across active categories', tone: 'info' },
        { label: 'Total Stock', value: String(totalStock), hint: 'Quantity in inventory', tone: 'success' },
    ];

    return (
        <>
            <Head>
                <title>Stock | Arwa Weld</title>
            </Head>

            <div className="w-full flex flex-col gap-5">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
                            Stock Management
                        </h1>
                        <p className="mt-1 text-sm leading-snug text-grey-muted">
                            Manage and view stock levels hierarchically by category and product.
                        </p>
                    </div>
                    {canUpdate && canUpdateProduct && (
                        <Button
                            variant="primary"
                            className="w-full sm:w-auto shrink-0"
                            onClick={() => setIsUpdateModalOpen(true)}
                            icon={Plus}
                            text="Update Stock"
                        />
                    )}
                </div>

                {/* KPIs */}
                <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4">
                    {kpis.map((kpi) => {
                        const toneBar = {
                            success: 'bg-success-dark',
                            info: 'bg-primary-dark',
                        };
                        return (
                            <article key={kpi.label} className="card-panel relative overflow-hidden !p-3 border-none">
                                <div className={`absolute inset-y-0 left-0 w-1 ${toneBar[kpi.tone]}`} aria-hidden />
                                <p className="pl-2 text-2xs font-semibold uppercase tracking-wide text-grey-muted">{kpi.label}</p>
                                <p className="mt-1 pl-2 font-mono text-xl font-semibold tabular-nums text-grey-text-strong sm:text-2xl">{kpi.value}</p>
                                {kpi.hint && <p className="mt-1 pl-2 text-xs text-grey-muted">{kpi.hint}</p>}
                            </article>
                        );
                    })}
                </section>

                {/* Search & Filters */}
                <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                            id="stock-search-input"
                            type="text"
                            startIcon={Search}
                            placeholder="Search category or product..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="flex-1 min-w-0"
                        />
                    </div>
                    <KeyboardShortcutBar
                        onRefresh={() => loadInitialData(apiPagination.page)}
                        searchId="stock-search-input"
                        pageNo={apiPagination.page}
                        totalPages={apiPagination.totalPages}
                        selectedItem={flattenedData[selectedRowIndex]}
                        selectedRowIndex={selectedRowIndex}
                    />
                </div>

                {/* Table */}
                <div className="relative">
                    <CommonTable
                        columns={columns}
                        data={flattenedData}
                        isLoading={isLoading}
                        emptyState="No stock found."
                        pagination={{ 
                            pageNo: apiPagination.page, 
                            pageSize: apiPagination.limit, 
                            totalItems: apiPagination.total, 
                            totalPages: apiPagination.totalPages 
                        }}
                        onPageChange={(p) => loadInitialData(p)}
                        onPageSizeChange={(limit) => {
                            setApiPagination(prev => ({ ...prev, limit, page: 1 }));
                            // the state update above won't immediately reflect in loadInitialData without a useEffect,
                            // but for simplicity we can just fetch it manually here
                            fetch(`/api/v1/stock?parentId=null&page=1&limit=${limit}`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                            }).then(res => res.json()).then(result => {
                                setCategoriesData(result.data?.data || []);
                                setApiPagination(result.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
                            });
                        }}
                        selectedRowIndex={selectedRowIndex}
                    />
                </div>
            </div>

            <UpdateStock
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                onUpdate={() => loadInitialData(apiPagination.page)}
            />
        </>
    );
}
