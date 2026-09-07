import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { orderTotalQty } from '@/common/dummy';

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

export default function EditOrderModal({
  open,
  selectedOrder,
  onClose,
  onSave,
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
        className={`app-modal-panel bg-[#f4f7fb] shadow-2xl rounded-md border border-white/50 ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-[400px] w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        
        {/* Header - Fixed */}
        <div className="flex-none flex items-center justify-between p-5 border-b border-ink-100 bg-white/50">
          <h2 className="text-lg font-bold text-ink-900">Edit {selectedOrder.orderNumber}</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-ink-600 mb-1">Customer</label>
            <Input type="text" defaultValue={selectedOrder.customerName} className="w-full bg-white border-ink-200 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-600 mb-1">Products (comma-separated)</label>
            <Input type="text" defaultValue={selectedOrder.products?.map(p=>p.name).join(', ')} className="w-full bg-white border-ink-200 rounded-md shadow-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink-600 mb-1">Primary qty</label>
              <Input type="number" defaultValue={orderTotalQty(selectedOrder)} className="w-full bg-white border-ink-200 rounded-md shadow-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-600 mb-1">Due date</label>
              <Input type="date" defaultValue={selectedOrder.dueDate} className="w-full bg-white border-ink-200 rounded-md shadow-sm" />
            </div>
          </div>
        </div>
        
        {/* Footer - Fixed */}
        <div className="flex-none p-4 flex items-center justify-end gap-3 bg-ink-50/50 border-t border-ink-100">
          <Button variant="secondary" text="Cancel" onClick={onClose} className="bg-white rounded-md shadow-sm" />
          <Button variant="primary" text="Save changes" onClick={onSave} className="rounded-md shadow-sm" />
        </div>
        
      </div>
    </div>,
    root
  );
}
