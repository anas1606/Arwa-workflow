import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { Search, Settings2, Pencil, Tags } from 'lucide-react';
import CommonTable from '@/common/table/CommonTable';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import clsx from 'clsx';
import { useRouter } from 'next/router';

// Simple mocked data for configuration
const DUMMY_MODELS = [
  { id: '1', code: 'WLD-100', name: 'Arc Welder Pro', category: 'Arc', specs: ['Body Color: Blue', 'Power: 220V'] },
  { id: '2', code: 'MIG-200', name: 'MIG Master', category: 'MIG', specs: ['Body Color: Red', 'Power: 110V', 'Extra Spool'] },
  { id: '3', code: 'TIG-300', name: 'TIG Precision', category: 'TIG', specs: ['Body Color: Yellow'] }
];

export default function OrderConfigView() {
  const router = useRouter();
  const [models] = useState(DUMMY_MODELS);
  const [query, setQuery] = useState('');
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((m) => {
      if (!q) return true;
      return (
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q)
      );
    });
  }, [models, query]);

  React.useEffect(() => {
    setPageNo(1);
  }, [query]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedData = useMemo(() => {
    const start = (pageNo - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pageNo, pageSize]);

  const columns = [
    {
      key: 'code',
      label: 'Model Code',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
            {row.code.substring(0, 3)}
          </div>
          <span className="font-mono text-sm font-semibold text-ink-900">{row.code}</span>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (row) => <span className="text-sm font-medium text-ink-700">{row.name}</span>,
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => (
        <span className="badge border border-ink-200 text-ink-700 bg-ink-50">
          {row.category}
        </span>
      ),
    },
    {
      key: 'specs',
      label: 'Specifications',
      render: (row) => (
        <div className="flex items-center gap-1 flex-wrap">
          {row.specs.map((s, i) => (
             <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-ink-200 text-2xs text-ink-600 font-medium whitespace-nowrap">
               {s}
             </span>
          ))}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Configure',
      align: 'right',
      render: (row) => (
        <button className="text-brand-600 hover:text-brand-800 p-1.5 rounded-md hover:bg-brand-50 transition flex items-center gap-1 font-semibold text-xs border border-transparent hover:border-brand-200">
           <Settings2 size={16}/> Config
        </button>
      ),
    }
  ];

  return (
    <>
      <Head>
        <title>Order Configuration | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-5">
        
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-ink-900">
              Product Customisation
            </h1>
            <p className="mt-1 text-sm leading-snug text-ink-500">
              Manage customization options and specifications for product models.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <section className="grid w-full grid-cols-2 gap-2 lg:grid-cols-3">
            <article className="card-panel relative overflow-hidden !p-3 border-none">
              <div className="absolute inset-y-0 left-0 w-1 bg-brand-600" aria-hidden />
              <p className="pl-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">Total Models</p>
              <p className="mt-1 pl-2 font-mono text-xl font-semibold tabular-nums text-ink-900 sm:text-2xl">{models.length}</p>
            </article>
            <article className="card-panel relative overflow-hidden !p-3 border-none">
              <div className="absolute inset-y-0 left-0 w-1 bg-brand-600" aria-hidden />
              <p className="pl-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">Configured</p>
              <p className="mt-1 pl-2 font-mono text-xl font-semibold tabular-nums text-ink-900 sm:text-2xl">{models.length}</p>
            </article>
            <article className="card-panel relative overflow-hidden !p-3 border-none">
              <div className="absolute inset-y-0 left-0 w-1 bg-warning-600" aria-hidden />
              <p className="pl-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">Missing Specs</p>
              <p className="mt-1 pl-2 font-mono text-xl font-semibold tabular-nums text-ink-900 sm:text-2xl">0</p>
            </article>
        </section>

        {/* Toolbar */}
        <div className="card-panel flex w-full flex-col gap-3 border-none !p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="text"
              startIcon={Search}
              placeholder="Search by model or name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0"
            />
          </div>
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={paginatedData}
          emptyState="No models found."
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
