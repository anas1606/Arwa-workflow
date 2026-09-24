import React, { useState, useEffect, useCallback } from 'react';
import CommonTable from '@/common/table/CommonTable';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { getOrdersApi } from '@/lib/fetcher';

function ProductOrderTable({ productGroup, columns, query, activeFilters, onInitialLoadComplete }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const fetchProductOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getOrdersApi(pageNo, pageSize, query, { ...activeFilters, productId: productGroup.id });
      if (res.data?.success) {
        setOrders(res.data.data.data);
        setTotalItems(res.data.data.pagination.total);
        setTotalPages(res.data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch orders for product', productGroup.id, error);
    } finally {
      setIsLoading(false);
      if (onInitialLoadComplete) onInitialLoadComplete(productGroup.id);
    }
  }, [productGroup.id, pageNo, pageSize, query, activeFilters, onInitialLoadComplete]);

  useEffect(() => {
    fetchProductOrders();
  }, [fetchProductOrders]);

  const productSpecificColumns = React.useMemo(() => {
    return columns.map(col => {
      if (['orderType', 'qty', 'products'].includes(col.key)) {
        return {
          ...col,
          render: (row) => {
            const productLines = (row.orderLines || []).filter(l => l.product?.id === productGroup.id || l.productId === productGroup.id);
            const specificType = productLines.length > 0 ? productLines[0].orderType : row.orderType;
            return col.render({ ...row, orderType: specificType, orderLines: productLines });
          }
        };
      }
      return col;
    });
  }, [columns, productGroup.id]);

  return (
    <section className="card-panel !p-0 w-full overflow-hidden bg-white shadow-sm border border-grey-border rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-border/60 bg-grey-bg/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-dark">
            <Package className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="truncate text-sm font-bold text-grey-text-strong">
            {productGroup.product}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-grey-text">
          <span>{productGroup.ordersCount} {productGroup.ordersCount === 1 ? 'order' : 'orders'}</span>
          <span className="text-grey-border">·</span>
          <span>Total qty <span className="font-bold text-grey-text-strong">{productGroup.qty}</span></span>
          <span className="text-grey-border">·</span>
          <span className="inline-flex items-center gap-1 rounded-xl bg-grey-surface px-2 py-0.5 text-2xs font-bold text-grey-text-strong border border-grey-border">
            Standard <span className="font-mono">{productGroup.standard}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2 py-0.5 text-2xs font-bold text-primary-dark border border-primary/20">
            Customized <span className="font-mono">{productGroup.customized}</span>
          </span>
        </div>
      </div>
      <CommonTable
        columns={productSpecificColumns}
        data={orders}
        isLoading={isLoading}
        emptyState="No orders for this product."
        pagination={{
          totalItems,
          pageSize,
          pageNo,
          totalPages
        }}
        onPageChange={(p) => setPageNo(p)}
        onPageSizeChange={(sz) => { setPageSize(sz); setPageNo(1); }}
      />
    </section>
  );
}

