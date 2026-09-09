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
    
    const hasLock = document.body.dataset.modalLock === 'true';
    if (!hasLock) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.dataset.prevOverflow = document.body.style.overflow;
      document.body.dataset.prevPadding = document.body.style.paddingRight;
      document.body.dataset.modalLock = 'true';
      
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const onKeyDown = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKeyDown);
    
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      setTimeout(() => {
        const remainingModals = document.querySelectorAll('.app-modal-layer').length;
        if (remainingModals === 0) {
          document.body.style.overflow = document.body.dataset.prevOverflow || '';
          document.body.style.paddingRight = document.body.dataset.prevPadding || '';
          delete document.body.dataset.modalLock;
          delete document.body.dataset.prevOverflow;
          delete document.body.dataset.prevPadding;
        }
      }, 0);
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
        <div className="flex-none flex items-center justify-between p-5 border-b border-grey-surface bg-white/50">
          <h2 className="text-lg font-bold text-grey-text-strong">Order {selectedOrder.orderNumber}</h2>
          <button onClick={onClose} className="text-grey-muted hover:text-grey-text transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-y-6 gap-x-4">
          <div>
            <p className="text-xs font-bold text-grey-muted uppercase tracking-wide mb-1">Customer</p>
            <p className="text-sm font-semibold text-grey-text-strong">{selectedOrder.customerName}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-grey-muted uppercase tracking-wide mb-1">Order Type</p>
            <span className="badge border border-primary-subtle text-primary-dark bg-primary-bg inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold shadow-sm whitespace-nowrap">
               {selectedOrder.orderType}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-grey-muted uppercase tracking-wide mb-1">Status</p>
            <span className={clsx("badge px-2 py-1 rounded-md text-xs font-semibold shadow-sm inline-block whitespace-nowrap", getStatusStyles(selectedOrder.status))}>
               {selectedOrder.status.toUpperCase().replace('_', ' ')}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-grey-muted uppercase tracking-wide mb-1">Due</p>
            <div className="flex flex-col">
              <span className={clsx("text-sm font-bold whitespace-nowrap", dueDaysLabel(selectedOrder.dueDate).tone === 'danger' ? 'text-danger-dark' : 'text-grey-text-strong')}>
                 {dueDaysLabel(selectedOrder.dueDate).text}
              </span>
              <span className="text-xs text-grey-icon whitespace-nowrap">{selectedOrder.dueDate}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-grey-muted uppercase tracking-wide mb-1">Priority</p>
            <span className={clsx("text-sm font-semibold", 
               selectedOrder.priority === 'High' ? "text-danger-dark" :
               selectedOrder.priority === 'Medium' ? "text-warning-dark" : "text-success-dark"
            )}>{selectedOrder.priority}</span>
          </div>
          <div>
            <p className="text-xs font-bold text-grey-muted uppercase tracking-wide mb-1">Total Qty</p>
            <p className="text-sm font-semibold text-grey-text-strong">{orderTotalQty(selectedOrder)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-bold text-grey-muted uppercase tracking-wide mb-1">Lines</p>
            <p className="text-sm font-semibold text-grey-text-strong mb-2">{selectedOrder.products?.length || 0} product(s)</p>
            <div className="space-y-2">
               {selectedOrder.products?.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-md border border-grey-surface shadow-sm">
                     <span className="text-sm font-medium text-grey-text-dark">{p.name}</span>
                     <button className="text-grey-icon hover:text-grey-text-strong transition-colors p-1 rounded-md hover:bg-grey-surface">
                         <X size={16} />
                     </button>
                  </div>
               ))}
            </div>
          </div>
        </div>
        
        {/* Footer - Fixed */}
        <div className="flex-none p-4 flex items-center justify-end gap-3 bg-grey-bg/50 border-t border-grey-surface">
          <Button variant="secondary" text="Close" onClick={onClose} className="bg-white rounded-md shadow-sm" />
          <Button variant="secondary" icon={Printer} text="Print" className="bg-white rounded-md shadow-sm" />
          <Button variant="primary" text="Edit order" icon={Pencil} onClick={onEdit} className="rounded-md shadow-sm" />
        </div>
        
      </div>
    </div>,
    root
  );
}
