import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { ArrowLeft, Box, Hash, Calendar, Layers, Activity, ClipboardList, ShieldAlert, CheckCircle2, Factory } from 'lucide-react';
import { useRouter } from 'next/router';
import { getJobWorkByIdApi } from '@/lib/fetcher';
import CommonTable from '@/common/table/CommonTable';
import { toast } from 'sonner';

export default function ViewJobWork() {
  const router = useRouter();
  const { id } = router.query;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const res = await getJobWorkByIdApi(id);
        if (res.data?.success) {
          setData(res.data.data);
        } else {
          toast.error('Failed to load Job Work details');
          router.push('/production/job-work');
        }
      } catch (err) {
        console.error(err);
        toast.error('An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'CREATED': return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED': return 'bg-purple-100 text-purple-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'PAUSED': return 'bg-orange-100 text-orange-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      key: 'product',
      label: 'COMPONENT',
      render: (row) => (
        <div className="flex items-center">
          <div className="w-6 mr-2 shrink-0 flex justify-center text-grey-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-grey-border-strong" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate" title={row.product?.name}>{row.product?.name || '-'}</span>
            {row.product?.code && <span className="text-[10px] text-grey-muted mt-0.5 uppercase tracking-wider">{row.product.code}</span>}
          </div>
        </div>
      )
    },
    {
      key: 'requiredQty',
      label: 'REQUIRED',
      align: 'center',
      render: (row) => <span className="font-semibold text-grey-text-strong">{row.requiredQty}</span>
    },
    {
      key: 'allocatedQty',
      label: 'AVAILABLE STOCK',
      align: 'center',
      render: (row) => <span className="font-semibold text-grey-text-strong">{row.allocatedQty}</span>
    },
    {
      key: 'status',
      label: 'STATUS',
      align: 'center',
      render: (row) => {
        const isShortage = row.allocatedQty < row.requiredQty;
        return isShortage ? (
          <span className="font-bold text-danger-main bg-danger-main/10 px-2 py-1 rounded text-xs whitespace-nowrap">
            Shortage: {row.requiredQty - row.allocatedQty}
          </span>
        ) : (
          <span className="font-bold text-success-main bg-success-main/10 px-2 py-1 rounded text-xs whitespace-nowrap">
            In Stock
          </span>
        );
      }
    }
  ];

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-6 animate-pulse p-2">
        {/* Header Skeleton */}
        <div className="flex items-start gap-4">
          <div className="h-[42px] w-[42px] bg-grey-bg rounded-xl shrink-0" />
          <div className="flex-1 flex flex-col gap-3 pt-1">
            <div className="h-7 bg-grey-bg rounded-md w-64" />
            <div className="h-4 bg-grey-bg rounded-md w-40" />
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-panel border-none !p-5 flex flex-col gap-3 shadow-sm h-[90px]">
              <div className="h-3.5 bg-grey-bg rounded w-1/2" />
              <div className="h-5 bg-grey-bg rounded w-3/4" />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="w-full h-[300px] bg-grey-bg rounded-xl mt-2" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <Head>
        <title>View Job Work | Arwa Weld</title>
      </Head>
      <div className="w-full flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/production/job-work')}
            className="mt-1 p-2 bg-white border border-grey-border hover:bg-grey-bg rounded-xl transition-colors text-grey-muted hover:text-grey-text-strong shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-grey-text-strong">
                  Job Work Details
                </h1>
                <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold tracking-wider ${getStatusColor(data.status)}`}>
                  {data.status?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-grey-muted font-medium">
                <Hash size={14} />
                <span>{data.jobWorkNumber?.toUpperCase()}</span>
                {data.parentJobWorkId && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-grey-border-strong mx-1" />
                    <span className="text-primary flex items-center gap-1">
                      <Layers size={14} /> Sub-Job Work
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="card-panel border-none !p-5 flex flex-col gap-1 shadow-sm">
            <span className="text-[11px] text-grey-muted font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Factory size={14} /> Target Product
            </span>
            <span className="text-[15px] font-extrabold text-grey-text-strong truncate" title={data.product?.name}>
              {data.product?.name}
            </span>
          </div>

          <div className="card-panel border-none !p-5 flex flex-col gap-1 shadow-sm">
            <span className="text-[11px] text-grey-muted font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Layers size={14} /> Target Quantity
            </span>
            <span className="text-[15px] font-extrabold text-grey-text-strong">{data.quantity}</span>
          </div>

          <div className="card-panel border-none !p-5 flex flex-col gap-1 shadow-sm">
            <span className="text-[11px] text-grey-muted font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Activity size={14} /> Status
            </span>
            <span className="text-[15px] font-extrabold text-grey-text-strong">
              {data.status?.replace('_', ' ')}
            </span>
          </div>

          <div className="card-panel border-none !p-5 flex flex-col gap-1 shadow-sm">
            <span className="text-[11px] text-grey-muted font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={14} /> Created At
            </span>
            <span className="text-[15px] font-extrabold text-grey-text-strong">
              {new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
        {/* Info Cards Grid */}

        {/* Required Materials Table */}
        <div className="w-full flex-1 flex flex-col relative min-h-0 mt-2">
          <CommonTable
            columns={columns}
            data={data.items || []}
            hidePagination={true}
            emptyState="No materials required."
          />
        </div>
      </div>
    </>
  );
}