export default function ByProductTab({
  columns,
  productData,
  isLoading,
  productTotalItems,
  pageSize,
  productPageNo,
  productTotalPages,
  setProductPageNo,
  setPageSize,
  query,
  activeFilters,
  selectedRowIndex
}) {
  const [innerPagination, setInnerPagination] = React.useState({});
  const [loadedProducts, setLoadedProducts] = React.useState(new Set());

  useEffect(() => {
    setLoadedProducts(new Set());
  }, [productData]);

  const handleProductLoaded = useCallback((productId) => {
    setLoadedProducts(prev => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  }, []);

  const isAllLoaded = productData.length === 0 || loadedProducts.size === productData.length;
  const showSkeleton = isLoading || !isAllLoaded;

  const getPageWindow = () => {
    if (productTotalPages <= 1) return [1];
    const pages = [];
    let start = Math.max(1, productPageNo - 2);
    let end = Math.min(productTotalPages, productPageNo + 2);

    if (productPageNo <= 3) end = Math.min(5, productTotalPages);
    if (productPageNo >= productTotalPages - 2) start = Math.max(1, productTotalPages - 4);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="w-full space-y-4">
      {showSkeleton && (
        Array.from({ length: 3 }).map((_, i) => (
          <section key={`skeleton-${i}`} className="card-panel !p-0 w-full overflow-hidden bg-white shadow-sm border border-grey-border rounded-lg animate-pulse">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-border/60 bg-grey-bg/50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-grey-border opacity-50" />
                <div className="h-4 w-32 bg-grey-border rounded opacity-50" />
              </div>
              <div className="flex gap-2">
                <div className="h-4 w-16 bg-grey-border rounded opacity-50" />
                <div className="h-4 w-24 bg-grey-border rounded opacity-50" />
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3 bg-white">
              <div className="h-4 w-full bg-grey-border rounded opacity-50" />
              <div className="h-4 w-full bg-grey-border rounded opacity-50" />
            </div>
          </section>
        ))
      )}

      <div className={showSkeleton ? 'hidden' : 'block space-y-4'}>
        {productData.map((group, index) => (
          <div 
            key={group.product}
            className={`transition-all duration-200 ${selectedRowIndex === index ? 'ring-2 ring-primary/50 shadow-md rounded-lg scale-[1.01]' : ''}`}
          >
            <ProductOrderTable 
            productGroup={group} 
            columns={columns} 
            query={query} 
            activeFilters={activeFilters}
            onInitialLoadComplete={handleProductLoaded}
          />
          </div>
        ))}
      </div>

      {/* Pagination for By Product View */}
      {!showSkeleton && productData.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border border-grey-border bg-white rounded-lg shadow-sm">
          <div className="text-sm text-grey-text-light whitespace-nowrap">
            Showing <b className="text-grey-text-strong">{productData.length}</b> of <b className="text-grey-text-strong">{productTotalItems}</b> products
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-grey-text-light whitespace-nowrap">Per page</span>
              <div className="relative inline-block">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setProductPageNo(1);
                  }}
                  className="appearance-none bg-white border border-grey-border text-grey-text-strong rounded-xl px-3 py-1.5 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-muted cursor-pointer shadow-sm transition-all hover:bg-white"
                >
                  <option value={2}>2</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setProductPageNo(p => Math.max(1, p - 1))}
                disabled={productPageNo <= 1}
                className={`w-8 h-8 flex justify-center items-center rounded-xl transition-all border ${productPageNo <= 1 ? "border-transparent text-grey-border-strong cursor-not-allowed opacity-50" : "bg-white border-grey-border text-grey-text hover:bg-grey-bg hover:text-grey-text-strong cursor-pointer shadow-sm"}`}
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5 hidden sm:flex">
                {getPageWindow().map((p) => (
                  <button
                    key={p}
                    onClick={() => setProductPageNo(p)}
                    className={`w-8 h-8 rounded-xl text-sm font-medium transition-all flex items-center justify-center border ${p === productPageNo
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white border-grey-border text-grey-text hover:bg-grey-bg hover:text-grey-text-strong cursor-pointer shadow-sm'
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setProductPageNo(p => Math.min(productTotalPages, p + 1))}
                disabled={productPageNo >= productTotalPages}
                className={`w-8 h-8 flex justify-center items-center rounded-xl transition-all border ${productPageNo >= productTotalPages ? "border-transparent text-grey-border-strong cursor-not-allowed opacity-50" : "bg-white border-grey-border text-grey-text hover:bg-grey-bg hover:text-grey-text-strong cursor-pointer shadow-sm"}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {productData.length === 0 && !isLoading && (
        <div className="text-center py-10 text-sm text-grey-muted bg-white rounded-lg border border-grey-border">
          No orders match your search or filter.
        </div>
      )}
    </div>
  );
}
