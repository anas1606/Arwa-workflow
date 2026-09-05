import React, { useState, useMemo, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowLeft, ArrowRight, Search, Plus, Check, Calendar, Flag, X, Copy } from 'lucide-react';
import Button from '@/common/buttons/Button';
import clsx from 'clsx';
import { CUSTOMERS, PRODUCT_MODELS, CUSTOMISATION_SPECS } from '@/common/dummy';
import SetQuantityModal from './modals/SetQuantityModal';

const WIZARD_STEPS = [
  { id: 'customer', title: 'Customer', desc: 'Who is this order for?' },
  { id: 'models', title: 'Models', desc: 'Select models and enter quantity for each' },
  { id: 'specs', title: 'Specs', desc: 'Set customisation for each model line' },
  { id: 'schedule', title: 'Schedule', desc: 'Due date, priority, and review' },
];

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

export default function CreateOrderView() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);

  // Draft state
  const [customer, setCustomer] = useState(null);
  const [lines, setLines] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Low');
  const [plannerNotes, setPlannerNotes] = useState('');

  // UI state
  const [customerQuery, setCustomerQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [modelCategory, setModelCategory] = useState('All categories');
  const [activeSpecLineIndex, setActiveSpecLineIndex] = useState(0);
  const [focusedCustomerIndex, setFocusedCustomerIndex] = useState(-1);
  const [focusedModelIndex, setFocusedModelIndex] = useState(-1);
  const [modalModel, setModalModel] = useState(null);

  // Refs
  const customerSearchRef = useRef(null);
  const customerListRef = useRef(null);
  const modelSearchRef = useRef(null);
  const modelListRef = useRef(null);

  // Filtering
  const filteredCustomers = useMemo(() => {
    const q = customerQuery.toLowerCase();
    return CUSTOMERS.filter(c => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [customerQuery]);

  const filteredModels = useMemo(() => {
    const q = modelQuery.toLowerCase();
    return (PRODUCT_MODELS || []).filter(m => {
      const matchQ = !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q);
      const matchCat = modelCategory === 'All categories' || m.category === modelCategory;
      return matchQ && matchCat;
    });
  }, [modelQuery, modelCategory]);

  const categories = useMemo(() => {
    const cats = new Set((PRODUCT_MODELS || []).map(m => m.category));
    return ['All categories', ...Array.from(cats)];
  }, []);

  // Reset focus on search change
  useEffect(() => { setFocusedCustomerIndex(-1); }, [customerQuery]);
  useEffect(() => { setFocusedModelIndex(-1); }, [modelQuery, modelCategory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (stepIndex === 0) customerSearchRef.current?.focus();
        if (stepIndex === 1) modelSearchRef.current?.focus();
      }

      if (stepIndex === 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedCustomerIndex(prev => Math.min(prev + 1, filteredCustomers.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedCustomerIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && focusedCustomerIndex >= 0) {
          e.preventDefault();
          setCustomer(filteredCustomers[focusedCustomerIndex]);
        }
      }

      if (stepIndex === 1 && !modalModel) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedModelIndex(prev => Math.min(prev + 1, filteredModels.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedModelIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && focusedModelIndex >= 0) {
          e.preventDefault();
          setModalModel(filteredModels[focusedModelIndex]);
        }
      }

      if (stepIndex === 2) {
        if (e.altKey && e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveSpecLineIndex(prev => Math.min(prev + 1, lines.length - 1));
        } else if (e.altKey && e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveSpecLineIndex(prev => Math.max(prev - 1, 0));
        }
      }

      if (e.altKey && e.key === 'ArrowRight') {
        if (stepIndex < WIZARD_STEPS.length - 1) setStepIndex(s => s + 1);
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        if (stepIndex > 0) setStepIndex(s => s - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepIndex, filteredCustomers, focusedCustomerIndex, filteredModels, focusedModelIndex, modalModel, lines]);

  // Auto-scroll focused items
  useEffect(() => {
    if (focusedCustomerIndex >= 0 && customerListRef.current) {
      customerListRef.current.children[focusedCustomerIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedCustomerIndex]);

  useEffect(() => {
    if (focusedModelIndex >= 0 && modelListRef.current) {
      modelListRef.current.children[focusedModelIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedModelIndex]);

  // Actions
  const handleAddLineClick = (model) => setModalModel(model);

  const handleModalAdd = (model, qty) => {
    const idx = lines.findIndex(l => l.model.code === model.code);
    if (idx >= 0) {
      const newLines = [...lines];
      newLines[idx].quantity += qty;
      setLines(newLines);
    } else {
      const initialSpecs = {};
      (CUSTOMISATION_SPECS || []).forEach(s => { initialSpecs[s.key] = s.options?.[0] || ''; });
      setLines([...lines, { model, quantity: qty, specs: initialSpecs }]);
    }
  };

  const handleUpdateLineQty = (index, delta) => {
    const newLines = [...lines];
    const newQty = newLines[index].quantity + delta;
    if (newQty <= 0) {
      newLines.splice(index, 1);
      if (activeSpecLineIndex >= newLines.length) setActiveSpecLineIndex(Math.max(0, newLines.length - 1));
    } else {
      newLines[index].quantity = newQty;
    }
    setLines(newLines);
  };

  const handleUpdateSpec = (lineIdx, key, value) => {
    const newLines = [...lines];
    newLines[lineIdx].specs[key] = value;
    setLines(newLines);
  };

  const activeLine = lines[activeSpecLineIndex];

  const canProceed = () => {
    if (stepIndex === 0) return !!customer;
    if (stepIndex === 1) return lines.length > 0;
    if (stepIndex === 2) return true;
    if (stepIndex === 3) return !!dueDate && !!priority;
    return true;
  };

  const handleNext = () => {
    if (stepIndex < WIZARD_STEPS.length - 1) setStepIndex(s => s + 1);
    else router.push('/orders');
  };

  const handleBack = () => {
    if (stepIndex === 0) router.push('/orders');
    else setStepIndex(s => s - 1);
  };

  return (
    <>
      <Head><title>Create Order | Arwa Weld</title></Head>
      <div className="flex flex-col h-screen overflow-hidden bg-[#f0f2f7]">

        {/* STEPPER HEADER */}
        <div className="bg-white border-b border-ink-200/60 shrink-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center">
              {WIZARD_STEPS.map((step, idx) => {
                const isActive = idx === stepIndex;
                const isDone = idx < stepIndex;
                return (
                  <div
                    key={step.id}
                    className={clsx(
                      'flex-1 flex items-center gap-2.5 px-4 py-4 border-b-2 cursor-pointer transition-colors',
                      isActive ? 'border-brand-600' : isDone ? 'border-brand-400' : 'border-transparent'
                    )}
                    onClick={() => { if (isDone || isActive) setStepIndex(idx); }}
                  >
                    <div className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                      isActive ? 'bg-brand-600 text-white' : isDone ? 'bg-brand-100 text-brand-700 border-2 border-brand-400' : 'bg-ink-100 text-ink-500'
                    )}>
                      {isDone ? <Check size={12} /> : idx + 1}
                    </div>
                    <div className="hidden sm:block min-w-0">
                      <p className={clsx('text-sm font-bold leading-tight truncate', isActive ? 'text-brand-900' : isDone ? 'text-brand-600' : 'text-ink-400')}>{step.title}</p>
                      <p className="text-[11px] text-ink-400 truncate leading-tight mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">

            {/* ─── STEP 1: CUSTOMER ─── */}
            {stepIndex === 0 && (
              <div className="flex flex-col lg:flex-row gap-5 min-h-0">
                {/* LEFT: Customer list */}
                <div className="flex-1 min-w-0 bg-white rounded-xl border border-ink-200/60 shadow-sm flex flex-col overflow-hidden">
                  <div className="px-5 pt-5 pb-3 shrink-0">
                    <h2 className="text-base font-bold text-ink-900">Select customer</h2>
                    <p className="text-xs text-ink-500 mt-0.5">Search and pick the account for this production order.</p>
                  </div>

                  {/* Search */}
                  <div className="px-5 pb-3 flex items-center gap-3 shrink-0">
                    <div className="wizard-search-field flex-1">
                      <Search className="wizard-search-icon" />
                      <input
                        ref={customerSearchRef}
                        type="text"
                        className="wizard-search-input !h-10 !pl-10 !text-sm !rounded-lg"
                        placeholder="Search name, code, or region..."
                        value={customerQuery}
                        onChange={e => setCustomerQuery(e.target.value)}
                      />
                    </div>
                    <Button variant="secondary" icon={Plus} text="Add customer" className="!h-10 !rounded-lg !text-sm" />
                  </div>

                  {/* Shortcuts */}
                  <div className="px-5 pb-2 flex items-center gap-3 flex-wrap shrink-0">
                    <span className="wizard-specs-shortcut"><span className="wizard-kbd">ALT</span><span className="wizard-kbd">S</span> Search</span>
                    <span className="wizard-specs-shortcut"><span className="wizard-kbd">↓</span><span className="wizard-kbd">↑</span> Move list</span>
                    <span className="wizard-specs-shortcut"><span className="wizard-kbd">ENTER</span> Select</span>
                    <span className="wizard-specs-shortcut"><span className="wizard-kbd">ALT</span><span className="wizard-kbd">←</span><span className="wizard-kbd">→</span> Switch sections</span>
                  </div>

                  {/* List */}
                  <div ref={customerListRef} className="flex-1 overflow-y-auto border-t border-ink-100">
                    {filteredCustomers.map((c, idx) => {
                      const isSelected = customer?.code === c.code;
                      const isFocused = focusedCustomerIndex === idx;
                      return (
                        <div
                          key={c.code}
                          onClick={() => setCustomer(c)}
                          onMouseEnter={() => setFocusedCustomerIndex(idx)}
                          className={clsx(
                            'flex items-center gap-3 px-5 py-3.5 cursor-pointer border-b border-ink-100/50 transition-colors',
                            isSelected ? 'bg-brand-50' : isFocused ? 'bg-ink-50/60' : 'hover:bg-ink-50/40'
                          )}
                        >
                          <div className={clsx(
                            'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                            isSelected ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600'
                          )}>
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx('font-bold text-sm', isSelected ? 'text-brand-900' : 'text-ink-900')}>{c.name}</p>
                            <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5">
                              <span className="text-[10px]">⊙</span> {c.code} · {c.region}
                            </p>
                          </div>
                          {isSelected && <Check size={16} className="text-brand-600 shrink-0" />}
                        </div>
                      );
                    })}
                    {filteredCustomers.length === 0 && (
                      <div className="py-12 text-center text-ink-400 text-sm">No customers found.</div>
                    )}
                  </div>
                </div>

                {/* RIGHT: Order Summary sidebar */}
                <div className="w-full lg:w-[280px] shrink-0 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400 px-1">Order Summary</p>

                  {/* Customer card */}
                  <div className={clsx('bg-white rounded-xl border border-ink-200/60 shadow-sm p-3', customer ? 'flex items-center gap-3' : 'flex items-center justify-center py-4')}>
                    {customer ? (
                      <>
                        <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {customer.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-ink-900 leading-tight">{customer.name}</p>
                          <p className="text-xs text-ink-500 mt-0.5">Production order draft</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-ink-400 font-medium">No customer selected</p>
                    )}
                  </div>

                  {/* Due date */}
                  <div className="bg-white rounded-xl border border-ink-200/60 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-ink-700">
                        <Calendar size={13} className="text-ink-400" /> Due date *
                      </label>
                      {dueDate && <span className="text-xs font-bold text-brand-600">{formatDueLabel(dueDate)}</span>}
                    </div>
                    <input
                      type="date"
                      className="input !h-10 !text-sm bg-white w-full"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      {DUE_PRESETS.map(p => (
                        <button
                          key={p.label}
                          onClick={() => setDueDate(addDays(p.days))}
                          className={clsx(
                            'text-[11px] font-medium py-1.5 rounded-md border transition-colors',
                            dueDate === addDays(p.days) ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-ink-50 text-ink-600 border-transparent hover:bg-ink-100'
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {dueDate && (
                      <p className="text-[11px] text-ink-400">{daysDiff(dueDate)} days from today</p>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="bg-white rounded-xl border border-ink-200/60 shadow-sm p-4">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-ink-700 mb-3">
                      <Flag size={13} className="text-ink-400" /> Priority *
                    </label>
                    <div className="flex gap-2">
                      {['Low', 'Medium', 'High'].map(p => (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          className={clsx(
                            'flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                            p === 'Low' ? (priority === 'Low' ? 'bg-success-100 text-success-800 border-success-200' : 'bg-success-50/50 text-success-700 border-transparent hover:bg-success-100') :
                            p === 'Medium' ? (priority === 'Medium' ? 'bg-warning-100 text-warning-800 border-warning-200' : 'bg-warning-50/50 text-warning-700 border-transparent hover:bg-warning-100') :
                            (priority === 'High' ? 'bg-danger-100 text-danger-800 border-danger-200' : 'bg-danger-50/50 text-danger-700 border-transparent hover:bg-danger-100')
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Planner notes */}
                  <div className="bg-white rounded-xl border border-ink-200/60 shadow-sm p-4">
                    <label className="text-xs font-bold text-ink-700 block mb-2">Planner notes <span className="text-ink-400 font-normal">(optional)</span></label>
                    <textarea
                      className="w-full text-sm text-ink-900 bg-ink-50/40 border border-ink-200/60 rounded-lg p-3 resize-none h-[88px] placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      placeholder="Delivery instructions, shift preferences, material constraints..."
                      value={plannerNotes}
                      onChange={e => setPlannerNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 2: MODELS ─── */}
            {stepIndex === 1 && (
              <div className="flex flex-col lg:flex-row gap-5">
                {/* LEFT */}
                <div className="flex-1 min-w-0 bg-white rounded-xl border border-ink-200/60 shadow-sm flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  <div className="px-5 pt-5 pb-3 shrink-0">
                    <h2 className="text-base font-bold text-ink-900">Select models</h2>
                  </div>

                  {/* Shortcuts */}
                  <div className="px-5 pb-2 flex flex-wrap gap-2.5 shrink-0">
                    <span className="wizard-specs-shortcut"><span className="wizard-kbd">ALT</span><span className="wizard-kbd">←</span> Catalog</span>
                    <span className="wizard-specs-shortcut"><span className="wizard-kbd">ALT</span><span className="wizard-kbd">→</span> Selected</span>
                    <span className="wizard-specs-shortcut"><span className="wizard-kbd">ALT</span><span className="wizard-kbd">S</span> Search</span>
                    <span className="wizard-specs-shortcut"><span className="wizard-kbd">ALT</span><span className="wizard-kbd">↑↓</span> Lines</span>
                    <span className="wizard-specs-shortcut"><span className="wizard-kbd">+</span><span className="wizard-kbd">-</span> Qty</span>
                    <span className="wizard-specs-shortcut"><span className="wizard-kbd">ALT</span><span className="wizard-kbd">X</span> Remove</span>
                  </div>

                  {/* Search + Category */}
                  <div className="px-5 pb-3 flex items-center gap-3 shrink-0">
                    <div className="wizard-search-field flex-1">
                      <Search className="wizard-search-icon" />
                      <input
                        ref={modelSearchRef}
                        type="text"
                        className="wizard-search-input !h-10 !pl-10 !text-sm !rounded-lg"
                        placeholder="Search model name or code..."
                        value={modelQuery}
                        onChange={e => setModelQuery(e.target.value)}
                      />
                    </div>
                    <select
                      className="input !h-10 !text-sm bg-white !w-44 !rounded-lg"
                      value={modelCategory}
                      onChange={e => setModelCategory(e.target.value)}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Model List */}
                  <div ref={modelListRef} className="flex-1 overflow-y-auto border-t border-ink-100">
                    {filteredModels.map((m, idx) => {
                      const isSelected = lines.some(l => l.model.code === m.code);
                      const isFocused = focusedModelIndex === idx;
                      return (
                        <div
                          key={m.code}
                          onClick={() => handleAddLineClick(m)}
                          onMouseEnter={() => setFocusedModelIndex(idx)}
                          className={clsx(
                            'flex items-center gap-3 px-5 py-3.5 cursor-pointer border-b border-ink-100/50 transition-colors',
                            isSelected ? 'bg-brand-50' : isFocused ? 'bg-ink-50/60' : 'hover:bg-ink-50/40'
                          )}
                        >
                          <div className={clsx(
                            'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                            isSelected ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600'
                          )}>
                            {m.code.substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx('font-bold text-sm', isSelected ? 'text-brand-900' : 'text-ink-900')}>{m.name}</p>
                            <p className="text-xs text-ink-500 mt-0.5 flex items-center gap-1">
                              <span className="text-[10px]">⊙</span> {m.code} · {m.category}
                            </p>
                          </div>
                          {isSelected && <Check size={16} className="text-brand-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT: Selected */}
                <div className="w-full lg:w-[280px] shrink-0">
                  <div className="bg-white rounded-xl border border-ink-200/60 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Selected</span>
                      {lines.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-ink-500 font-medium">Qty {lines.reduce((a, b) => a + b.quantity, 0)}</span>
                          <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">{lines.length}</span>
                        </div>
                      )}
                    </div>

                    {lines.length === 0 ? (
                      <div className="py-12 flex flex-col items-center text-center text-ink-400 px-4">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 opacity-30 mb-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                        <p className="font-bold text-sm text-ink-700">No models yet</p>
                        <p className="text-xs mt-1 text-ink-400">Select a model, set qty, then adjust with + / -</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-ink-100">
                        {lines.map((line, idx) => (
                          <div key={line.model.code} className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-ink-400 w-4">{idx + 1}</span>
                              <div className="w-7 h-7 rounded-md bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                                {line.model.code.substring(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-ink-900 truncate">{line.model.name}</p>
                                <p className="text-[10px] text-ink-400 font-mono">{line.model.code}</p>
                              </div>
                              <button
                                onClick={() => { const n = [...lines]; n.splice(idx, 1); setLines(n); }}
                                className="text-ink-300 hover:text-danger-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div className="mt-2 flex items-center bg-ink-50 rounded-lg overflow-hidden border border-ink-200/60">
                              <button className="w-9 h-9 flex items-center justify-center text-ink-500 hover:bg-ink-100 font-bold text-base" onClick={() => handleUpdateLineQty(idx, -1)}>-</button>
                              <div className="flex-1 text-center font-bold text-sm text-ink-900">{line.quantity}</div>
                              <button className="w-9 h-9 flex items-center justify-center text-ink-500 hover:bg-ink-100 font-bold text-base" onClick={() => handleUpdateLineQty(idx, 1)}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 3: SPECS ─── */}
            {stepIndex === 2 && (
              <div className="bg-white rounded-xl border border-ink-200/60 shadow-sm overflow-hidden flex flex-col lg:flex-row" style={{ minHeight: 'calc(100vh - 200px)' }}>

                {/* LEFT SIDEBAR */}
                <div className="w-full lg:w-[200px] shrink-0 border-b lg:border-b-0 lg:border-r border-ink-100 flex flex-col">
                  <div className="px-3 py-3 border-b border-ink-100">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Models</p>
                    <p className="text-xs text-ink-400 mt-0.5">{activeSpecLineIndex + 1}/{lines.length}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto py-2">
                    {lines.map((line, idx) => {
                      const isActive = activeSpecLineIndex === idx;
                      return (
                        <div
                          key={line.model.code}
                          onClick={() => setActiveSpecLineIndex(idx)}
                          className={clsx(
                            'flex items-center gap-2 mx-2 px-2 py-2 rounded-lg cursor-pointer transition-colors mb-1',
                            isActive ? 'bg-brand-50 border border-brand-200/50' : 'hover:bg-ink-50'
                          )}
                        >
                          <div className={clsx('w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center shrink-0', isActive ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500')}>
                            {idx + 1}
                          </div>
                          <div className={clsx('w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center shrink-0', isActive ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-700')}>
                            {line.model.code.substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx('text-xs font-bold truncate', isActive ? 'text-brand-900' : 'text-ink-800')}>{line.model.name}</p>
                            <p className="text-[10px] text-ink-400 truncate font-mono">{line.model.code} · Qty {line.quantity}</p>
                          </div>
                          {isActive && <Check size={12} className="text-brand-500 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                  {/* Sidebar footer shortcuts */}
                  <div className="border-t border-ink-100 px-3 py-3 space-y-2">
                    <button className="flex items-center gap-2 text-xs text-ink-500 hover:text-ink-800 transition-colors w-full">
                      <Copy size={12} /> <span>Copy previous</span>
                      <span className="ml-auto wizard-kbd text-[9px]">ALT C</span>
                    </button>
                    <button className="flex items-center gap-2 text-xs text-ink-500 hover:text-ink-800 transition-colors w-full">
                      <Check size={12} /> <span>Apply to all</span>
                      <span className="ml-auto wizard-kbd text-[9px]">ALT A</span>
                    </button>
                  </div>
                </div>

                {/* MAIN SPEC AREA */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-ink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <h2 className="text-base font-bold text-ink-900">Technical specifications</h2>
                    <div className="flex flex-wrap gap-2">
                      <span className="wizard-specs-shortcut"><span className="wizard-kbd">ALT</span><span className="wizard-kbd">↓</span> Next model</span>
                      <span className="wizard-specs-shortcut"><span className="wizard-kbd">ALT</span><span className="wizard-kbd">↑</span> Previous</span>
                      <span className="wizard-specs-shortcut"><span className="wizard-kbd">1-9</span> Jump</span>
                      <span className="wizard-specs-shortcut"><span className="wizard-kbd">TAB</span> Fields</span>
                    </div>
                  </div>

                  {lines.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-ink-400 text-sm">Go back and select models first.</div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                      {/* Active model header */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {activeLine?.model?.code?.substring(0, 2)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-base text-ink-900">{activeLine?.model?.name}</h3>
                          <p className="text-xs text-ink-500 mt-0.5">{activeLine?.model?.code} · Model {activeSpecLineIndex + 1} of {lines.length} · Complete</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wide">QTY</span>
                          <div className="h-9 w-12 border border-ink-200 rounded-lg flex items-center justify-center font-bold text-sm text-ink-900 bg-ink-50">
                            {activeLine?.quantity}
                          </div>
                        </div>
                      </div>

                      {/* Appearance & Branding */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-1">Appearance &amp; Branding</p>
                        <p className="text-xs text-ink-500 mb-4">Brand Name comes from the selected customer. Panel Sticker options depend on the brand.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                          {(CUSTOMISATION_SPECS || []).slice(0, 4).map(spec => (
                            <div key={spec.key}>
                              <label className="label text-xs !mb-1.5">{spec.label} *</label>
                              <select
                                className="input !h-10 bg-white !text-sm w-full"
                                value={activeLine?.specs?.[spec.key] || ''}
                                onChange={e => handleUpdateSpec(activeSpecLineIndex, spec.key, e.target.value)}
                              >
                                {spec.options?.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Accessories & Packing */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-4">Accessories &amp; Packing</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {(CUSTOMISATION_SPECS || []).slice(4, 6).map(spec => (
                            <div key={spec.key}>
                              <label className="label text-xs !mb-2">{spec.label} *</label>
                              <div className="flex bg-ink-50 rounded-lg p-0.5 border border-ink-200/60">
                                {['Regular', 'Customise'].map(opt => (
                                  <button
                                    key={opt}
                                    onClick={() => handleUpdateSpec(activeSpecLineIndex, spec.key, opt)}
                                    className={clsx(
                                      'flex-1 h-9 rounded-md text-xs font-bold transition-all',
                                      (activeLine?.specs?.[spec.key] || 'Regular') === opt ? 'bg-brand-100 text-brand-700 shadow-sm' : 'text-ink-600 hover:bg-white'
                                    )}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                              {activeLine?.specs?.[spec.key] === 'Customise' && (
                                <div className="mt-2 border border-ink-200/60 rounded-lg bg-white overflow-hidden">
                                  <div className="border-b border-ink-100 bg-ink-50/50 p-1.5 flex gap-1">
                                    <button className="w-6 h-6 flex items-center justify-center rounded text-ink-500 hover:bg-ink-200/50 font-bold text-xs">B</button>
                                    <button className="w-6 h-6 flex items-center justify-center rounded text-ink-500 hover:bg-ink-200/50 italic text-xs">I</button>
                                    <button className="w-6 h-6 flex items-center justify-center rounded text-ink-500 hover:bg-ink-200/50 font-bold text-xs">≡</button>
                                  </div>
                                  <textarea
                                    className="w-full p-3 text-sm text-ink-900 resize-none h-20 outline-none"
                                    placeholder={`Describe ${spec.label.toLowerCase()} customisation...`}
                                    value={activeLine?.specs?.[spec.key + '_note'] || ''}
                                    onChange={e => handleUpdateSpec(activeSpecLineIndex, spec.key + '_note', e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── STEP 4: REVIEW ─── */}
            {stepIndex === 3 && (
              <div className="bg-white rounded-xl border border-ink-200/60 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-ink-100">
                  <h2 className="text-base font-bold text-ink-900">Review order</h2>
                </div>

                <div className="p-5 space-y-5">
                  {/* Customer hero row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {customer?.name?.substring(0, 2).toUpperCase() || 'NA'}
                      </div>
                      <div>
                        <p className="font-bold text-base text-ink-900">{customer?.name || 'No Customer'}</p>
                        <p className="text-xs text-ink-500">{lines.length} model · {lines.reduce((a, b) => a + b.quantity, 0)} total qty</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">DUE</p>
                        <p className="text-sm font-bold text-ink-900 mt-0.5">{dueDate ? formatDueLabel(dueDate) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">PRIORITY</p>
                        <p className={clsx(
                          'text-sm font-bold mt-0.5',
                          priority === 'Low' ? 'text-success-600' : priority === 'Medium' ? 'text-warning-600' : 'text-danger-600'
                        )}>{priority}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ready to create */}
                  <div className="bg-ink-50/60 border border-ink-100 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Ready to create</p>
                      <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">4/4</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Customer', 'Models', 'Specs', 'Schedule'].map(label => (
                        <span key={label} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                          <Check size={12} className="text-brand-500" /> {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Models & Customisation */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Models &amp; Customisation</p>
                      <p className="text-xs text-ink-400">{lines.length} line{lines.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="space-y-3">
                      {lines.map((line, idx) => (
                        <div key={idx} className="border border-ink-200/60 rounded-xl overflow-hidden">
                          {/* Row header */}
                          <div className="flex items-center gap-3 px-4 py-3 bg-ink-50/40 border-b border-ink-100">
                            <span className="text-xs font-bold text-ink-500 w-4">{idx + 1}</span>
                            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">{line.model.code.substring(0, 2)}</div>
                            <div className="flex-1">
                              <p className="font-bold text-sm text-ink-900">{line.model.name}</p>
                              <p className="text-[11px] text-ink-400 font-mono">{line.model.code}</p>
                            </div>
                            <span className="text-xs font-bold text-ink-500 bg-ink-100 px-2 py-0.5 rounded">×{line.quantity}</span>
                          </div>
                          {/* Specs display */}
                          <div className="px-4 py-4 space-y-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-3">Appearance &amp; Branding</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                                {(CUSTOMISATION_SPECS || []).slice(0, 4).map(spec => (
                                  <div key={spec.key}>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400 mb-0.5">{spec.label}</p>
                                    <p className="text-sm font-bold text-ink-900">{line.specs?.[spec.key] || '—'}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-3">Accessories &amp; Packing</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                {(CUSTOMISATION_SPECS || []).slice(4, 6).map(spec => (
                                  <div key={spec.key}>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400 mb-0.5">{spec.label}</p>
                                    <p className="text-sm font-bold text-ink-900">{line.specs?.[spec.key] || 'Regular'}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* MODALS */}
        <SetQuantityModal
          isOpen={!!modalModel}
          model={modalModel}
          onClose={() => setModalModel(null)}
          onAdd={handleModalAdd}
        />

        {/* FOOTER */}
        <div className="bg-white border-t border-ink-200/60 shrink-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              text={stepIndex === 0 ? 'Cancel' : 'Back'}
              className="!rounded-full !px-5 !font-bold"
              onClick={handleBack}
            />
            <Button
              variant="primary"
              text={stepIndex === WIZARD_STEPS.length - 1 ? 'Create order' : 'Next'}
              icon={stepIndex === WIZARD_STEPS.length - 1 ? Check : ArrowRight}
              iconPosition="right"
              className="!rounded-full !px-5 !font-bold"
              onClick={handleNext}
              disabled={!canProceed()}
            />
          </div>
        </div>

      </div>
    </>
  );
}
