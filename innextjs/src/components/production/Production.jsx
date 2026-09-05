import { MACHINES } from '../../common/dummy';
import clsx from 'clsx';
import Head from 'next/head';

const machineStatusMeta = {
  RUNNING: {
    className: 'bg-success-50 text-success-700',
    dot: 'bg-success-700',
    label: 'Running',
  },
  IDLE: {
    className: 'bg-ink-100 text-ink-700',
    dot: 'bg-ink-700',
    label: 'Idle',
  },
  WARNING: {
    className: 'bg-warning-50 text-warning-700',
    dot: 'bg-warning-700',
    label: 'Warning',
  },
  STOPPED: {
    className: 'bg-danger-50 text-danger-700',
    dot: 'bg-danger-700',
    label: 'Stopped',
  },
};

export default function Production() {
  return (
    <>
      <Head>
        <title>Production | Arwa Weld</title>
      </Head>
      <div>
        {/* Page Header */}
        <div className="mb-3 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-ink-900">
              Production
            </h1>
            <p className="mt-1 text-sm leading-snug text-ink-500">
              Workstation status at a glance — dummy monitoring board.
            </p>
          </div>
        </div>

        {/* Machines Grid */}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {MACHINES.map((m) => {
            const meta = machineStatusMeta[m.status] ?? machineStatusMeta.IDLE;
            return (
              <article key={m.id} className="card-panel">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-ink-900">{m.name}</h2>
                    <p className="font-mono text-2xs text-ink-500">{m.station}</p>
                  </div>
                  {/* Inline Machine Status Badge */}
                  <span className={clsx('badge', meta.className)}>
                    <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
                    {meta.label}
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink-700">{m.job}</p>
                <div className="mt-3 flex items-center justify-between border-t border-white/40 pt-3">
                  <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                    OEE
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums text-ink-900">
                    {m.oee}%
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
