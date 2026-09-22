import React from 'react';
import CommonTable from '@/common/table/CommonTable';

export default function OrdersListTab({
  columns,
  ordersData,
  isLoading,
  totalItems,
  pageSize,
  pageNo,
  totalPages,
  setPageNo,
  setPageSize,
  selectedRowIndex
}) {
  return (
    <CommonTable
      columns={columns}
      data={ordersData}
      isLoading={isLoading}
      emptyState="No orders found."
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
  );
}
