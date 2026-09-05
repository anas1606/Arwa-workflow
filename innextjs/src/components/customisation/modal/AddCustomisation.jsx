import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { CUSTOMISATION_SPECS, MODEL_OPTION_KEYS, MODEL_CATEGORIES } from '@/common/dummy';

const FIXED_CUSTOMISE_OPTIONS = ['Regular', 'Customise'];
const MODEL_OPTION_KEY_SET = new Set(MODEL_OPTION_KEYS);

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

function OptionChipsEditor({ label, values, onChange, emptyHint }) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState(null);
  const addOption = () => {
    const value = draft.trim();
    if (!value) return;
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) { setLocalError('Option already exists.'); return; }
    onChange([...values, value]); setDraft(''); setLocalError(null);
  };
  const onKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } };
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="text-xs font-semibold text-ink-700">{label}</label>
        <span className="text-2xs tabular-nums text-ink-400">{values.length} option{values.length === 1 ? '' : 's'}</span>
      </div>
      <div className="rounded-md border border-ink-200/70 bg-ink-50/40 p-2">
        {values.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {values.map((opt) => (
              <span key={opt} className="inline-flex max-w-full items-center gap-1 rounded-md border border-ink-200/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-ink-800">
                <span className="truncate">{opt}</span>
                <Button variant="ghost" size="sm"
                  className="!min-h-0 !h-4 !w-4 !min-w-0 !p-0 shrink-0 rounded-md text-ink-400 hover:text-ink-800"
                  onClick={() => { onChange(values.filter((v) => v !== opt)); setLocalError(null); }}
                  icon={() => <X className="h-3 w-3" />} />
              </span>
            ))}
          </div>
        ) : (
          <p className="text-2xs text-ink-400 mb-2">{emptyHint ?? 'No options yet — add one below.'}</p>
        )}
        <div className="flex gap-1.5">
          <Input type="text" value={draft}
            onChange={(e) => { setDraft(e.target.value); if (localError) setLocalError(null); }}
            onKeyDown={onKeyDown} placeholder="Type option, press Enter"
            className="flex-1 min-w-0 [&_input]:!h-8 [&_input]:!min-h-0" />
          <Button variant="secondary" size="sm" className="shrink-0 px-2.5 !min-h-8" onClick={addOption} disabled={!draft.trim()} icon={Plus} />
        </div>
        {localError && <p className="mt-1 text-2xs text-danger-700">{localError}</p>}
      </div>
    </div>
  );
}

function FixedCustomiseField({ label }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-700 mb-1">{label}</p>
      <div className="rounded-md border border-ink-200/70 bg-ink-50/40 p-2">
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {FIXED_CUSTOMISE_OPTIONS.map((opt) => (
            <span key={opt} className="inline-flex rounded-md border border-ink-200/70 bg-white px-1.5 py-0.5 text-2xs font-medium text-ink-800">{opt}</span>
          ))}
        </div>
        <p className="text-2xs text-ink-500">Fixed choices. Customise opens a detail field on the order Specs step.</p>
      </div>
    </div>
  );
}

export default function AddCustomisation({ open, onClose, onAdd }) {
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState(MODEL_CATEGORIES[0] ?? '');
  const [options, setOptions] = useState(() => {
    const o = {};
    for (const key of MODEL_OPTION_KEYS) { o[key] = []; }
    return o;
  });

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

  const reset = () => {
    setName(''); setCode(''); setCategory(MODEL_CATEGORIES[0] ?? ''); setError(null);
    const o = {};
    for (const key of MODEL_OPTION_KEYS) { o[key] = []; }
    setOptions(o);
  };

  const handleClose = () => { reset(); onClose(); };

  useEffect(() => {
    if (!shouldRender) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    const onKeyDown = (e) => { if (e.key === 'Escape') { e.preventDefault(); handleClose(); } };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [shouldRender]);

  const setOptionValues = (key, next) => { setOptions((prev) => ({ ...prev, [key]: next })); };

  const submit = (e) => {
    e.preventDefault();
    const n = name.trim(), c = code.trim().toUpperCase(), cat = category.trim();
    if (!n) return setError('Model name is required.');
    if (!c) return setError('Model code is required.');
    if (!cat) return setError('Category is required.');
    for (const key of MODEL_OPTION_KEYS) {
      const field = CUSTOMISATION_SPECS.find((s) => s.key === key);
      if ((options[key] ?? []).length === 0) return setError(`Add at least one option for ${field?.label ?? key}.`);
    }
    const specs = CUSTOMISATION_SPECS.map((template) => {
      if (template.type === 'customise') return { ...template, options: [...FIXED_CUSTOMISE_OPTIONS] };
      if (MODEL_OPTION_KEY_SET.has(template.key)) return { ...template, options: [...(options[template.key] ?? [])] };
      return { ...template, options: [] };
    });
    onAdd({ id: `m-${Date.now()}`, name: n, code: c, category: cat, specs });
    reset();
  };

  const modelFields = CUSTOMISATION_SPECS.filter((f) => MODEL_OPTION_KEY_SET.has(f.key));
  const fixedFields = CUSTOMISATION_SPECS.filter((f) => f.type === 'customise');

  if (!shouldRender) return null;
  const root = getModalRoot();
  if (!root) return null;

  return createPortal(
    <div className="app-modal-layer" role="presentation">
      <button
        type="button"
        className={`app-modal-backdrop ${isAnimatingOut ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}`}
        aria-label="Close dialog"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-modal-panel bg-white shadow-2xl rounded-md border border-ink-200 ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-xl w-full`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ink-200 px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-ink-900">Add model</h2>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-md p-0 flex items-center justify-center transition-colors hover:bg-ink-50 text-ink-500 hover:text-ink-900"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <form id="add-model-form" className="space-y-4" onSubmit={submit}>
            {error && <p className="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-800" role="alert">{error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input type="text" label="Model name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Steel Frame Assembly" autoFocus />
              </div>
              <Input type="text" label="Code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SFA-100" maxLength={16} className="font-mono uppercase" />
              <Input type="text" label="Category" required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Structural" list="config-category-list" />
              <datalist id="config-category-list">
                {MODEL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div className="border-t border-ink-200/50 pt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Model specification options
              </p>
              <p className="mb-3 text-2xs text-ink-500">
                Body Design and Body Color are configured per product model.
              </p>
              <div className="grid gap-3">
                {modelFields.map((field) => (
                  <OptionChipsEditor key={field.key} label={field.label} values={options[field.key] ?? []} onChange={(next) => setOptionValues(field.key, next)} />
                ))}
              </div>
            </div>

            <div className="rounded-md border border-brand-600/15 bg-brand-600/5 px-3 py-2.5">
              <p className="text-xs font-semibold text-brand-900">Brand & panel sticker</p>
              <p className="mt-0.5 text-2xs leading-snug text-ink-600">
                Brand Name is linked to the customer. Panel Sticker options belong to
                each brand. Manage them in Customer brands below.
              </p>
            </div>

            <div className="border-t border-ink-200/50 pt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Accessories & packing
              </p>
              <p className="mb-3 text-2xs text-ink-500">
                Fixed choices. Customise opens a detail field on the order Specs step.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {fixedFields.map((field) => (<FixedCustomiseField key={field.key} label={field.label} />))}
              </div>
            </div>
          </form>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-ink-200 px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" />
          <Button variant="primary" type="submit" form="add-model-form" className="flex-1" text="Add model" />
        </div>
      </div>
    </div>,
    root
  );
}
