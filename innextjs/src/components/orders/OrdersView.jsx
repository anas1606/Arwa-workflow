import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { Search, Plus, Filter, Printer, Pencil } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import { DUMMY_ORDERS, ORDER_KPIS, dueDaysLabel, orderTotalQty } from '@/common/dummy';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function OrdersView() {
  const router = useRouter();
  const [ordersData] = useState(DUMMY_ORDERS);
  const [query, setQuery] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ordersData.filter((o) => {
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q)
      );
    });
  }, [ordersData, query]);

  React.useEffect(() => {
    setPageNo(1);
  }, [query]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    const start = (pageNo - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pageNo, pageSize]);

  const tabs = [
    { label: 'Order list', count: 18, path: '/orders' },
    { label: 'By product', count: 2, path: '/orders/by-product' },
    { label: 'By order type', count: 3, path: '/orders/by-order-type' },
  ];

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order',
      render: (row) => (
        <Link href={`/orders/new`} className="font-mono text-sm font-semibold text-brand-600 hover:underline">
          {row.orderNumber}
        </Link>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (row) => <span className="text-sm font-semibold text-ink-900">{row.customerName}</span>,
    },
    {
      key: 'orderType',
      label: 'Order Type',
      render: (row) => (
        <span className="badge border border-brand-200 text-brand-800 bg-brand-50">
          {row.orderType}
        </span>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due',
      render: (row) => {
        const due = dueDaysLabel(row.dueDate);
        return (
          <div className="flex flex-col">
            <span className={clsx(
              "text-sm font-semibold",
              due.tone === 'danger' && "text-danger-700",
              due.tone === 'warning' && "text-warning-700",
              due.tone === 'info' && "text-brand-700",
              due.tone === 'neutral' && "text-ink-800"
            )}>
              {due.text}
            </span>
            <span className="text-2xs font-mono text-ink-400">{row.dueDate}</span>
          </div>
        );
      },
    },
    {
      key: 'products',
      label: 'Products',
      render: (row) => {
        const firstTwo = row.products.slice(0, 2);
        const extra = row.products.length - 2;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {firstTwo.map((p, i) => (
              <span key={i} className="text-xs font-medium text-ink-800 flex items-center">
                {i > 0 && <span className="text-ink-300 mx-1">·</span>}
                {p.name}
              </span>
            ))}
            {extra > 0 && (
              <span className="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-2xs font-bold text-brand-700">
                +{extra}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'qty',
      label: 'Qty',
      align: 'right',
      render: (row) => (
        <span className="text-sm font-semibold tabular-nums text-ink-800">
          {orderTotalQty(row)}
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <span className={clsx(
          "text-xs font-semibold",
          row.priority === 'High' ? "text-danger-700" :
          row.priority === 'Medium' ? "text-warning-700" : "text-success-700"
        )}>
          {row.priority}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        return (
          <span className="badge border border-ink-200 text-ink-700 bg-white">
            {row.status.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
           <button className="text-ink-400 hover:text-ink-900 p-1 rounded-md hover:bg-ink-100 transition"><Printer size={16}/></button>
           <button className="text-ink-400 hover:text-ink-900 p-1 rounded-md hover:bg-ink-100 transition"><Pencil size={16}/></button>
        </div>
      ),
    }
  ];

  return (
    <>
      <Head>
        <title>Orders | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-5">
        
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-ink-900">
              Orders
            </h1>
            <p className="mt-1 text-sm leading-snug text-ink-500">
              Search, filter, and track customer / production orders.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Printer} text="Export" />
            <Button variant="secondary" icon={Printer} text="Print" />
            <Button
              variant="primary"
              onClick={() => router.push('/orders/new')}
              icon={Plus}
              text="Add new order"
            />
          </div>
        </div>

        {/* KPIs */}
        <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4">
          {ORDER_KPIS.map((kpi, i) => (
            <article key={kpi.label} className="card-panel relative overflow-hidden !p-3 border-none">
              <div
                className={clsx('absolute inset-y-0 left-0 w-1', 
                  i === 0 ? 'bg-brand-600' : 
                  i === 1 ? 'bg-brand-600' : 
                  i === 2 ? 'bg-brand-600' : 'bg-warning-700'
                )}
                aria-hidden
              />
              <p className="pl-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                {kpi.label}
              </p>
              <p className="mt-1 pl-2 font-mono text-xl font-semibold tabular-nums text-ink-900 sm:text-2xl">
                {kpi.value}
              </p>
              {kpi.hint ? <p className="mt-1 pl-2 text-xs text-ink-500">{kpi.hint}</p> : null}
            </article>
          ))}
        </section>

        {/* Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/40 backdrop-blur-md border border-white/50 w-max">
           {tabs.map((t) => {
             const active = router.pathname === t.path;
             return (
               <Link href={t.path} key={t.label} className={clsx(
                 "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                 active ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:bg-white/50"
               )}>
                 {t.label}
                 <span className={clsx(
                   "px-1.5 py-0.5 rounded-md text-2xs tabular-nums",
                   active ? "bg-ink-100 text-ink-700" : "bg-white/60 text-ink-500"
                 )}>{t.count}</span>
               </Link>
             )
           })}
        </div>

        {/* Toolbar */}
        <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="text"
              startIcon={Search}
              placeholder="Search order #, customer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0"
            />
            <Button variant="secondary" icon={Filter} text="Filters" />
          </div>
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={paginatedData}
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
        />
      </div>
    </>
  );
}
