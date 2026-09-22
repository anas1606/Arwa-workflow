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
  const isLineComplete = (line) => {
    return !!(
      line.specs?.bodyDesignId &&
      line.specs?.colourId &&
      line.specs?.brandId &&
      line.specs?.stickerId &&
      (line.specs?.packingType === 'CUSTOMIZE' || line.specs?.packagingId)
    );
  };

  const handleCopyPrevious = React.useCallback(() => {
    if (activeSpecLineIndex === 0) return;
    const prevLine = lines[activeSpecLineIndex - 1];
    const newLines = [...lines];
    newLines[activeSpecLineIndex] = {
      ...newLines[activeSpecLineIndex],
      specs: {
        ...newLines[activeSpecLineIndex].specs,
        brandId: prevLine.specs.brandId,
        brandIdName: prevLine.specs.brandIdName,
        stickerId: prevLine.specs.stickerId,
        stickerIdName: prevLine.specs.stickerIdName,
        accessoriesType: prevLine.specs.accessoriesType,
        accessoriesNote: prevLine.specs.accessoriesNote,
      }
    };
    setLines(newLines);
  }, [activeSpecLineIndex, lines, setLines]);

  const handleApplyToAll = React.useCallback(() => {
    const activeLineSpecs = lines[activeSpecLineIndex].specs;
    const newLines = lines.map((line, idx) => {
      if (idx === activeSpecLineIndex) return line;
      return {
        ...line,
        specs: {
          ...line.specs,
          brandId: activeLineSpecs.brandId,
          brandIdName: activeLineSpecs.brandIdName,
          stickerId: activeLineSpecs.stickerId,
          stickerIdName: activeLineSpecs.stickerIdName,
          accessoriesType: activeLineSpecs.accessoriesType,
          accessoriesNote: activeLineSpecs.accessoriesNote,
        }
      };
    });
    setLines(newLines);
  }, [activeSpecLineIndex, lines, setLines]);

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSpecLineIndex(prev => Math.min(prev + 1, lines.length - 1));
      } else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSpecLineIndex(prev => Math.max(prev - 1, 0));
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleCopyPrevious();
      } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleApplyToAll();
      } else if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (idx < lines.length) setActiveSpecLineIndex(idx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, lines.length, setActiveSpecLineIndex, handleCopyPrevious, handleApplyToAll]);

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
    <div className="h-full flex flex-col bg-[#f4f7f9] p-4 lg:p-6 rounded-xl">
      {/* Page Title */}
      <div className="pb-4 shrink-0">
        <h2 className="text-[15px] font-bold text-grey-text-strong">Technical specifications</h2>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5">
        {/* LEFT SIDEBAR */}
        <div className="w-full lg:w-[280px] shrink-0 bg-white rounded-[12px] border border-grey-border/40 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden p-4">
          <div className="mb-4 pb-4 border-b border-grey-border/40">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-grey-text-strong">Models</p>
              <p className="text-[11px] font-bold text-grey-text-strong">{lines.filter(isLineComplete).length}/{lines.length}</p>
            </div>
            <div className="h-1.5 w-full bg-grey-bg rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300" 
                style={{ width: `${(lines.filter(isLineComplete).length / Math.max(1, lines.length)) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {lines.map((line, idx) => {
              const isLineActive = activeSpecLineIndex === idx;
              return (
                <div
                  key={line.model.code}
                  onClick={() => setActiveSpecLineIndex(idx)}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border',
                    isLineActive ? 'bg-[#f4f7ff] border-primary shadow-sm' : 'bg-white border-grey-border/40 hover:bg-grey-bg/50 hover:border-grey-border/60'
                  )}
                >
                  <div className={clsx('w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0', isLineActive ? 'bg-primary text-white' : 'bg-grey-bg text-grey-muted border border-grey-border/60')}>
                    {idx + 1}
                  </div>
                  <div className={clsx('w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 text-white shadow-sm', isLineActive ? 'bg-primary' : 'bg-grey-icon/60')}>
                    {line.model.code.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-[13px] font-bold truncate', isLineActive ? 'text-primary-dark' : 'text-grey-text-strong')}>{line.model.name}</p>
                    <p className="text-[10px] text-grey-icon truncate mt-0.5 font-mono">{line.model.code} · Qty {line.quantity}</p>
                  </div>
                  {isLineComplete(line) && <Check size={14} className="text-[#34d399] shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Sidebar footer shortcuts */}
          <div className="pt-4 mt-2 border-t border-grey-surface flex flex-col gap-2">
            <button 
              onClick={handleCopyPrevious} 
              disabled={activeSpecLineIndex === 0}
              className="flex items-center justify-between px-3 py-2.5 text-xs font-bold text-grey-text-dark bg-white border border-grey-border/80 rounded-lg hover:bg-grey-bg transition-colors w-full shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2"><Copy size={14} className="text-grey-icon" /> Copy previous</span>
              <span className="text-[10px] text-grey-muted">ALT C</span>
            </button>
            <button 
              onClick={handleApplyToAll} 
              disabled={lines.length <= 1}
              className="flex items-center justify-between px-3 py-2.5 text-xs font-bold text-grey-text-dark bg-white border border-grey-border/80 rounded-lg hover:bg-grey-bg transition-colors w-full shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2"><Check size={14} className="text-grey-icon" /> Apply to all</span>
              <span className="text-[10px] text-grey-muted">ALT A</span>
            </button>
          </div>
        </div>

        {/* MAIN SPEC AREA */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Top shortcuts */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-[12px] border border-grey-border/40 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
            <span className="flex items-center gap-1.5 text-[10px] text-grey-muted font-medium"><span className="px-1.5 py-0.5 border border-grey-border/80 rounded-[4px] text-[9px] font-bold bg-white text-grey-icon shadow-sm">ALT</span><span className="px-1.5 py-0.5 border border-grey-border/80 rounded-[4px] text-[9px] font-bold bg-white text-grey-icon shadow-sm">↓</span> Next model</span>
            <span className="flex items-center gap-1.5 text-[10px] text-grey-muted font-medium"><span className="px-1.5 py-0.5 border border-grey-border/80 rounded-[4px] text-[9px] font-bold bg-white text-grey-icon shadow-sm">ALT</span><span className="px-1.5 py-0.5 border border-grey-border/80 rounded-[4px] text-[9px] font-bold bg-white text-grey-icon shadow-sm">↑</span> Previous</span>
            <span className="flex items-center gap-1.5 text-[10px] text-grey-muted font-medium"><span className="px-1.5 py-0.5 border border-grey-border/80 rounded-[4px] text-[9px] font-bold bg-white text-grey-icon shadow-sm">ALT</span><span className="px-1.5 py-0.5 border border-grey-border/80 rounded-[4px] text-[9px] font-bold bg-white text-grey-icon shadow-sm">1-9</span> Jump</span>
            <span className="flex items-center gap-1.5 text-[10px] text-grey-muted font-medium"><span className="px-1.5 py-0.5 border border-grey-border/80 rounded-[4px] text-[9px] font-bold bg-white text-grey-icon shadow-sm">TAB</span> Fields</span>
          </div>

          {lines.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-grey-icon text-sm bg-white rounded-[12px] border border-grey-border/40 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">Go back and select models first.</div>
          ) : (
            <>
              {/* Main Body */}
              <div className="flex-1 overflow-y-auto bg-white rounded-[12px] border border-grey-border/40 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] p-6 space-y-8 pr-4">
              {/* Active model header */}
              <div className="flex items-center gap-4">
                <div className="w-[42px] h-[42px] rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                  {activeLine?.model?.code?.substring(0, 2)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[17px] text-grey-text-strong tracking-tight">{activeLine?.model?.name}</h3>
                  <p className="text-[11px] font-medium text-grey-muted mt-0.5">{activeLine?.model?.code} · Model {activeSpecLineIndex + 1} of {lines.length} · {isLineComplete(activeLine) ? 'Complete' : 'Incomplete'}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-grey-icon uppercase tracking-wide">QTY</span>
                  <div className="h-9 w-16 border border-grey-border/80 rounded-lg flex items-center justify-center font-bold text-sm text-grey-text-strong bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    {activeLine?.quantity}
                  </div>
                </div>
              </div>

              {/* Appearance & Branding */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-grey-text-strong mb-1">Appearance &amp; Branding</p>
                <p className="text-xs text-grey-muted mb-5">Brand Name comes from the selected customer. Panel Sticker options depend on the brand.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    <div>
                      <Input
                        type="select"
                        label="Body Design"
                        required
                        className="!text-sm bg-white"
                        value={activeLine?.specs?.bodyDesignId || ''}
                        onChange={e => handleUpdateSpec(activeSpecLineIndex, 'bodyDesignId', e.target.value, (activeLine?.model?.bodyDesigns || []).map(d => ({ label: d.name, value: d.id })))}
                        options={(activeLine?.model?.bodyDesigns || []).map(d => ({ label: d.name, value: d.id }))}
                      />
                    </div>
                    <div>
                      <Input
                        type="select"
                        label="Body Color"
                        required
                        className="!text-sm bg-white"
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
                        className="!text-sm bg-white"
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
                        className="!text-sm bg-white"
                        value={activeLine?.specs?.stickerId || ''}
                        onChange={e => handleUpdateSpec(activeSpecLineIndex, 'stickerId', e.target.value, [{ label: 'None', value: 'default' }, ...(stickersCache[activeLine?.specs?.brandId] || []).map(s => ({ label: s.name, value: s.id }))])}
                        options={[{ label: 'None', value: 'default' }, ...(stickersCache[activeLine?.specs?.brandId] || []).map(s => ({ label: s.name, value: s.id }))]}
                      />
                    </div>
                </div>
              </div>

              {/* Accessories & Packing */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-grey-text-strong mb-4">Accessories &amp; Packing</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Accessories */}
                  <div>
                    <label className="label text-[11px] font-bold text-grey-text-strong !mb-2">Accessories *</label>
                    <div className="flex bg-white rounded-lg p-1 border border-grey-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                      {['STANDARD', 'CUSTOMIZE'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleUpdateSpec(activeSpecLineIndex, 'accessoriesType', opt)}
                          className={clsx(
                            'flex-1 h-9 rounded-md text-[13px] font-bold transition-all',
                            (activeLine?.specs?.accessoriesType || 'STANDARD') === opt ? 'bg-[#eef2ff] text-primary shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'text-grey-text-light hover:bg-grey-bg/50'
                          )}
                        >
                          {opt === 'STANDARD' ? 'Regular' : 'Customise'}
                        </button>
                      ))}
                    </div>
                    {activeLine?.specs?.accessoriesType === 'CUSTOMIZE' && (
                      <div className="mt-3 rounded-lg bg-white overflow-hidden [&_.ql-toolbar]:bg-grey-bg/50 [&_.ql-toolbar]:border-grey-border/60 [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:border-grey-border/60 [&_.ql-container]:rounded-b-lg [&_.ql-editor]:min-h-[80px] [&_.ql-editor]:text-sm shadow-sm border border-grey-border/60">
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
                    <label className="label text-[11px] font-bold text-grey-text-strong !mb-2">Packing *</label>
                    <div className="flex bg-white rounded-lg p-1 border border-grey-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] mb-3">
                      {['STANDARD', 'CUSTOMIZE'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleUpdateSpec(activeSpecLineIndex, 'packingType', opt)}
                          className={clsx(
                            'flex-1 h-9 rounded-md text-[13px] font-bold transition-all',
                            (activeLine?.specs?.packingType || 'STANDARD') === opt ? 'bg-[#eef2ff] text-primary shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'text-grey-text-light hover:bg-grey-bg/50'
                          )}
                        >
                          {opt === 'STANDARD' ? 'Regular' : 'Customise'}
                        </button>
                      ))}
                    </div>
                    {activeLine?.specs?.packingType === 'CUSTOMIZE' ? (
                      <div className="rounded-lg bg-white overflow-hidden [&_.ql-toolbar]:bg-grey-bg/50 [&_.ql-toolbar]:border-grey-border/60 [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:border-grey-border/60 [&_.ql-container]:rounded-b-lg [&_.ql-editor]:min-h-[80px] [&_.ql-editor]:text-sm shadow-sm">
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
                          className="!text-sm bg-white"
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
              
              {/* Bottom Nav */}
              {lines.length > 1 && (
                <div className="bg-white rounded-[12px] border border-grey-border/40 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] p-4 flex items-center justify-between shrink-0 mt-2">
                  <button 
                    onClick={() => setActiveSpecLineIndex(prev => Math.max(prev - 1, 0))} 
                    disabled={activeSpecLineIndex === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-transparent text-[13px] font-bold text-grey-text-strong rounded-lg disabled:opacity-30 transition-colors hover:bg-grey-bg"
                  >
                    ← Previous <span className="text-[10px] text-grey-muted bg-white border border-grey-border rounded px-1 hidden sm:inline-block shadow-sm">ALT ↑</span>
                  </button>
                  <span className="text-[11px] font-bold text-primary">{activeSpecLineIndex + 1} / {lines.length}</span>
                  <button 
                    onClick={() => setActiveSpecLineIndex(prev => Math.min(prev + 1, lines.length - 1))} 
                    disabled={activeSpecLineIndex === lines.length - 1}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-[13px] font-bold text-white rounded-[8px] disabled:opacity-50 transition-colors hover:bg-primary-dark shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                  >
                    Next model → <span className="text-[10px] text-primary-muted bg-white/20 rounded px-1 hidden sm:inline-block">ALT ↓</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
