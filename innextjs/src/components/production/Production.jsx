import { MACHINES } from '../../common/dummy';
import clsx from 'clsx';
import Head from 'next/head';

const machineStatusMeta = {
  RUNNING: {
    className: 'bg-success-bg text-success-dark',
    dot: 'bg-success-dark',
    label: 'Running',
  },
  IDLE: {
    className: 'bg-grey-surface text-grey-text',
    dot: 'bg-grey-text',
    label: 'Idle',
  },
  WARNING: {
    className: 'bg-warning-bg text-warning-dark',
    dot: 'bg-warning-dark',
    label: 'Warning',
  },
  STOPPED: {
    className: 'bg-danger-bg text-danger-dark',
    dot: 'bg-danger-dark',
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
            <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
              Production
            </h1>
            <p className="mt-1 text-sm leading-snug text-grey-muted">
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
                    <h2 className="text-sm font-bold text-grey-text-strong">{m.name}</h2>
                    <p className="font-mono text-2xs text-grey-muted">{m.station}</p>
                  </div>
                  {/* Inline Machine Status Badge */}
                  <span className={clsx('badge', meta.className)}>
                    <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
                    {meta.label}
                  </span>
                </div>
                <p className="mt-3 text-sm text-grey-text">{m.job}</p>
                <div className="mt-3 flex items-center justify-between border-t border-white/40 pt-3">
                  <span className="text-2xs font-semibold uppercase tracking-wide text-grey-muted">
                    OEE
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums text-grey-text-strong">
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
