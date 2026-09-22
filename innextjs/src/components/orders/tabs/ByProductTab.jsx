import React from 'react';
import CommonTable from '@/common/table/CommonTable';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ByProductTab({
  columns,
  productData,
  isLoading,
  productTotalItems,
  pageSize,
  productPageNo,
  productTotalPages,
  setProductPageNo,
  setPageSize
}) {
  return (
    <div className="w-full space-y-4">
      {isLoading ? (
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
      ) : (
        productData.map((group) => (
          <section key={group.product} className="card-panel !p-0 w-full overflow-hidden bg-white shadow-sm border border-grey-border rounded-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grey-border/60 bg-grey-bg/50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-dark">
                  <Package className="h-4 w-4" aria-hidden />
                </span>
                <h2 className="truncate text-sm font-bold text-grey-text-strong">
                  {group.product}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-grey-text">
                <span>{group.orders.length} {group.orders.length === 1 ? 'order' : 'orders'}</span>
                <span className="text-grey-border">·</span>
                <span>Total qty <span className="font-bold text-grey-text-strong">{group.qty}</span></span>
                <span className="text-grey-border">·</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-grey-surface px-2 py-0.5 text-2xs font-bold text-grey-text-strong border border-grey-border">
                  Standard <span className="font-mono">{group.standard}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-2xs font-bold text-primary-dark border border-primary/20">
                  Customized <span className="font-mono">{group.customized}</span>
                </span>
              </div>
            </div>
            <CommonTable
              columns={columns}
              data={group.orders}
              isLoading={isLoading}
              emptyState="No orders for this product."
            />
          </section>
        ))
      )}

      {/* Pagination for By Product View */}
      {!isLoading && productData.length > 0 && (
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
                          className="appearance-none bg-white border border-grey-border text-grey-text-strong rounded-md px-3 py-1.5 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-muted cursor-pointer shadow-sm transition-all hover:bg-white"
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
                      className={`w-8 h-8 flex justify-center items-center rounded-md transition-all border ${productPageNo <= 1 ? "border-transparent text-grey-border-strong cursor-not-allowed opacity-50" : "bg-white border-grey-border text-grey-text hover:bg-grey-bg hover:text-grey-text-strong cursor-pointer shadow-sm"}`}
                  >
                      <ChevronLeft size={16} />
                  </button>
                  
                  <span className="text-sm font-medium text-grey-text-strong px-2">
                     {productPageNo} / {productTotalPages}
                  </span>

                  <button
                      onClick={() => setProductPageNo(p => Math.min(productTotalPages, p + 1))}
                      disabled={productPageNo >= productTotalPages}
                      className={`w-8 h-8 flex justify-center items-center rounded-md transition-all border ${productPageNo >= productTotalPages ? "border-transparent text-grey-border-strong cursor-not-allowed opacity-50" : "bg-white border-grey-border text-grey-text hover:bg-grey-bg hover:text-grey-text-strong cursor-pointer shadow-sm"}`}
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
