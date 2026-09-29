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
    const [apiPagination, setApiPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    
    // Stats for KPIs
    const [totalStock, setTotalStock] = useState(0);
    const [totalProducts, setTotalProducts] = useState(0);

    const [loadedCounts, setLoadedCounts] = useState({});
    
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

    const loadInitialData = async (page = 1, searchQuery = inputValue, currentLimit = apiPagination.limit) => {
        setIsLoading(true);
        try {
            const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
            const parentParam = searchQuery ? '' : '&parentId=null';
            const res = await fetch(`/api/v1/stock?page=${page}&limit=${currentLimit}${parentParam}${searchParam}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await res.json();
            const data = result.data?.data || [];
            const products = result.data?.products || [];
            
            setTotalProducts(result.data?.kpis?.totalProducts || 0);
            setTotalStock(result.data?.kpis?.totalStock || 0);
            setApiPagination(result.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
            
            if (searchQuery && products.length > 0) {
                const searchData = [...data];
                const searchTotalStock = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
                searchData.push({
                    id: 'search-products',
                    name: 'Matching Products',
                    hasChildren: true,
                    products: products,
                    children: [],
                    childrenLoaded: true,
                    totalStock: searchTotalStock
                });
                setExpandedNodes(prev => new Set(prev).add('search-products'));
                setCategoriesData(searchData);
            } else {
                setCategoriesData(data);
            }
        } catch (error) {
            console.error('Failed to fetch stock categories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadInitialData(1, inputValue);
        }, 300);
        return () => clearTimeout(timeout);
    }, [inputValue]);

    const toggleExpand = async (uniquePath, rawId, e) => {
        e.stopPropagation();
        
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(uniquePath)) {
                next.delete(uniquePath);
            } else {
                next.add(uniquePath);
            }
            return next;
        });

        // Lazy load children
        if (!expandedNodes.has(uniquePath) && !loadingChildren.has(rawId)) {
            // Find if children are already loaded
            let node = null;
            const findNode = (nodes) => {
                for (const n of nodes) {
                    if (n.id === rawId) { node = n; return; }
                    if (n.children) findNode(n.children);
                }
            };
            findNode(categoriesData);
            
            // Only fetch if it hasn't been loaded yet AND it actually has either products or subcategories!
            if (node && node.hasChildren && !node.childrenLoaded) {
                setLoadingChildren(prev => new Set(prev).add(rawId));
                try {
                    const res = await fetch(`/api/v1/stock?parentId=${rawId}&limit=100`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    const result = await res.json();
                    
                    const childrenData = result.data?.data || [];
                    const productsData = result.data?.products || [];
                    
                    setCategoriesData(prev => {
                        const updateNode = (nodes) => nodes.map(n => {
                            if (n.id === rawId) {
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
                        next.delete(rawId);
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
        const traverse = (node, depth, path = '', isMatchingParent = false) => {
            const currentPath = path ? `${path}-${node.id}` : node.id;
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
                id: `cat-${currentPath}`,
                rawId: node.id,
                uniquePath: currentPath,
                isLoadingChildren: loadingChildren.has(node.id)
            });

            if (expandedNodes.has(currentPath)) {
                // 1. Products
                const prodsToRender = node.products;
                
                if (prodsToRender?.length > 0) {
                    const limit = loadedCounts[node.id] || 10;
                    const visibleProds = inputValue ? prodsToRender : prodsToRender.slice(0, limit);
                    
                    visibleProds.forEach(prod => {
                        result.push({
                            ...prod,
                            depth: depth + 1,
                            hasChildren: false,
                            rowType: 'product',
                            totalStock: prod.stockQuantity || 0,
                            id: `prod-${currentPath}-${prod.id}`
                        });
                    });
                    
                    if (!inputValue && prodsToRender.length > limit) {
                        result.push({
                            id: `load-more-${currentPath}`,
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
                        id: `skel-1-${currentPath}`,
                        rowType: 'skeleton',
                        depth: depth + 1
                    });
                    result.push({
                        id: `skel-2-${currentPath}`,
                        rowType: 'skeleton',
                        depth: depth + 1
                    });
                }
                
                // 3. Subcategories
                if (node.children?.length > 0) {
                    node.children.forEach(child => traverse(child, depth + 1, currentPath, !!inputValue));
                }
            }
        };

        categoriesData.forEach(root => traverse(root, 0, ''));
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
        onRefresh: () => loadInitialData(apiPagination.page, inputValue),
        searchId: "stock-search-input",
        onNextPage: handleNextPage,
        onPrevPage: handlePrevPage,
        pageNo: apiPagination.page,
        totalPages: apiPagination.totalPages,
        items: flattenedData,
        selectedRowIndex,
        setSelectedRowIndex,
        onEdit: (item) => {
            if (item.rowType === 'category' && item.hasChildren) {
                toggleExpand(item.uniquePath, item.rawId, { stopPropagation: () => {} });
            } else if (item.rowType === 'load-more') {
                setLoadedCounts(prev => ({
                    ...prev,
                    [item.categoryId]: (prev[item.categoryId] || 5) + 10
                }));
            }
        }
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
                                onClick={(e) => row.hasChildren && toggleExpand(row.uniquePath, row.rawId, e)}
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
                                {row.hasChildren && expandedNodes.has(row.uniquePath) ? (
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
                        onPageChange={(p) => loadInitialData(p, inputValue)}
                        onPageSizeChange={(limit) => {
                            setApiPagination(prev => ({ ...prev, limit, page: 1 }));
                            loadInitialData(1, inputValue, limit);
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
