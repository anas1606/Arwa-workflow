import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Search, Plus, Check, Calendar, Flag } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { getCustomersApi } from '@/lib/fetcher';
import AddCustomer from '../../customers/modal/AddCustomer';
import { useKeyboardShortcuts, KeyboardShortcutBar } from '@/common/KeyboardShortcut';
import { usePermission } from '@/hooks/usePermission';

const DUE_PRESETS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '2 months', days: 60 },
  { label: '3 months', days: 90 },
];

function formatDueLabel(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysDiff(iso) {
  if (!iso) return null;
  return Math.round((new Date(iso + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 3600 * 24));
}

export default function CustomerStep({
  customer,
  setCustomer,
  dueDate,
  setDueDate,
  priority,
  setPriority,
  plannerNotes,
  setPlannerNotes,
  isActive
}) {
  const { canCreate: canCreateCustomer } = usePermission('customers');
  const [customerQuery, setCustomerQuery] = useState('');
  const [focusedCustomerIndex, setFocusedCustomerIndex] = useState(-1);

  const customerSearchRef = useRef(null);
  const customerListRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(customerQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await getCustomersApi(1, 10, debouncedQuery, '', true);
      if (res.data?.success) {
        setCustomers(res.data.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchCustomers();
    }
  }, [debouncedQuery, isActive]);

  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        document.getElementById('customer-search')?.focus();
      }, 100);
    }
  }, [isActive]);

  const filteredCustomers = customers;

  useKeyboardShortcuts({
    searchId: 'customer-search',
    customShortcuts: [
      { key: 'ArrowRight', altKey: true, ignoreInInput: true, action: () => { document.getElementById('due-date')?.focus(); } },
      { key: 'ArrowLeft', altKey: true, ignoreInInput: true, action: () => { document.getElementById('customer-search')?.focus(); } }
    ]
  });

  useEffect(() => {
    if (focusedCustomerIndex >= 0 && customerListRef.current) {
      customerListRef.current.children[focusedCustomerIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedCustomerIndex]);

  return (
    <div className="flex flex-col lg:flex-row gap-3 items-start h-full">
      {/* LEFT: Customer list */}
      <div className="flex-1 min-w-0 w-full lg:relative flex flex-col h-full">
        <div className="flex-1 bg-white rounded-xl border border-grey-border/60 shadow-sm flex flex-col overflow-hidden lg:absolute lg:inset-0">
          <div className="px-5 pt-5 pb-3 shrink-0">
            <h2 className="text-base font-bold text-grey-text-strong">Select customer</h2>
            <p className="text-xs text-grey-muted mt-0.5">Search and pick the account for this production order.</p>
          </div>

          {/* Search */}
          <div className="px-5 pb-3 flex items-center gap-3 shrink-0">
            <div className="flex-1">
              <Input
                id="customer-search"
                ref={customerSearchRef}
                type="text"
                startIcon={Search}
                className="!text-sm"
                placeholder="Search name, code, or region..."
                value={customerQuery}
                onChange={e => {
                  setCustomerQuery(e.target.value);
                  setFocusedCustomerIndex(-1); // Changed from 0 so we don't default select
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (focusedCustomerIndex >= 0 && filteredCustomers[focusedCustomerIndex]) {
                      setCustomer(filteredCustomers[focusedCustomerIndex]);
                      setTimeout(() => document.getElementById('due-date')?.focus(), 100);
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setFocusedCustomerIndex(prev => prev < 0 ? 0 : Math.min(prev + 1, filteredCustomers.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setFocusedCustomerIndex(prev => Math.max(prev - 1, -1));
                  }
                }}
              />
            </div>
            {canCreateCustomer && (
              <Button variant="secondary" icon={Plus} text="Add customer" onClick={() => setIsAddOpen(true)} className="!h-10 !rounded-xl !text-sm" />
            )}
          </div>

          <AddCustomer 
            open={isAddOpen} 
            onClose={() => setIsAddOpen(false)} 
            onAdd={() => {
              setIsAddOpen(false);
              fetchCustomers();
            }} 
          />

          <div className="px-5 pb-3 shrink-0">
            <KeyboardShortcutBar 
              searchId="customer-search"
              customActions={[
                { label: 'Move list', keyCombo: ['↓', '↑'] },
                { label: 'Select', keyCombo: ['Enter'] },
                { label: 'Sections', keyCombo: ['Alt', '←', '→'] }
              ]}
            />
          </div>

          {/* List */}
          <div ref={customerListRef} className="flex-1 overflow-y-auto border-t border-grey-surface">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={`skel-${idx}`} className="flex items-center gap-3 px-5 py-3.5 border-b border-grey-surface/50">
                  <div className="w-9 h-9 rounded-xl bg-grey-surface animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-grey-surface rounded animate-pulse w-1/3" />
                    <div className="h-2.5 bg-grey-surface rounded animate-pulse w-1/4" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {filteredCustomers.map((c, idx) => {
                  const isSelected = customer?.id === c.id;
                  const isFocused = focusedCustomerIndex === idx;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setCustomer(c);
                        setTimeout(() => document.getElementById('due-date')?.focus(), 100);
                      }}
                      onMouseEnter={() => setFocusedCustomerIndex(idx)}
                      className={clsx(
                        'flex items-center gap-3 px-5 py-3.5 cursor-pointer border-b border-grey-surface/50 transition-colors',
                        isSelected ? 'bg-primary-bg' : isFocused ? 'bg-grey-surface  z-10 relative' : 'hover:bg-grey-bg/40'
                      )}
                    >
                      <div className={clsx(
                        'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0',
                        isSelected ? 'bg-primary text-white' : 'bg-grey-surface text-grey-text-light'
                      )}>
                        {(c.name || 'NA').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx('font-bold text-sm', isSelected ? 'text-primary-text' : 'text-grey-text-strong')}>{c.name}</p>
                        <p className="text-xs text-grey-muted flex items-center gap-1 mt-0.5">
                          <span className="text-[10px]">⊙</span> {c.code || 'N/A'} · {c.region || 'Unknown'}
                        </p>
                      </div>
                      {isSelected && <Check size={16} className="text-primary shrink-0" />}
                    </div>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <div className="py-12 text-center text-grey-icon text-sm">No customers found.</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Order Summary sidebar */}
      {customer && (
        <div className="w-full lg:w-[280px] shrink-0 space-y-2 h-full overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wide text-grey-icon px-1">Order Summary</p>

          {/* Customer card */}
          <div className={clsx('bg-white rounded-xl border border-grey-border/60 shadow-sm p-3', customer ? 'flex items-center gap-3' : 'flex items-center justify-center py-4')}>
            {customer ? (
              <>
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                     {(customer.name || 'NA').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm text-grey-text-strong leading-tight">{customer.name}</p>
                  <p className="text-xs text-grey-muted mt-0.5">Production order draft</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-grey-icon font-medium">No customer selected</p>
            )}
          </div>

          {/* Due date */}
          <div className="bg-white rounded-xl border border-grey-border/60 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-grey-text">
                <Calendar size={13} className="text-grey-icon" /> Due date *
              </label>
              {dueDate && <span className="text-xs font-bold text-primary">{formatDueLabel(dueDate)}</span>}
            </div>
            <Input
              id="due-date"
              type="date"
              className="!text-sm"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  document.getElementById('priority-btn-Low')?.focus();
                }
              }}
            />
            <div className="grid grid-cols-3 gap-1.5">
              {DUE_PRESETS.map(p => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => {
                    setDueDate(addDays(p.days));
                    setTimeout(() => {
                      document.getElementById('priority-btn-Low')?.focus();
                    }, 150);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setDueDate(addDays(p.days));
                      setTimeout(() => {
                        document.getElementById('priority-btn-Low')?.focus();
                      }, 150);
                    }
                  }}
                  className={clsx(
                    'text-[11px] font-medium py-1.5 rounded-xl border transition-colors',
                    dueDate === addDays(p.days) ? 'bg-primary-bg text-primary-dark border-primary-subtle' : 'bg-grey-bg text-grey-text-light border-transparent hover:bg-grey-surface'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {dueDate && (
              <p className="text-[11px] text-grey-icon">{daysDiff(dueDate)} days from today</p>
            )}
          </div>

          {/* Priority */}
          <div className="bg-white rounded-xl border border-grey-border/60 shadow-sm p-4">
            <label className="flex items-center gap-1.5 text-xs font-bold text-grey-text mb-3">
              <Flag size={13} className="text-grey-icon" /> Priority *
            </label>
            <div className="flex gap-2">
              {['Low', 'Normal', 'High'].map(p => (
                <button
                  type="button"
                  id={`priority-btn-${p}`}
                  key={p}
                  onClick={() => {
                    setPriority(p);
                    setTimeout(() => document.getElementById('planner-notes')?.focus(), 50);
                  }}
                  className={clsx(
                    'flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors',
                    p === 'Low' ? (priority === 'Low' ? 'bg-success-subtle text-success-text border-success-subtle' : 'bg-success-bg/50 text-success-dark border-transparent hover:bg-success-subtle') :
                    p === 'Normal' ? (priority === 'Normal' ? 'bg-warning-subtle text-warning-text border-warning-subtle' : 'bg-warning-bg/50 text-warning-dark border-transparent hover:bg-warning-subtle') :
                    (priority === 'High' ? 'bg-danger-subtle text-danger-text border-danger-subtle' : 'bg-danger-bg/50 text-danger-dark border-transparent hover:bg-danger-subtle')
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Planner notes */}
          <div className="bg-white rounded-xl border border-grey-border/60 shadow-sm p-4">
            <label className="text-xs font-bold text-grey-text block mb-2">Planner notes <span className="text-grey-icon font-normal">(optional)</span></label>
            <textarea
              id="planner-notes"
              className="w-full text-sm text-grey-text-strong bg-grey-bg/40 border border-grey-border/60 rounded-xl p-3 resize-none h-[88px] placeholder:text-grey-icon focus:outline-none focus:ring-2 focus:ring-primary-muted/30"
              placeholder="Delivery instructions, shift preferences, material constraints..."
              value={plannerNotes}
              onChange={e => setPlannerNotes(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
