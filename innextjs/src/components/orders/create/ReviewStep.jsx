import React from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import { CUSTOMISATION_SPECS } from '@/common/dummy';

function formatDueLabel(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default function ReviewStep({
  customer,
  lines,
  dueDate,
  priority,
  status,
  setStatus,
  isEdit = false
}) {
  return (
    <div className="bg-white rounded-xl border border-grey-border/60 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-grey-surface shrink-0">
        <h2 className="text-base font-bold text-grey-text-strong">Review order</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Customer hero row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
              {customer?.name?.substring(0, 2).toUpperCase() || 'NA'}
            </div>
            <div>
              <p className="font-bold text-base text-grey-text-strong">{customer?.name || 'No Customer'}</p>
              <p className="text-xs text-grey-muted">{lines.length} model · {lines.reduce((a, b) => a + b.quantity, 0)} total qty</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-grey-icon">DUE</p>
              <p className="text-sm font-bold text-grey-text-strong mt-0.5">{dueDate ? formatDueLabel(dueDate) : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-grey-icon">PRIORITY</p>
              <p className={clsx(
                'text-sm font-bold mt-0.5',
                priority === 'Low' ? 'text-success-main' : priority === 'Medium' ? 'text-warning-main' : 'text-danger-main'
              )}>{priority}</p>
            </div>
          </div>
        </div>

        {/* Ready to create / update */}
        <div className="bg-grey-bg/60 border border-grey-surface rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-grey-icon">Ready to {isEdit ? 'update' : 'create'}</p>
            <span className="text-[10px] font-bold text-primary-dark bg-primary-subtle px-2 py-0.5 rounded-full">4/4</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Customer', 'Models', 'Specs', 'Schedule'].map(label => (
              <span key={label} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-dark">
                <Check size={12} className="text-primary-muted" /> {label}
              </span>
            ))}
          </div>

          {isEdit && (
            <div className="border-t border-grey-surface/60 pt-3">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-grey-icon mb-1">Update Status</label>
              <select
                value={status}
                onChange={(e) => setStatus && setStatus(e.target.value)}
                className="w-full bg-white border border-grey-border rounded-xl text-sm font-medium py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PRODUCTION">In Production</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        {/* Models & Customisation */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-grey-icon">Models &amp; Customisation</p>
            <p className="text-xs text-grey-icon">{lines.length} line{lines.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="border border-grey-border/60 rounded-xl overflow-hidden">
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-grey-bg/40 border-b border-grey-surface">
                  <span className="text-xs font-bold text-grey-muted w-4">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-xl bg-primary-subtle text-primary-dark font-bold text-xs flex items-center justify-center">{(line.model.code || line.model.name || 'NA').substring(0, 2)}</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-grey-text-strong">{line.model.name}</p>
                    <p className="text-[11px] text-grey-icon font-mono">{line.model.code}</p>
                  </div>
                  <span className="text-xs font-bold text-grey-muted bg-grey-surface px-2 py-0.5 rounded">×{line.quantity}</span>
                </div>
                {/* Specs display */}
                <div className="px-4 py-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-grey-icon mb-3">Appearance &amp; Branding</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-grey-icon mb-0.5">Body Design</p>
                        <p className="text-sm font-bold text-grey-text-strong">{line.specs?.bodyDesignIdName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-grey-icon mb-0.5">Colour</p>
                        <p className="text-sm font-bold text-grey-text-strong">{line.specs?.colourIdName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-grey-icon mb-0.5">Brand Name</p>
                        <p className="text-sm font-bold text-grey-text-strong">{line.specs?.brandIdName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-grey-icon mb-0.5">Panel Sticker</p>
                        <p className="text-sm font-bold text-grey-text-strong">{line.specs?.stickerIdName || '—'}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-grey-icon mb-3">Accessories &amp; Packing</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-grey-icon mb-0.5">Accessories</p>
                        <p className="text-sm font-bold text-grey-text-strong">{line.specs?.accessoriesType === 'CUSTOMIZE' ? 'Customise' : 'Standard'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-grey-icon mb-0.5">Packing</p>
                        <p className="text-sm font-bold text-grey-text-strong">
                          {line.specs?.packingType === 'CUSTOMIZE' ? `Customise ${line.specs?.packagingIdName ? `(${line.specs.packagingIdName})` : ''}` : (line.specs?.packagingIdName || 'Standard')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
