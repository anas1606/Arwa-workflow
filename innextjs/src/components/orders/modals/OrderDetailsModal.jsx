import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Pencil, Box, Package, User, Hash, Calendar, Loader2, Layers, Sparkles, AlertTriangle } from 'lucide-react';
import Button from '@/common/buttons/Button';
import { getOrderByIdApi, getSettingsListApi } from '@/lib/fetcher';
import clsx from 'clsx';
import { StatusBadge, OrderTypeBadge } from '../badges';

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
}) {
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [fullOrder, setFullOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [defaultStickerLabel, setDefaultStickerLabel] = useState('Loading default sticker...');
  const [defaultPackagingLabel, setDefaultPackagingLabel] = useState('Loading default packaging...');

  useEffect(() => {
    if (open) {
      getSettingsListApi(1, 100).then(res => {
        if (res.data?.success) {
          const settings = res.data.data.data;
          const sLabel = settings.find(s => s.key === 'DEFAULT_STICKER_LABEL')?.value;
          const pLabel = settings.find(s => s.key === 'DEFAULT_PACKAGING_LABEL')?.value;
          setDefaultStickerLabel(sLabel || 'Arwa Default Sticker');
          setDefaultPackagingLabel(pLabel || 'Standard');
        }
      });
    }
  }, [open]);

  useEffect(() => {
    let timer;
    if (open) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      if (selectedOrder?.id) {
        setLoading(true);
        getOrderByIdApi(selectedOrder.id).then((res) => {
          if (res.data?.success) {
            setFullOrder(res.data.data);
          }
          setLoading(false);
        });
      }
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => { setShouldRender(false); setFullOrder(null); }, 200);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [open, shouldRender, selectedOrder]);

  if (!shouldRender || !selectedOrder) return null;
  const root = getModalRoot();
  if (!root) return null;
  
  const displayOrder = fullOrder || selectedOrder;
  const totalQty = (displayOrder.orderLines || []).reduce((sum, line) => sum + (line.quantity || 0), 0);

  // Due date color logic
  const dueDate = new Date(displayOrder.dueDate);
  const today = new Date();
  dueDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let dueBorderClass = 'border-grey-surface/60';
  let dueBgClass = 'bg-white';
  let dueTextClass = 'text-grey-text-strong';
  let dueSubText = '';
  if (diffDays < 0) {
    dueBorderClass = 'border-red-300';
    dueBgClass = 'bg-red-50';
    dueTextClass = 'text-red-700 font-bold';
    dueSubText = `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays <= 3) {
    dueBorderClass = 'border-yellow-300';
    dueBgClass = 'bg-yellow-50';
    dueTextClass = 'text-yellow-700 font-bold';
    dueSubText = diffDays === 0 ? 'Due today!' : `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else {
    dueSubText = `In ${diffDays} days`;
  }

  return createPortal(
    <div className="app-modal-layer z-[999]" role="presentation">
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
        className={`app-modal-panel bg-[#f4f7fb] shadow-2xl rounded-xl border border-white/50 ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        
        {/* Header - Fixed */}
        <div className="flex-none flex items-center justify-between p-5 border-b border-grey-surface bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary-bg rounded-lg flex items-center justify-center">
              <Package className="text-primary-dark" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-grey-text-strong flex items-center gap-2">
                {displayOrder.orderNumber}
                <StatusBadge status={displayOrder.status} />
              </h2>
              <p className="text-xs text-grey-icon mt-0.5">Order Details</p>
            </div>
          </div>
          <button onClick={onClose} className="text-grey-muted hover:text-grey-text transition-colors bg-grey-bg p-2 rounded-full hover:bg-grey-surface">
            <X size={20} />
          </button>
        </div>
        
        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative">
          {loading && (
             <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
               <Loader2 className="animate-spin text-primary" size={32} />
             </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-grey-surface/60 shadow-sm flex flex-col gap-1">
              <p className="text-xs font-bold text-grey-muted uppercase tracking-wide flex items-center gap-1.5"><User size={14}/> Customer</p>
              <p className="text-sm font-bold text-grey-text-strong mt-1">{displayOrder.customer?.name || displayOrder.customerName || '-'}</p>
            </div>
            <div className={clsx('p-4 rounded-xl border shadow-sm flex flex-col gap-1', dueBgClass, dueBorderClass)}>
              <p className="text-xs font-bold text-grey-muted uppercase tracking-wide flex items-center gap-1.5">
                {diffDays < 0 ? <AlertTriangle size={14} className="text-red-500"/> : diffDays <= 3 ? <AlertTriangle size={14} className="text-yellow-500"/> : <Calendar size={14}/>} Due Date
              </p>
              <p className={clsx('text-sm mt-1', dueTextClass)}>
                {dueDate.toLocaleDateString()}
              </p>
              {dueSubText && <p className={clsx('text-[10px] mt-0.5', diffDays < 0 ? 'text-red-600' : diffDays <= 3 ? 'text-yellow-600' : 'text-grey-muted')}>{dueSubText}</p>}
            </div>
            <div className="bg-white p-4 rounded-xl border border-grey-surface/60 shadow-sm flex flex-col gap-1">
              <p className="text-xs font-bold text-grey-muted uppercase tracking-wide flex items-center gap-1.5"><Hash size={14}/> Total Qty</p>
              <p className="text-sm font-bold text-grey-text-strong mt-1">{totalQty}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-grey-surface/60 shadow-sm flex flex-col gap-1">
              <p className="text-xs font-bold text-grey-muted uppercase tracking-wide flex items-center gap-1.5"><Box size={14}/> Order Type</p>
              <div className="mt-1">
                <OrderTypeBadge orderType={displayOrder.orderType} />
              </div>
            </div>
          </div>
          
          {displayOrder.remark && (
            <div className="bg-white p-4 rounded-xl border border-grey-surface/60 shadow-sm">
              <p className="text-xs font-bold text-grey-muted uppercase tracking-wide mb-2">Remarks</p>
              <p className="text-sm text-grey-text-dark whitespace-pre-wrap">{displayOrder.remark}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-grey-surface/60 shadow-sm">
            <div className="p-4 border-b border-grey-surface/60 bg-grey-bg/30">
               <p className="text-sm font-bold text-grey-text-strong">Order Lines</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-grey-bg/50 text-grey-icon text-xs font-bold border-b border-grey-surface">
                    <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Product</th>
                    <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-right">Qty</th>
                    <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Specs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grey-surface">
                  {(displayOrder.orderLines || []).map((line, idx) => (
                    <tr key={idx} className="hover:bg-grey-bg/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-grey-text-strong align-top">
                        {line.product?.name || '-'}
                        <div className="text-xs text-grey-muted font-normal mt-0.5">{line.product?.code || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-grey-text-dark align-top">{line.quantity}</td>
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2 text-xs">
                             {line.bodyDesign && <span className="bg-grey-bg px-2 py-1 rounded border border-grey-surface text-grey-text-dark"><span className="text-grey-icon mr-1">Design:</span>{line.bodyDesign.name}</span>}
                             {line.colour && <span className="bg-grey-bg px-2 py-1 rounded border border-grey-surface text-grey-text-dark"><span className="text-grey-icon mr-1">Color:</span>{line.colour.name}</span>}
                             {line.brand && <span className="bg-grey-bg px-2 py-1 rounded border border-grey-surface text-grey-text-dark"><span className="text-grey-icon mr-1">Brand:</span>{line.brand.brandname || line.brand.name}</span>}
                             {line.sticker
                               ? <span className="bg-grey-bg px-2 py-1 rounded border border-grey-surface text-grey-text-dark"><span className="text-grey-icon mr-1">Sticker:</span>{line.sticker.name}</span>
                               : line.isDefaultSticker 
                                  ? <span className="bg-grey-bg px-2 py-1 rounded border border-grey-surface text-grey-text-dark"><span className="text-grey-icon mr-1">Sticker:</span>{defaultStickerLabel}</span>
                                  : null
                             }
                          </div>
                          
                          <div className="mt-2 flex flex-wrap gap-2">
                              {/* Accessories Badge */}
                              {line.accessoriesType === 'CUSTOMIZE' ? (
                                <span className="badge bg-primary/10 text-primary-dark border border-primary/20">
                                  <Sparkles className="h-3 w-3 shrink-0" aria-hidden /> Custom Accessories
                                </span>
                              ) : (
                                <span className="badge bg-grey-surface text-grey-text-strong border border-grey-border">
                                  <Layers className="h-3 w-3 shrink-0" aria-hidden /> Accessories: Standard
                                </span>
                              )}

                              {/* Packing Badge */}
                              {line.packingType === 'CUSTOMIZE' ? (
                                <span className="badge bg-primary/10 text-primary-dark border border-primary/20">
                                  <Sparkles className="h-3 w-3 shrink-0" aria-hidden /> Custom Packing {line.packaging?.name ? `(${line.packaging.name})` : line.isDefaultPackaging ? `(${defaultPackagingLabel})` : ''}
                                </span>
                              ) : (
                                <span className="badge bg-grey-surface text-grey-text-strong border border-grey-border">
                                  <Layers className="h-3 w-3 shrink-0" aria-hidden /> Packing: {line.packaging?.name || (line.isDefaultPackaging ? defaultPackagingLabel : 'Standard')}
                                </span>
                              )}
                            </div>

                            {/* Custom notes below badges */}
                            {(line.accessoriesType === 'CUSTOMIZE' || line.packingType === 'CUSTOMIZE') && (
                              <div className="mt-2 flex flex-col gap-2">
                                {line.accessoriesType === 'CUSTOMIZE' && line.accessoriesNote && (
                                  <div className="text-xs border border-primary/15 bg-primary/5 rounded-xl p-2.5">
                                    <span className="font-bold text-primary-dark text-[10px] uppercase tracking-wider">Accessories Note</span>
                                    <div className="text-grey-text-dark mt-1 leading-relaxed [&>p]:m-0" dangerouslySetInnerHTML={{__html: line.accessoriesNote}} />
                                  </div>
                                )}
                                {line.packingType === 'CUSTOMIZE' && line.packingNote && (
                                  <div className="text-xs border border-primary/15 bg-primary/5 rounded-xl p-2.5">
                                    <span className="font-bold text-primary-dark text-[10px] uppercase tracking-wider">Packing Note</span>
                                    <div className="text-grey-text-dark mt-1 leading-relaxed [&>p]:m-0" dangerouslySetInnerHTML={{__html: line.packingNote}} />
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!displayOrder.orderLines || displayOrder.orderLines.length === 0) && (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-grey-muted text-sm">No products found for this order.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Footer - Fixed */}
        <div className="flex-none p-4 flex items-center justify-end gap-3 bg-white border-t border-grey-surface">
          <Button variant="secondary" text="Close" onClick={onClose} className="bg-grey-bg rounded-xl shadow-sm border-0" />
          <Button variant="secondary" icon={Printer} text="Print" className="bg-white rounded-xl shadow-sm border border-grey-border" />
          <Button variant="primary" text="Edit order" icon={Pencil} onClick={onEdit} className="rounded-xl shadow-sm" />
        </div>
        
      </div>
    </div>,
    root
  );
}
