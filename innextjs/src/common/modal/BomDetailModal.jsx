import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, FileText, Package } from 'lucide-react';
import Button from '@/common/buttons/Button';
import { getBomByIdApi } from '@/lib/fetcher';

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

export default function BomDetailModal({ open, bomId, onClose }) {
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  
  const [bom, setBom] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let timer;
    if (open) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      if (bomId) {
        fetchBomDetails();
      }
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      timer = setTimeout(() => { 
        setShouldRender(false);
        setBom(null); 
      }, 200);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [open, shouldRender, bomId]);

  const fetchBomDetails = async () => {
    setIsLoading(true);
    try {
      const res = await getBomByIdApi(bomId);
      if (res.data?.success) {
        setBom(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!shouldRender) return null;
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
        className={`app-modal-panel bg-white shadow-2xl rounded-xl sm:rounded-2xl border border-grey-border ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-2xl w-full max-h-[90vh] flex flex-col`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-grey-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-grey-border bg-grey-bg">
              <Layers className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <h2 id={titleId} className="text-lg font-bold text-grey-text-strong">BOM Details</h2>
              <p className="text-xs text-grey-muted mt-0.5">View components and configurations</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-md p-0 flex items-center justify-center transition-colors hover:bg-grey-bg text-grey-muted hover:text-grey-text-strong"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 bg-gray-50/50">
          {isLoading ? (
            <div className="flex flex-col gap-6 animate-pulse">
              <div className="bg-white p-5 rounded-lg border border-grey-border shadow-sm">
                <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
                    <div className="h-5 w-40 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-3 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-5 w-48 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-lg border border-grey-border shadow-sm">
                <div className="h-4 w-40 bg-gray-200 rounded mb-4"></div>
                <div className="flex flex-col gap-3">
                  <div className="h-10 w-full bg-gray-200 rounded"></div>
                  <div className="h-10 w-full bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ) : bom ? (
            <div className="flex flex-col gap-6">
              {/* General Information */}
              <div className="bg-white rounded-lg border border-grey-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-grey-border bg-gray-50 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-grey-muted" />
                  <h3 className="text-sm font-semibold text-grey-text-strong">General Information</h3>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-grey-muted uppercase tracking-wider mb-1">BOM Name</p>
                    <p className="text-sm font-semibold text-grey-text-strong">{bom.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-grey-muted uppercase tracking-wider mb-1">Main Product</p>
                    <p className="text-sm font-semibold text-grey-text-strong">
                      {bom.product?.name} {bom.product?.code ? <span className="text-grey-muted font-normal">({bom.product.code})</span> : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Components List */}
              <div className="bg-white rounded-lg border border-grey-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-grey-border bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-grey-muted" />
                    <h3 className="text-sm font-semibold text-grey-text-strong">Components</h3>
                  </div>
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {bom.items?.length || 0} Items
                  </span>
                </div>
                {bom.items && bom.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50/50 text-xs font-medium text-grey-muted uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3 border-b border-grey-border w-2/3">Product</th>
                          <th className="px-5 py-3 border-b border-grey-border w-1/3 text-center">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-grey-border">
                        {bom.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3">
                              <span className="font-medium text-grey-text-strong">{item.product?.name}</span>
                              {item.product?.code && (
                                <span className="text-xs text-grey-muted ml-1">({item.product.code})</span>
                              )}
                            </td>
                            <td className="px-5 py-3 font-semibold text-grey-text-strong text-center">
                              {item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-5 text-center text-sm text-grey-muted">
                    No components found for this BOM.
                  </div>
                )}
              </div>

              {/* Additional Note */}
              {bom.note && (
                <div className="bg-white rounded-lg border border-grey-border shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-grey-border bg-gray-50">
                    <h3 className="text-sm font-semibold text-grey-text-strong">Additional Note</h3>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-grey-text whitespace-pre-wrap leading-relaxed">{bom.note}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-grey-muted">Failed to load BOM details.</p>
            </div>
          )}
        </div>
        
        <div className="flex shrink-0 items-center justify-end border-t border-grey-border px-6 py-4 bg-gray-50 rounded-b-xl sm:rounded-b-2xl">
          <Button variant="secondary" onClick={onClose} text="Close" />
        </div>
      </div>
    </div>,
    root
  );
}
