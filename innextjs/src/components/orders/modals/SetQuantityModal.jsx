import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '@/common/buttons/Button';
import clsx from 'clsx';

export default function SetQuantityModal({ isOpen, onClose, model, onAdd }) {
  const [qty, setQty] = useState(1);
  
  // Reset quantity when opened with a new model
  useEffect(() => {
    if (isOpen) setQty(1);
  }, [isOpen, model]);

  if (!isOpen || !model) return null;

  const quickSelects = [1, 5, 10, 25, 50, 100];

  const handleAdd = () => {
    if (qty > 0) {
      onAdd(model, Number(qty));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-grey-text-strong/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className="relative bg-grey-bg rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-grey-text-strong">Set quantity</h2>
          <button 
            onClick={onClose}
            className="text-grey-icon hover:text-grey-text transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-5">
          {/* Selected Model Card */}
          <div className="bg-white border border-grey-border/60 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary-subtle text-primary-dark font-bold text-xs flex items-center justify-center shrink-0">
              {model.code.substring(0, 2)}
            </div>
            <div>
              <p className="font-bold text-sm text-grey-text-strong">{model.name}</p>
              <p className="text-xs text-grey-muted font-medium font-mono">{model.code}</p>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="label mb-1.5 flex items-center text-xs font-bold text-grey-text">Quantity *</label>
            <input 
              type="number" 
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full h-11 bg-white border border-grey-border/60 rounded-lg px-3 text-sm font-bold text-grey-text-strong focus:outline-none focus:ring-2 focus:ring-primary-muted/50"
            />
          </div>

          {/* Quick Select */}
          <div>
            <label className="label mb-2 flex items-center text-[10px] font-bold uppercase tracking-wide text-grey-icon">QUICK SELECT</label>
            <div className="flex flex-wrap gap-2">
              {quickSelects.map(num => (
                <button
                  key={num}
                  onClick={() => setQty(num)}
                  className={clsx(
                    "h-8 px-3 rounded-lg text-xs font-bold transition-colors border",
                    Number(qty) === num 
                      ? "bg-primary-subtle text-primary-dark border-primary-subtle" 
                      : "bg-white text-grey-text border-grey-border/60 hover:bg-grey-surface"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-white border-t border-grey-border/50 flex items-center gap-3">
          <Button variant="secondary" text="Cancel" className="flex-1 !rounded-xl !h-11 !font-bold" onClick={onClose} />
          <Button variant="primary" text="Add to order" className="flex-1 !rounded-xl !h-11 !font-bold" onClick={handleAdd} />
        </div>

      </div>
    </div>
  );
}
