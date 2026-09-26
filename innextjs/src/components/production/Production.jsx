import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Search, AlertCircle, Check, PackageOpen, ChevronRight, ChevronDown } from 'lucide-react';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import Input from '@/common/input/Input';
import Button from '@/common/buttons/Button';
import CommonTable from '@/common/table/CommonTable';
import { KeyboardShortcutBar, useKeyboardShortcuts } from '@/common/KeyboardShortcut';
import { getProductsApi, getProductionBomApi } from '@/lib/fetcher';

export default function Production() {
    // Inputs
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState('1');
    const [defaultProducts, setDefaultProducts] = useState([]);
    
    // Data states
    const [requirementsTree, setRequirementsTree] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasChecked, setHasChecked] = useState(false);
    
    // Tree states
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [loadingNodes, setLoadingNodes] = useState(new Set());
    const [rootPagination, setRootPagination] = useState({ page: 1, hasMore: false });
    
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);

    useEffect(() => {
        const fetchDefaultProducts = async () => {
            try {
                const res = await getProductsApi(1, 20, '', 'ACTIVE', 'ALL', 'ALL', 'ALL', true);
                if (res.data?.success) {
                    setDefaultProducts(res.data.data.data.map(p => ({ label: p.name + (p.code ? ` (${p.code})` : ''), value: p.id })));
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchDefaultProducts();
    }, []);

    const loadProducts = async (input) => {
        if (!input) return defaultProducts;
        const res = await getProductsApi(1, 20, input, 'ACTIVE', 'ALL', 'ALL', 'ALL', true);
        if (res.data?.success) {
            return res.data.data.data.map(p => ({ label: p.name + (p.code ? ` (${p.code})` : ''), value: p.id }));
        }
        return [];
    };

    const handleCheck = async () => {
        const q = parseFloat(quantity);
        if (!selectedProduct || isNaN(q) || q <= 0) {
            setRequirementsTree([]);
            setError('Please select a valid product and quantity.');
            setHasChecked(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setHasChecked(true);
        setExpandedNodes(new Set());
        
        const res = await getProductionBomApi(selectedProduct.value, q, 1, 10);
        
        setIsLoading(false);
        
        if (res.error) {
            const msg = res.error.message || 'Failed to fetch production requirements.';
            setRequirementsTree([]);
            if (msg.toLowerCase().includes('no bom found')) {
                setError('For this product no bom available');
            } else {
                setError(msg);
            }
        } else if (res.data?.success) {
            setRequirementsTree(res.data.data.requirements);
            setRootPagination({
                page: 1,
                hasMore: res.data.data.pagination?.hasMore || false
            });
        }
    };

    const flattenedList = React.useMemo(() => {
        const result = [];
        const traverse = (node, depth, parentUniqueId = "") => {
            const uniqueId = parentUniqueId ? `${parentUniqueId}-${node.productId}` : `${node.productId}`;
            result.push({ ...node, depth, uniqueId });
            
            if (expandedNodes.has(uniqueId)) {
                if (loadingNodes.has(uniqueId)) {
                    result.push({ isSkeleton: true, depth: depth + 1, uniqueId: `skel-1-${uniqueId}` });
                    result.push({ isSkeleton: true, depth: depth + 1, uniqueId: `skel-2-${uniqueId}` });
                } else if (node.children) {
                    node.children.forEach(child => traverse(child, depth + 1, uniqueId));
                    if (node.pagination?.hasMore) {
                        const loadMoreUniqueId = `loadmore-${uniqueId}`;
                        if (loadingNodes.has(loadMoreUniqueId)) {
                            result.push({ isSkeleton: true, depth: depth + 1, uniqueId: `skel-lm-1-${uniqueId}` });
                            result.push({ isSkeleton: true, depth: depth + 1, uniqueId: `skel-lm-2-${uniqueId}` });
                        } else {
                            result.push({
                                isLoadMore: true,
                                depth: depth + 1,
                                uniqueId: loadMoreUniqueId,
                                parentId: uniqueId,
                                rawId: node.productId,
                                quantity: node.requiredQuantity,
                                page: node.pagination.page + 1
                            });
                        }
                    }
                }
            }
        };
        requirementsTree.forEach(root => traverse(root, 0, ""));

        if (rootPagination.hasMore) {
            if (loadingNodes.has('loadmore-root')) {
                result.push({ isSkeleton: true, depth: 0, uniqueId: `skel-lm-1-root` });
                result.push({ isSkeleton: true, depth: 0, uniqueId: `skel-lm-2-root` });
            } else {
                result.push({
                    isLoadMore: true,
                    depth: 0,
                    uniqueId: 'loadmore-root',
                    parentId: 'root',
                    rawId: selectedProduct?.value,
                    quantity: quantity,
                    page: rootPagination.page + 1
                });
            }
        }

        return result;
    }, [requirementsTree, expandedNodes, loadingNodes, rootPagination, selectedProduct, quantity]);

    const toggleExpand = async (item) => {
        const uniqueId = item.uniqueId;
        
        if (expandedNodes.has(uniqueId)) {
            // Collapse
            setExpandedNodes(prev => { const n = new Set(prev); n.delete(uniqueId); return n; });
            return;
        }

        // Expand
        setExpandedNodes(prev => { const n = new Set(prev); n.add(uniqueId); return n; });
        
        if (item.childrenLoaded) return;

        setLoadingNodes(prev => new Set(prev).add(uniqueId));
        try {
            const res = await getProductionBomApi(item.productId, item.requiredQuantity, 1, 10);
            if (res.data?.success) {
                const childrenData = res.data.data.requirements;
                const pagination = res.data.data.pagination;
                setRequirementsTree(prev => {
                    const updateNode = (nodes, currentPath = "") => nodes.map(n => {
                        const path = currentPath ? `${currentPath}-${n.productId}` : `${n.productId}`;
                        if (path === uniqueId) {
                            return { ...n, children: childrenData, childrenLoaded: true, pagination };
                        }
                        if (n.children) return { ...n, children: updateNode(n.children, path) };
                        return n;
                    });
                    return updateNode(prev, "");
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingNodes(prev => { const n = new Set(prev); n.delete(uniqueId); return n; });
        }
    };

    const handleLoadMore = async (item) => {
        setLoadingNodes(prev => new Set(prev).add(item.uniqueId));
        try {
            const res = await getProductionBomApi(item.rawId, parseFloat(item.quantity), item.page, 10);
            if (res.data?.success) {
                const newChildren = res.data.data.requirements;
                const newPagination = res.data.data.pagination;

                if (item.parentId === 'root') {
                    setRequirementsTree(prev => [...prev, ...newChildren]);
                    setRootPagination({
                        page: newPagination.page,
                        hasMore: newPagination.hasMore
                    });
                } else {
                    setRequirementsTree(prev => {
                        const updateNode = (nodes, currentPath = "") => nodes.map(n => {
                            const path = currentPath ? `${currentPath}-${n.productId}` : `${n.productId}`;
                            if (path === item.parentId) {
                                return { ...n, children: [...(n.children || []), ...newChildren], pagination: newPagination };
                            }
                            if (n.children) return { ...n, children: updateNode(n.children, path) };
                            return n;
                        });
                        return updateNode(prev, "");
                    });
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingNodes(prev => { const n = new Set(prev); n.delete(item.uniqueId); return n; });
        }
    };

    useKeyboardShortcuts({
        onRefresh: () => { if (hasChecked) handleCheck(); },
        searchId: "production-product-search",
        items: flattenedList,
        selectedRowIndex,
        setSelectedRowIndex,
        onEdit: (item) => {
            if (item) {
                if (item.isLoadMore) {
                    handleLoadMore(item);
                } else if (item.hasSubBom) {
                    toggleExpand(item);
                }
            }
        }
    });

    const columns = [
        {
            key: 'productName',
            label: 'COMPONENT',
            render: (item) => {
                if (item.isSkeleton) {
                    return (
                        <div className="flex items-center gap-2 py-1.5" style={{ paddingLeft: `${item.depth * 28}px` }}>
                            <div className="w-3 h-4 border-l-2 border-b-2 border-grey-border rounded-bl-sm -mt-3 mr-1 opacity-60" />
                            <div className="w-6 h-6 rounded-md bg-grey-border opacity-50 animate-pulse" />
                            <div className="h-4 w-32 bg-grey-border rounded opacity-50 animate-pulse" />
                        </div>
                    );
                }

                if (item.isLoadMore) {
                    const isLoading = loadingNodes.has(item.uniqueId);
                    return (
                        <div className="flex items-center py-1" style={{ paddingLeft: `${item.depth * 28}px` }}>
                            <div className="w-3 h-4 border-l-2 border-b-2 border-grey-border rounded-bl-sm -mt-3 mr-3 opacity-60" />
                            <button
                                onClick={(e) => { e.stopPropagation(); handleLoadMore(item); }}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-primary bg-primary-bg hover:bg-primary-muted/20 rounded-md transition-colors border border-primary/20"
                            >
                                {isLoading ? (
                                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <ChevronDown size={14} />
                                )}
                                Load more products
                            </button>
                        </div>
                    );
                }

                const isExpanded = expandedNodes.has(item.uniqueId);
                
                return (
                    <div style={{ paddingLeft: `${item.depth * 28}px` }} className="flex items-center">
                        {item.hasSubBom ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleExpand(item); }}
                                className="w-6 h-6 rounded flex items-center justify-center text-grey-icon-strong hover:bg-grey-bg transition-colors mr-2 shrink-0"
                            >
                                {isExpanded ? (
                                    <ChevronDown size={18} />
                                ) : (
                                    <ChevronRight size={18} />
                                )}
                            </button>
                        ) : (
                            <div className="w-6 mr-2 shrink-0 flex justify-center text-grey-muted">
                                <div className="w-1.5 h-1.5 rounded-full bg-grey-border-strong" />
                            </div>
                        )}
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm truncate" title={item.productName}>{item.productName}</span>
                            {item.productCode && <span className="text-[10px] text-grey-muted mt-0.5 uppercase tracking-wider">{item.productCode}</span>}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'requiredQuantity',
            label: 'REQUIRED',
            align: 'center',
            render: (item) => {
                if (item.isSkeleton || item.isLoadMore) return null;
                return <span className="font-semibold text-grey-text-strong">{item.requiredQuantity}</span>;
            }
        },
        {
            key: 'stockQuantity',
            label: 'AVAILABLE STOCK',
            align: 'center',
            render: (item) => {
                if (item.isSkeleton || item.isLoadMore) return null;
                return <span className="font-semibold text-grey-text-strong">{item.stockQuantity}</span>;
            }
        },
        {
            key: 'status',
            label: 'STATUS',
            align: 'center',
            render: (item) => {
                if (item.isSkeleton || item.isLoadMore) return null;
                return item.isShortage ? (
                    <span className="font-bold text-danger-main bg-danger-main/10 px-2 py-1 rounded text-xs whitespace-nowrap">
                        Shortage: {item.requiredQuantity - item.stockQuantity}
                    </span>
                ) : (
                    <span className="font-bold text-success-main bg-success-main/10 px-2 py-1 rounded text-xs whitespace-nowrap">
                        In Stock
                    </span>
                );
            }
        }
    ];

    return (
        <>
            <Head>
                <title>Production | Arwa Weld</title>
            </Head>

            <div className="w-full flex flex-col gap-5 h-full min-h-[calc(100vh-100px)]">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
                            Production Requirements
                        </h1>
                        <p className="mt-1 text-sm leading-snug text-grey-muted">
                            Calculate Bill of Materials requirements and check stock availability.
                        </p>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="card-panel flex w-full flex-col gap-3 border-none !p-3 shadow-sm shrink-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex-1 z-[60]">
                            <AsyncSelectInput
                                id="production-product-search"
                                value={selectedProduct}
                                onChange={(val) => {
                                    setSelectedProduct(val);
                                    setRequirementsTree([]);
                                    setError(null);
                                    setHasChecked(false);
                                }}
                                placeholder="Select target product to manufacture..."
                                defaultOptions={defaultProducts.length > 0 ? defaultProducts : true}
                                loadOptions={loadProducts}
                                hidePlaceholder={true}
                            />
                        </div>
                        <div className="w-full sm:w-[150px]">
                            <Input 
                                id="production-qty-input"
                                type="number" 
                                placeholder="Quantity (e.g. 1)"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="primary"
                            className="w-full sm:w-auto"
                            onClick={handleCheck}
                            icon={Check}
                            text="Calculate BOM"
                            disabled={isLoading}
                        />
                    </div>
                    <KeyboardShortcutBar
                        onRefresh={() => { if (hasChecked) handleCheck(); }}
                        searchId="production-product-search"
                        selectedItem={flattenedList[selectedRowIndex]}
                        selectedRowIndex={selectedRowIndex}
                    />
                </div>

                {/* Table Area */}
                <div className="w-full flex-1 flex flex-col relative min-h-0">
                    <CommonTable
                        columns={columns}
                        data={flattenedList}
                        isLoading={isLoading}
                        hidePagination={true}
                        emptyState={
                            error ? (
                                error === 'For this product no bom available' ? (
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                                            <PackageOpen size={32} />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800">{error}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
                                            <AlertCircle size={32} />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800">{error}</p>
                                    </div>
                                )
                            ) : !hasChecked ? (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                                        <PackageOpen size={32} />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-800 mb-1">Check Requirements</h3>
                                    <p className="text-sm text-slate-500 max-w-sm">Select a product and click 'Calculate BOM' to load requirements.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <span className="text-sm font-medium">No BOM requirements found.</span>
                                </div>
                            )
                        }
                        selectedRowIndex={selectedRowIndex}
                    />
                </div>
            </div>
        </>
    );
}
