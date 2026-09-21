import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Check, Copy } from 'lucide-react';
import clsx from 'clsx';
import Input from '@/common/input/Input';
import { CUSTOMISATION_SPECS } from '@/common/dummy';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

import { getBrandsByCustomerIdApi, getStickersByBrandIdApi, getPackagingsApi } from '@/lib/fetcher';

export default function SpecsStep({
  customer,
  lines,
  setLines,
  isActive,
  activeSpecLineIndex,
  setActiveSpecLineIndex
}) {
  const [brands, setBrands] = React.useState([]);
  const [stickersCache, setStickersCache] = React.useState({});
  const [packagesCache, setPackagesCache] = React.useState({});

  useEffect(() => {
    if (customer?.id) {
      getBrandsByCustomerIdApi(customer.id).then(res => {
        if (res.data?.success) setBrands(res.data.data || []);
      }).catch(console.error);
    }
  }, [customer?.id]);

  const activeLine = lines[activeSpecLineIndex];

  useEffect(() => {
    const brandId = activeLine?.specs?.brandId;
    if (brandId && !stickersCache[brandId]) {
      getStickersByBrandIdApi(brandId).then(res => {
        if (res.data?.success) {
          setStickersCache(prev => ({ ...prev, [brandId]: res.data.data || [] }));
        }
      }).catch(console.error);
    }
  }, [activeLine?.specs?.brandId, stickersCache]);

  useEffect(() => {
    const productId = activeLine?.model?.id;
    if (productId && !packagesCache[productId]) {
      getPackagingsApi(1, 100, '', productId).then(res => {
        if (res.data?.success) {
          setPackagesCache(prev => ({ ...prev, [productId]: res.data.data?.data || [] }));
        }
      }).catch(console.error);
    }
  }, [activeLine?.model?.id, packagesCache]);
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSpecLineIndex(prev => Math.min(prev + 1, lines.length - 1));
      } else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSpecLineIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, lines.length, setActiveSpecLineIndex]);

  const handleUpdateSpec = (lineIdx, key, value, options = []) => {
    const newLines = [...lines];
    newLines[lineIdx].specs[key] = value;
    
    // Also save the name for ReviewStep if options are provided
    if (options.length > 0) {
      const selectedOpt = options.find(o => o.value === value);
      if (selectedOpt) {
        newLines[lineIdx].specs[key + 'Name'] = selectedOpt.label;
      } else {
        newLines[lineIdx].specs[key + 'Name'] = '';
      }
    }

    if (key === 'brandId') {
       newLines[lineIdx].specs['stickerId'] = ''; // reset sticker when brand changes
       newLines[lineIdx].specs['stickerIdName'] = '';
    }
    setLines(newLines);
  };

  return (
    <div className="bg-white rounded-md border border-grey-border/60 shadow-sm overflow-hidden flex flex-col lg:flex-row h-full">
      {/* LEFT SIDEBAR */}
      <div className="w-full lg:w-[200px] shrink-0 border-b lg:border-b-0 lg:border-r border-grey-surface flex flex-col">
        <div className="px-3 py-3 border-b border-grey-surface">
          <p className="text-[10px] font-bold uppercase tracking-wide text-grey-muted">Models</p>
          <p className="text-xs text-grey-icon mt-0.5">{activeSpecLineIndex + 1}/{lines.length}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {lines.map((line, idx) => {
            const isLineActive = activeSpecLineIndex === idx;
            return (
              <div
                key={line.model.code}
                onClick={() => setActiveSpecLineIndex(idx)}
                className={clsx(
                  'flex items-center gap-2 mx-2 px-2 py-2 rounded-md cursor-pointer transition-colors mb-1',
                  isLineActive ? 'bg-primary-bg border border-primary-subtle/50' : 'hover:bg-grey-bg'
                )}
              >
                <div className={clsx('w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center shrink-0', isLineActive ? 'bg-primary text-white' : 'bg-grey-surface text-grey-muted')}>
                  {idx + 1}
                </div>
                <div className={clsx('w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center shrink-0', isLineActive ? 'bg-primary text-white' : 'bg-primary-subtle text-primary-dark')}>
                  {line.model.code.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-xs font-bold truncate', isLineActive ? 'text-primary-text' : 'text-grey-text-dark')}>{line.model.name}</p>
                  <p className="text-[10px] text-grey-icon truncate font-mono">{line.model.code} · Qty {line.quantity}</p>
                </div>
                {isLineActive && <Check size={12} className="text-primary-muted shrink-0" />}
              </div>
            );
          })}
        </div>
        {/* Sidebar footer shortcuts */}
        <div className="border-t border-grey-surface px-3 py-3 space-y-2">
          <button className="flex items-center gap-2 text-xs text-grey-muted hover:text-grey-text-dark transition-colors w-full">
            <Copy size={12} /> <span>Copy previous</span>
            <span className="ml-auto wizard-kbd text-[9px]">ALT C</span>
          </button>
          <button className="flex items-center gap-2 text-xs text-grey-muted hover:text-grey-text-dark transition-colors w-full">
            <Check size={12} /> <span>Apply to all</span>
            <span className="ml-auto wizard-kbd text-[9px]">ALT A</span>
          </button>
        </div>
      </div>

      {/* MAIN SPEC AREA */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-grey-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <h2 className="text-base font-bold text-grey-text-strong">Technical specifications</h2>
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5 text-xs text-grey-muted"><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">ALT</span><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">↓</span> Next model</span>
            <span className="flex items-center gap-1.5 text-xs text-grey-muted"><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">ALT</span><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">↑</span> Previous</span>
            <span className="flex items-center gap-1.5 text-xs text-grey-muted"><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">1-9</span> Jump</span>
            <span className="flex items-center gap-1.5 text-xs text-grey-muted"><span className="px-1.5 py-0.5 border border-grey-border rounded text-[10px] font-bold bg-white text-grey-text shadow-sm">TAB</span> Fields</span>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-grey-icon text-sm">Go back and select models first.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Active model header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-md bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                {activeLine?.model?.code?.substring(0, 2)}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-grey-text-strong">{activeLine?.model?.name}</h3>
                <p className="text-xs text-grey-muted mt-0.5">{activeLine?.model?.code} · Model {activeSpecLineIndex + 1} of {lines.length} · Complete</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold text-grey-icon uppercase tracking-wide">QTY</span>
                <div className="h-9 w-12 border border-grey-border rounded-md flex items-center justify-center font-bold text-sm text-grey-text-strong bg-grey-bg">
                  {activeLine?.quantity}
                </div>
              </div>
            </div>

            {/* Appearance & Branding */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-grey-icon mb-1">Appearance &amp; Branding</p>
              <p className="text-xs text-grey-muted mb-4">Brand Name comes from the selected customer. Panel Sticker options depend on the brand.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div>
                    <Input
                      type="select"
                      label="Body Design"
                      required
                      className="!text-sm"
                      value={activeLine?.specs?.bodyDesignId || ''}
                      onChange={e => handleUpdateSpec(activeSpecLineIndex, 'bodyDesignId', e.target.value, (activeLine?.model?.bodyDesigns || []).map(d => ({ label: d.name, value: d.id })))}
                      options={(activeLine?.model?.bodyDesigns || []).map(d => ({ label: d.name, value: d.id }))}
                    />
                  </div>
                  <div>
                    <Input
                      type="select"
                      label="Colour"
                      required
                      className="!text-sm"
                      value={activeLine?.specs?.colourId || ''}
                      onChange={e => handleUpdateSpec(activeSpecLineIndex, 'colourId', e.target.value, (activeLine?.model?.colours || []).map(c => ({ label: c.name, value: c.id })))}
                      options={(activeLine?.model?.colours || []).map(c => ({ label: c.name, value: c.id }))}
                    />
                  </div>
                  <div>
                    <Input
                      type="select"
                      label="Brand Name"
                      required
                      className="!text-sm"
                      value={activeLine?.specs?.brandId || ''}
                      onChange={e => handleUpdateSpec(activeSpecLineIndex, 'brandId', e.target.value, brands.map(b => ({ label: b.brandname || b.name, value: b.id })))}
                      options={brands.map(b => ({ label: b.brandname || b.name, value: b.id }))}
                    />
                  </div>
                  <div>
                    <Input
                      type="select"
                      label="Panel Sticker"
                      required
                      className="!text-sm"
                      value={activeLine?.specs?.stickerId || ''}
                      onChange={e => handleUpdateSpec(activeSpecLineIndex, 'stickerId', e.target.value, [{ label: 'Default', value: 'default' }, ...(stickersCache[activeLine?.specs?.brandId] || []).map(s => ({ label: s.name, value: s.id }))])}
                      options={[{ label: 'Default', value: 'default' }, ...(stickersCache[activeLine?.specs?.brandId] || []).map(s => ({ label: s.name, value: s.id }))]}
                    />
                  </div>
              </div>
            </div>

            {/* Accessories & Packing */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-grey-icon mb-4">Accessories &amp; Packing</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Accessories */}
                <div>
                  <label className="label text-xs !mb-2">Accessories *</label>
                  <div className="flex bg-grey-bg rounded-md p-0.5 border border-grey-border/60">
                    {['STANDARD', 'CUSTOMIZE'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleUpdateSpec(activeSpecLineIndex, 'accessoriesType', opt)}
                        className={clsx(
                          'flex-1 h-9 rounded-md text-xs font-bold transition-all',
                          (activeLine?.specs?.accessoriesType || 'STANDARD') === opt ? 'bg-primary-subtle text-primary-dark shadow-sm' : 'text-grey-text-light hover:bg-white'
                        )}
                      >
                        {opt === 'STANDARD' ? 'Regular' : 'Customise'}
                      </button>
                    ))}
                  </div>
                  {activeLine?.specs?.accessoriesType === 'CUSTOMIZE' && (
                    <div className="mt-2 rounded-md bg-white overflow-hidden [&_.ql-toolbar]:bg-grey-bg/50 [&_.ql-toolbar]:border-grey-border/60 [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:border-grey-border/60 [&_.ql-container]:rounded-b-md [&_.ql-editor]:min-h-[80px] [&_.ql-editor]:text-sm">
                      <ReactQuill
                        theme="snow"
                        value={activeLine?.specs?.accessoriesNote || ''}
                        onChange={value => handleUpdateSpec(activeSpecLineIndex, 'accessoriesNote', value)}
                        placeholder={`Describe accessories customisation...`}
                        modules={{
                          toolbar: [
                            ['bold', 'italic'],
                            [{ 'list': 'bullet' }]
                          ],
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Packing */}
                <div>
                  <label className="label text-xs !mb-2">Packing *</label>
                  <div className="flex bg-grey-bg rounded-md p-0.5 border border-grey-border/60 mb-2">
                    {['STANDARD', 'CUSTOMIZE'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleUpdateSpec(activeSpecLineIndex, 'packingType', opt)}
                        className={clsx(
                          'flex-1 h-9 rounded-md text-xs font-bold transition-all',
                          (activeLine?.specs?.packingType || 'STANDARD') === opt ? 'bg-primary-subtle text-primary-dark shadow-sm' : 'text-grey-text-light hover:bg-white'
                        )}
                      >
                        {opt === 'STANDARD' ? 'Regular' : 'Customise'}
                      </button>
                    ))}
                  </div>
                  {activeLine?.specs?.packingType === 'CUSTOMIZE' ? (
                    <div className="rounded-md bg-white overflow-hidden [&_.ql-toolbar]:bg-grey-bg/50 [&_.ql-toolbar]:border-grey-border/60 [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:border-grey-border/60 [&_.ql-container]:rounded-b-md [&_.ql-editor]:min-h-[80px] [&_.ql-editor]:text-sm">
                      <ReactQuill
                        theme="snow"
                        value={activeLine?.specs?.packingNote || ''}
                        onChange={value => handleUpdateSpec(activeSpecLineIndex, 'packingNote', value)}
                        placeholder={`Describe packing customisation...`}
                        modules={{
                          toolbar: [
                            ['bold', 'italic'],
                            [{ 'list': 'bullet' }]
                          ],
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <Input
                        type="select"
                        required
                        className="!text-sm"
                        value={activeLine?.specs?.packagingId || ''}
                        onChange={e => handleUpdateSpec(activeSpecLineIndex, 'packagingId', e.target.value, (packagesCache[activeLine?.model?.id] || []).map(p => ({ label: p.name, value: p.id })))}
                        options={(packagesCache[activeLine?.model?.id] || []).map(p => ({ label: p.name, value: p.id }))}
                        placeholder="Select Standard Package"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
