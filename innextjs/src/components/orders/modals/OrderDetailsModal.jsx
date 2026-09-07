import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Pencil } from 'lucide-react';
import Button from '@/common/buttons/Button';
import { dueDaysLabel, orderTotalQty } from '@/common/dummy';
import clsx from 'clsx';

function getModalRoot() {
  if (typeof document === 'undefined') return null;
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
  return root;
}

export default function OrderDetailsModal({
  open,
  selectedOrder,
  onClose,
  onEdit,
  getStatusStyles,
}) {
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    let timer;
    if (open) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => { setShouldRender(false); }, 200);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [open, shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    const onKeyDown = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [shouldRender, onClose]);

  if (!shouldRender || !selectedOrder) return null;
  const root = getModalRoot();
  if (!root) return null;

  return createPortal(
    <div className="app-modal-layer" role="presentation">
      <button
        type="button"
        className={`app-modal-backdrop ${isAnimatingOut ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}`}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-modal-panel bg-[#f4f7fb] shadow-2xl rounded-md border border-white/50 ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        
        {/* Header - Fixed */}
        <div className="flex-none flex items-center justify-between p-5 border-b border-ink-100 bg-white/50">
          <h2 className="text-lg font-bold text-ink-900">Order {selectedOrder.orderNumber}</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-y-6 gap-x-4">
          <div>
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-1">Customer</p>
            <p className="text-sm font-semibold text-ink-900">{selectedOrder.customerName}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-1">Order Type</p>
            <span className="badge border border-brand-200 text-brand-800 bg-brand-50 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold shadow-sm whitespace-nowrap">
               {selectedOrder.orderType}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-1">Status</p>
            <span className={clsx("badge px-2 py-1 rounded-md text-xs font-semibold shadow-sm inline-block whitespace-nowrap", getStatusStyles(selectedOrder.status))}>
               {selectedOrder.status.toUpperCase().replace('_', ' ')}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-1">Due</p>
            <div className="flex flex-col">
              <span className={clsx("text-sm font-bold whitespace-nowrap", dueDaysLabel(selectedOrder.dueDate).tone === 'danger' ? 'text-danger-700' : 'text-ink-900')}>
                 {dueDaysLabel(selectedOrder.dueDate).text}
              </span>
              <span className="text-xs text-ink-400 whitespace-nowrap">{selectedOrder.dueDate}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-1">Priority</p>
            <span className={clsx("text-sm font-semibold", 
               selectedOrder.priority === 'High' ? "text-danger-700" :
               selectedOrder.priority === 'Medium' ? "text-warning-700" : "text-success-700"
            )}>{selectedOrder.priority}</span>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-1">Total Qty</p>
            <p className="text-sm font-semibold text-ink-900">{orderTotalQty(selectedOrder)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-1">Lines</p>
            <p className="text-sm font-semibold text-ink-900 mb-2">{selectedOrder.products?.length || 0} product(s)</p>
            <div className="space-y-2">
               {selectedOrder.products?.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-md border border-ink-100 shadow-sm">
                     <span className="text-sm font-medium text-ink-800">{p.name}</span>
                     <button className="text-ink-400 hover:text-ink-900 transition-colors p-1 rounded-md hover:bg-ink-100">
                         <X size={16} />
                     </button>
                  </div>
               ))}
            </div>
          </div>
        </div>
        
        {/* Footer - Fixed */}
        <div className="flex-none p-4 flex items-center justify-end gap-3 bg-ink-50/50 border-t border-ink-100">
          <Button variant="secondary" text="Close" onClick={onClose} className="bg-white rounded-md shadow-sm" />
          <Button variant="secondary" icon={Printer} text="Print" className="bg-white rounded-md shadow-sm" />
          <Button variant="primary" text="Edit order" icon={Pencil} onClick={onEdit} className="rounded-md shadow-sm" />
        </div>
        
      </div>
    </div>,
    root
  );
}
