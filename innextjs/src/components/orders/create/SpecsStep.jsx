import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Check, Copy } from 'lucide-react';
import clsx from 'clsx';
import Input from '@/common/input/Input';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import { CUSTOMISATION_SPECS } from '@/common/dummy';
import { useKeyboardShortcuts, KeyboardShortcutBar } from '@/common/KeyboardShortcut';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

import { getBrandsApi, getStickersApi, getStickersByBrandIdApi, getPackagingsApi, getBodyDesignsApi, getColoursApi, getSettingsListApi } from '@/lib/fetcher';

export default function SpecsStep({
  customer,
  lines,
  setLines,
  isActive,
  activeSpecLineIndex,
  setActiveSpecLineIndex
}) {
  const activeLine = lines[activeSpecLineIndex];

  // Global Settings for defaults
  const [defaultStickerLabel, setDefaultStickerLabel] = React.useState('Loading default sticker...');
  const [defaultPackagingLabel, setDefaultPackagingLabel] = React.useState('Loading default packaging...');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getSettingsListApi(1, 100);
        if (res.data?.success) {
          const settings = res.data.data.data;
          const stickerSetting = settings.find(s => s.key === 'DEFAULT_STICKER_LABEL');
          const packagingSetting = settings.find(s => s.key === 'DEFAULT_PACKAGING_LABEL');
          
          setDefaultStickerLabel(stickerSetting ? stickerSetting.value : 'Error: Sticker Default Missing');
          setDefaultPackagingLabel(packagingSetting ? packagingSetting.value : 'Error: Packaging Default Missing');
        } else {
          setDefaultStickerLabel('Error: Failed to load settings');
          setDefaultPackagingLabel('Error: Failed to load settings');
        }
      } catch (err) { 
        console.error('Failed to fetch settings:', err); 
        setDefaultStickerLabel('Error: Failed to load settings');
        setDefaultPackagingLabel('Error: Failed to load settings');
      }
    };
    fetchSettings();
  }, []);

  const loadBodyDesignOptions = React.useCallback(async (inputValue, productId) => {
    if (!productId) return [];
    try {
      const res = await getBodyDesignsApi(1, 10, inputValue, productId, true);
      if (res.data?.success) {
        return (res.data.data || []).map(d => ({ label: d.name, value: d.id }));
      }
    } catch (err) { console.error(err); }
    return [];
  }, []);

  const loadColourOptions = React.useCallback(async (inputValue, productId) => {
    if (!productId) return [];
    try {
      const res = await getColoursApi(1, 10, inputValue, productId, true);
      if (res.data?.success) {
        return (res.data.data || []).map(c => ({ label: c.name, value: c.id }));
      }
    } catch (err) { console.error(err); }
    return [];
  }, []);

  const loadBrandOptions = React.useCallback(async (inputValue, customerId) => {
    if (!customerId) return [];
    try {
      const res = await getBrandsApi(1, 10, inputValue, customerId, true);
      if (res.data?.success) {
        return (res.data.data.data || []).map(b => ({ label: b.brandname || b.name, value: b.id }));
      }
    } catch (err) { console.error(err); }
    return [];
  }, []);

  const loadStickerOptions = React.useCallback(async (inputValue, brandId) => {
    if (!brandId) return [{ label: defaultStickerLabel, value: 'default' }];
    try {
      const res = await getStickersByBrandIdApi(brandId);
      if (res.data?.success) {
        let stickers = res.data.data || [];
        if (inputValue) {
          stickers = stickers.filter(s => s.name.toLowerCase().includes(inputValue.toLowerCase()));
        }
        return [{ label: defaultStickerLabel, value: 'default' }, ...stickers.map(s => ({ label: s.name, value: s.id }))];
      }
    } catch (err) { console.error(err); }
    return [{ label: defaultStickerLabel, value: 'default' }];
  }, [defaultStickerLabel]);

  const loadPackagingOptions = React.useCallback(async (inputValue, customerId) => {
    if (!customerId) return [{ label: defaultPackagingLabel, value: 'default' }];
    try {
      const res = await getPackagingsApi(1, 10, inputValue, customerId, true);
      if (res.data?.success) {
        let pkgs = (res.data.data.data || []).map(p => ({ label: p.name, value: p.id }));
        return [{ label: defaultPackagingLabel, value: 'default' }, ...pkgs];
      }
    } catch (err) { console.error(err); }
    return [{ label: defaultPackagingLabel, value: 'default' }];
  }, [defaultPackagingLabel]);

  const isLineComplete = (line) => {
    const isAccessoriesValid = (!line.specs?.accessoriesType || line.specs?.accessoriesType === 'STANDARD') ||
      (line.specs?.accessoriesType === 'CUSTOMIZE' && line.specs?.accessoriesNote && line.specs.accessoriesNote.replace(/<[^>]*>?/gm, '').trim() !== '');
      
    const isPackingValid = (!line.specs?.packingType || line.specs?.packingType === 'STANDARD') ? !!line.specs?.packagingId :
      (line.specs?.packingType === 'CUSTOMIZE' && line.specs?.packingNote && line.specs.packingNote.replace(/<[^>]*>?/gm, '').trim() !== '');

    return !!(
      line.specs?.bodyDesignId &&
      line.specs?.colourId &&
      line.specs?.brandId &&
      line.specs?.stickerId &&
      isAccessoriesValid &&
      isPackingValid
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
        packingType: prevLine.specs.packingType,
        packingNote: prevLine.specs.packingNote,
        packagingId: prevLine.specs.packagingId,
        packagingIdName: prevLine.specs.packagingIdName,
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
          packingType: activeLineSpecs.packingType,
          packingNote: activeLineSpecs.packingNote,
          packagingId: activeLineSpecs.packagingId,
          packagingIdName: activeLineSpecs.packagingIdName,
        }
      };
    });
    setLines(newLines);
  }, [activeSpecLineIndex, lines, setLines]);

  const customShortcuts = [
    { key: 'ArrowDown', altKey: true, action: () => {
      setActiveSpecLineIndex(prev => {
        const next = Math.min(prev + 1, lines.length - 1);
        setTimeout(() => document.getElementById(`spec-line-${next}`)?.focus(), 50);
        return next;
      });
    }},
    { key: 'ArrowUp', altKey: true, action: () => {
      setActiveSpecLineIndex(prev => {
        const next = Math.max(prev - 1, 0);
        setTimeout(() => document.getElementById(`spec-line-${next}`)?.focus(), 50);
        return next;
      });
    }},
    { key: 'ArrowRight', altKey: true, action: () => document.getElementById('body-design-input')?.focus() },
    { key: 'ArrowLeft', altKey: true, action: () => document.getElementById(`spec-line-${activeSpecLineIndex}`)?.focus() },
    { key: 'c', altKey: true, action: () => handleCopyPrevious() },
    { key: 'a', altKey: true, action: () => handleApplyToAll() }
  ];
  for (let i = 1; i <= 9; i++) {
    customShortcuts.push({
      key: i.toString(),
      altKey: true,
      action: () => {
        const idx = i - 1;
        if (idx < lines.length) setActiveSpecLineIndex(idx);
      }
    });
  }

  useKeyboardShortcuts({
    customShortcuts
  });

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
    <div className="h-full flex flex-col bg-[#f4f7f9] p-2 rounded-xl">
      {/* Page Title */}
      <div className="pb-2 shrink-0">
        <h2 className="text-[15px] font-bold text-grey-text-strong">Technical specifications</h2>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5">
        {/* LEFT SIDEBAR */}
        <div className="w-full lg:w-[280px] shrink-0 bg-white rounded-[12px] border border-grey-border/40 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden p-2">
          <div className="mb-2 pb-2 border-b border-grey-border/40">
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
                  id={`spec-line-${idx}`}
                  tabIndex={-1}
                  key={line.model.id}
                  onClick={() => setActiveSpecLineIndex(idx)}
                  className={clsx(
                    'flex items-center gap-3 py-1 px-2 rounded-xl cursor-pointer transition-all border outline-none focus:ring-2 focus:ring-primary/50',
                    isLineActive ? 'bg-[#f4f7ff] border-primary shadow-sm' : 'bg-white border-grey-border/40 hover:bg-grey-bg/50 hover:border-grey-border/60'
                  )}
                >
                  <div className={clsx('w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0', isLineActive ? 'bg-primary text-white' : 'bg-grey-bg text-grey-muted border border-grey-border/60')}>
                    {idx + 1}
                  </div>
                  <div className={clsx('w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 text-white shadow-sm', isLineActive ? 'bg-primary' : 'bg-grey-icon/60')}>
                    {(line.model.code || line.model.name || 'NA').substring(0, 2)}
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
          <div className="pt-2 mt-2 border-t border-grey-surface flex flex-col gap-2">
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
          <div className="shrink-0 mb-3">
            <KeyboardShortcutBar 
              customActions={[
                { label: 'Next model', keyCombo: ['Alt', '↓'] },
                { label: 'Previous', keyCombo: ['Alt', '↑'] },
                { label: 'Jump', keyCombo: ['Alt', '1-9'] },
                { label: 'Fields', keyCombo: ['Tab'] }
              ]}
            />
          </div>

          {lines.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-grey-icon text-sm bg-white rounded-[12px] border border-grey-border/40 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">Go back and select models first.</div>
          ) : (
            <>
              {/* Main Body */}
              <div className="flex-1 overflow-y-auto bg-white rounded-[12px] border border-grey-border/40 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] p-3 space-y-3 ">
              {/* Active model header */}
              <div className="flex items-center gap-4">
                <div className="w-[42px] h-[42px] rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                  {(activeLine?.model?.code || activeLine?.model?.name || 'NA').substring(0, 2)}
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
                <p className="text-xs text-grey-muted mb-2">Brand Name comes from the selected customer. Panel Sticker options depend on the brand.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    <div>
                      <AsyncSelectInput
                        id="body-design-input"
                        label="Body Design"
                        required
                        className="!text-sm bg-white"
                        value={activeLine?.specs?.bodyDesignId ? { label: activeLine?.specs?.bodyDesignIdName || 'Selected', value: activeLine?.specs?.bodyDesignId } : null}
                        onChange={opt => handleUpdateSpec(activeSpecLineIndex, 'bodyDesignId', opt?.value || '', opt ? [opt] : [])}
                        loadOptions={(inputValue) => loadBodyDesignOptions(inputValue, activeLine?.model?.id)}
                        defaultOptions={true}
                        key={`bodyDesign-${activeLine?.model?.id}`}
                      />
                    </div>
                    <div>
                      <AsyncSelectInput
                        label="Body Color"
                        required
                        className="!text-sm bg-white"
                        value={activeLine?.specs?.colourId ? { label: activeLine?.specs?.colourIdName || 'Selected', value: activeLine?.specs?.colourId } : null}
                        onChange={opt => handleUpdateSpec(activeSpecLineIndex, 'colourId', opt?.value || '', opt ? [opt] : [])}
                        loadOptions={(inputValue) => loadColourOptions(inputValue, activeLine?.model?.id)}
                        defaultOptions={true}
                        key={`colour-${activeLine?.model?.id}`}
                      />
                    </div>
                    <div>
                      <AsyncSelectInput
                        label="Brand Name"
                        required
                        className="!text-sm bg-white"
                        value={activeLine?.specs?.brandId ? { label: activeLine?.specs?.brandIdName || 'Selected', value: activeLine?.specs?.brandId } : null}
                        onChange={opt => handleUpdateSpec(activeSpecLineIndex, 'brandId', opt?.value || '', opt ? [opt] : [])}
                        loadOptions={(inputValue) => loadBrandOptions(inputValue, customer?.id)}
                        defaultOptions={true}
                        key={`brand-${customer?.id}`}
                      />
                    </div>
                    <div>
                      <AsyncSelectInput
                        label="Panel Sticker"
                        required
                        className="!text-sm bg-white"
                        value={activeLine?.specs?.stickerId ? { label: activeLine?.specs?.stickerIdName || 'Selected', value: activeLine?.specs?.stickerId } : null}
                        onChange={opt => handleUpdateSpec(activeSpecLineIndex, 'stickerId', opt?.value || '', opt ? [opt] : [])}
                        loadOptions={(inputValue) => loadStickerOptions(inputValue, activeLine?.specs?.brandId)}
                        defaultOptions={true}
                        key={`sticker-${activeLine?.specs?.brandId}-${defaultStickerLabel}`}
                      />
                    </div>
                </div>
              </div>

              {/* Accessories & Packing */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-grey-text-strong ">Accessories &amp; Packing</p>
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
                            'flex-1 h-9 rounded-xl text-[13px] font-bold transition-all',
                            (activeLine?.specs?.accessoriesType || 'STANDARD') === opt ? 'bg-[#eef2ff] text-primary shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'text-grey-text-light hover:bg-grey-bg/50'
                          )}
                        >
                          {opt === 'STANDARD' ? 'Standard' : 'Customise'}
                        </button>
                      ))}
                    </div>
                    {activeLine?.specs?.accessoriesType === 'CUSTOMIZE' && (
                      <div className="mt-3">
                        <textarea
                          className="w-full text-sm border border-grey-border/60 rounded-lg p-3 min-h-[80px] bg-white text-grey-text-strong placeholder:text-grey-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-sm"
                          value={activeLine?.specs?.accessoriesNote || ''}
                          onChange={e => handleUpdateSpec(activeSpecLineIndex, 'accessoriesNote', e.target.value)}
                          placeholder="Describe accessories customisation..."
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
                            'flex-1 h-9 rounded-xl text-[13px] font-bold transition-all',
                            (activeLine?.specs?.packingType || 'STANDARD') === opt ? 'bg-[#eef2ff] text-primary shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'text-grey-text-light hover:bg-grey-bg/50'
                          )}
                        >
                          {opt === 'STANDARD' ? 'Standard' : 'Customise'}
                        </button>
                      ))}
                    </div>
                    {activeLine?.specs?.packingType === 'CUSTOMIZE' ? (
                      <div className="flex flex-col gap-3">
                        <div>
                          <AsyncSelectInput
                            className="!text-sm bg-white"
                            value={activeLine?.specs?.packagingId ? { label: activeLine?.specs?.packagingIdName || 'Selected', value: activeLine?.specs?.packagingId } : null}
                            onChange={opt => handleUpdateSpec(activeSpecLineIndex, 'packagingId', opt?.value || '', opt ? [opt] : [])}
                            loadOptions={(inputValue) => loadPackagingOptions(inputValue, customer?.id)}
                            defaultOptions={true}
                            isClearable={true}
                            placeholder="Select Package (Optional)"
                            key={`pkg-cust-${customer?.id}-${defaultPackagingLabel}`}
                          />
                        </div>
                        <textarea
                          className="w-full text-sm border border-grey-border/60 rounded-lg p-3 min-h-[80px] bg-white text-grey-text-strong placeholder:text-grey-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-sm"
                          value={activeLine?.specs?.packingNote || ''}
                          onChange={e => handleUpdateSpec(activeSpecLineIndex, 'packingNote', e.target.value)}
                          placeholder="Describe packing customisation..."
                        />
                      </div>
                    ) : (
                      <div>
                        <AsyncSelectInput
                          required
                          className="!text-sm bg-white"
                          value={activeLine?.specs?.packagingId ? { label: activeLine?.specs?.packagingIdName || 'Selected', value: activeLine?.specs?.packagingId } : null}
                          onChange={opt => handleUpdateSpec(activeSpecLineIndex, 'packagingId', opt?.value || '', opt ? [opt] : [])}
                          loadOptions={(inputValue) => loadPackagingOptions(inputValue, customer?.id)}
                          defaultOptions={true}
                          isClearable={true}
                          placeholder="Select Standard Package"
                          key={`pkg-${customer?.id}-${defaultPackagingLabel}`}
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
                    Next model → <span className="text-[10px] text-white/90 bg-white/20 rounded px-1 hidden sm:inline-block shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]">ALT ↓</span>
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
