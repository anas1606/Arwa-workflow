import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useKeyboardShortcuts, KeyboardShortcutBar } from '@/common/KeyboardShortcut';
import { Box, Plus, Minus, X, Trash2, ArrowLeft, ArrowRight, Check, LayoutGrid, Layers } from 'lucide-react';
import Button from '@/common/buttons/Button';
import Input from '@/common/input/Input';
import { createBoxApi } from '@/lib/fetcher';
import { toast } from 'sonner';
import clsx from 'clsx';

export default function AddGodown() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [sections, setSections] = useState([]);

  const [sectionPrefix, setSectionPrefix] = useState('');
  const [sectionQty, setSectionQty] = useState('');

  const [selectedSectionId, setSelectedSectionId] = useState(null);

  useEffect(() => {
    if (step === 3 && sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [step, sections, selectedSectionId]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useKeyboardShortcuts({
    onNextStep: () => {
      if (!isSubmitting) {
        if (step < 3) {
          nextStep();
        } else {
          handleSubmit();
        }
      }
    },
    onPrevStep: () => {
      if (!isSubmitting && step > 1) {
        prevStep();
      }
    },
    onSave: () => {
      if (!isSubmitting && name.trim()) {
        handleSubmit();
      }
    },
    customShortcuts: [
      {
        key: 'ArrowRight',
        altKey: true,
        action: () => {
          if (step === 2) {
            document.getElementById('section-input-0')?.focus();
          } else if (step === 3) {
            document.querySelector('input[placeholder="e.g. Row"]')?.focus();
          }
        }
      },
      {
        key: 'ArrowLeft',
        altKey: true,
        action: () => {
          if (step === 2) {
            document.querySelector('input[placeholder="e.g. Room"]')?.focus();
          } else if (step === 3) {
            document.querySelector('.section-btn')?.focus();
          }
        }
      },
      {
        key: 'ArrowDown',
        ignoreInInput: true,
        action: () => {
          if (step === 3 && sections.length > 0) {
            const currentIndex = sections.findIndex(s => s.id === selectedSectionId);
            if (currentIndex >= 0 && currentIndex < sections.length - 1) {
              const newId = sections[currentIndex + 1].id;
              setSelectedSectionId(newId);
              setTimeout(() => document.getElementById(`section-btn-${newId}`)?.focus(), 0);
            } else if (currentIndex === -1) {
              const newId = sections[0].id;
              setSelectedSectionId(newId);
              setTimeout(() => document.getElementById(`section-btn-${newId}`)?.focus(), 0);
            }
          }
        }
      },
      {
        key: 'ArrowUp',
        ignoreInInput: true,
        action: () => {
          if (step === 3 && sections.length > 0) {
            const currentIndex = sections.findIndex(s => s.id === selectedSectionId);
            if (currentIndex > 0) {
              const newId = sections[currentIndex - 1].id;
              setSelectedSectionId(newId);
              setTimeout(() => document.getElementById(`section-btn-${newId}`)?.focus(), 0);
            }
          }
        }
      }
    ],
    disableInputCycling: true
  });

  const handleClose = () => {
    router.push('/inventory/godown');
  };

  const handleGenerateSections = () => {
    const qty = parseInt(sectionQty, 10);
    if (!qty || qty <= 0) return;

    const startIndex = sections.length;
    const newSections = Array.from({ length: qty }, (_, i) => ({
      id: Date.now() + i,
      name: sectionPrefix.trim() ? `${sectionPrefix.trim()} ${sections.length + i + 1}` : `Section ${sections.length + i + 1}`,
      trays: [],
      trayPrefix: '',
      trayQty: ''
    }));
    setSections([...sections, ...newSections]);
    setSectionQty('');

    setTimeout(() => {
      document.getElementById(`section-input-${startIndex}`)?.focus();
    }, 50);
  };

  const handleGenerateTraysForSection = (sectionId) => {
    let startIndex = 0;
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        const qty = parseInt(sec.trayQty, 10);
        if (!qty || qty <= 0) return sec;

        startIndex = sec.trays.length;
        const newTrays = Array.from({ length: qty }, (_, i) => ({
          id: Date.now() + i + Math.random(),
          name: sec.trayPrefix.trim() ? `${sec.trayPrefix.trim()} ${sec.trays.length + i + 1}` : `Tray ${sec.trays.length + i + 1}`
        }));

        return { ...sec, trays: [...sec.trays, ...newTrays], trayQty: '' };
      }
      return sec;
    }));

    setTimeout(() => {
      document.getElementById(`tray-input-${sectionId}-${startIndex}`)?.focus();
    }, 50);
  };

  const updateSectionField = (id, field, value) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const updateTrayName = (sectionId, trayId, newName) => {
    setSections(sections.map(s =>
      s.id === sectionId ? {
        ...s,
        trays: s.trays.map(t => t.id === trayId ? { ...t, name: newName } : t)
      } : s
    ));
  };

  const deleteSection = (id) => {
    setSections(sections.filter(s => s.id !== id));
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  const deleteTray = (sectionId, trayId) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, trays: s.trays.filter(t => t.id !== trayId) } : s
    ));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Box name is required');
      return;
    }

    const formattedSections = sections.map(s => ({
      name: s.name.trim(),
      trays: s.trays.map(t => ({ name: t.name.trim() })).filter(t => t.name)
    })).filter(s => s.name);

    const sectionNames = new Set();
    for (const s of formattedSections) {
      if (sectionNames.has(s.name)) {
        toast.error(`Duplicate section name found: "${s.name}"`);
        return;
      }
      sectionNames.add(s.name);
      
      const trayNames = new Set();
      for (const t of s.trays) {
        if (trayNames.has(t.name)) {
          toast.error(`Duplicate tray name found: "${t.name}" in section "${s.name}"`);
          return;
        }
        trayNames.add(t.name);
      }
    }

    setIsSubmitting(true);
    try {
      const res = await createBoxApi({ name, sections: formattedSections });
      if (res.data?.success) {
        toast.success(res.data.message || 'Godown Box created successfully');
        handleClose();
      } else {
        toast.error(res.error?.message || res.data?.message || 'Failed to create Godown Box');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !name.trim()) {
      toast.error('Please enter a Box name to continue');
      return;
    }
    if (step === 2 && sections.length === 0) {
      toast.error('Please generate at least one section to continue');
      return;
    }
    if (step === 2 && sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const canGoToStep = (targetStep) => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return !!name.trim();
    if (targetStep === 3) return !!name.trim() && sections.length > 0;
    return false;
  };

  return (
    <div className="flex flex-col h-[96vh] overflow-hidden">

      {/* Header & Progress Bar */}
      <div className="shrink-0 py-1 flex items-start justify-between gap-6 px-1">
        <div className="flex items-start gap-6">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="!px-0 !bg-transparent text-grey-muted hover:text-grey-text-strong mt-0.5"
            icon={ArrowLeft}
            text="Back to godown"
          />
          <div>
            <h1 className="text-md font-bold text-grey-text-strong leading-tight">Add Godown Setup</h1>
            <p className="text-sm text-grey-muted mt-1">Configure your new master box and layout.</p>
          </div>
        </div>
        <div className="flex items-center">
          <Button
            variant="primary"
            onClick={handleSubmit}
            text={isSubmitting ? "Saving..." : "Save"}
            disabled={isSubmitting || !name.trim()}
            className="px-6 h-9 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* STEPPER */}
      <div className="shrink-0 mb-2 ">
        <div className="w-full bg-white rounded-xl shadow-sm border border-grey-surface p-1">
          <div className="grid grid-cols-3">
            {[
              { num: 1, title: 'Box Details', desc: 'Name your master container' },
              { num: 2, title: 'Sections', desc: 'Generate box sections' },
              { num: 3, title: 'Trays', desc: 'Allocate trays to sections' }
            ].map((s, idx) => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              const isAccessible = canGoToStep(s.num);
              const isClickable = s.num !== step && isAccessible;

              return (
                <div
                  key={s.num}
                  className="relative"
                  onClick={() => {
                    if (isClickable) setStep(s.num);
                  }}
                >
                  {/* Top border indicator */}
                  {(isActive || isDone) && <div className="absolute top-0 inset-x-0 h-[2px] bg-primary rounded-b-sm" />}

                  <div className={clsx(
                    'flex items-center w-full gap-3 px-3 py-2.5 rounded-xl transition-colors',
                    isClickable ? 'cursor-pointer' : isActive ? '' : 'opacity-50 cursor-not-allowed',
                    isActive ? 'bg-primary-bg' : isClickable ? 'hover:bg-grey-surface/50' : ''
                  )}>
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors',
                      isActive ? 'bg-primary text-white shadow-sm shadow-primary/20' : isDone ? 'bg-primary-subtle text-primary-dark' : 'bg-grey-surface text-grey-muted'
                    )}>
                      {isDone ? <Check size={14} /> : idx + 1}
                    </div>
                    <div className="hidden sm:block min-w-0">
                      <p className={clsx('text-sm font-bold leading-tight truncate', isActive ? 'text-grey-text-strong' : isDone ? 'text-primary' : 'text-grey-icon')}>{s.title}</p>
                      <p className="text-[11px] text-grey-icon truncate leading-tight mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-1 pb-2">
        <KeyboardShortcutBar 
          hideSearch={true}
          customActions={[
            { label: 'Navigate items', keyCombo: ['↓', '↑'] },
            { label: 'Switch panels', keyCombo: ['Alt', '←', '→'] },
            { label: 'Delete item', keyCombo: ['Alt', 'Del'] },
            { label: 'Next / Submit', keyCombo: ['Shift', 'Enter'] },
            { label: 'Back', keyCombo: ['Ctrl', 'Shift', 'Enter'] },
            { label: 'Direct Save', keyCombo: ['Ctrl', 'S'] }
          ]}
        />
      </div>

      {/* Main Content Area (No max-width, fills screen) */}
      <div className="flex-1 overflow-hidden min-h-0 relative">

        {/* STEP 1: BOX DETAILS */}
        {step === 1 && (
          <div className="h-full overflow-y-auto custom-scrollbar p-4 flex flex-col animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="w-full max-w-xl bg-white rounded-xl border border-grey-border shadow-sm flex flex-col overflow-hidden m-auto shrink-0">
              <div className="bg-grey-bg/50 px-5 py-3 border-b border-grey-border flex items-center justify-between">
                <h3 className="font-bold text-grey-text-strong flex items-center gap-2 text-base">
                  <Box size={18} className="text-primary" />
                  Box Configuration
                </h3>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <p className="text-sm text-grey-muted mb-6 leading-relaxed">
                    Enter a unique name for this godown box. This will act as the master container for all the sections and trays you generate in the following steps.
                  </p>
                  <Input
                    type="text"
                    label="Box Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Warehouse Alpha"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end pt-6 border-t border-grey-border/50 gap-3">
                  <Button
                    variant="primary"
                    onClick={nextStep}
                    text="Continue to Sections"
                    icon={ArrowRight}
                    className="px-8 h-10"
                    disabled={!name.trim()}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: GENERATE SECTIONS */}
        {step === 2 && (
          <div className="h-full flex flex-col lg:flex-row pb-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-200 min-h-0">

            {/* Left: Section Generator Wrapper */}
            <div className="w-full lg:w-[350px] shrink-0 min-h-0 flex flex-col justify-start">
              <div className="w-full min-h-0 shrink bg-white rounded-xl border border-grey-border shadow-sm flex flex-col overflow-hidden">
                <div className="bg-grey-bg/50 px-4 py-3 border-b border-grey-border shrink-0">
                  <h3 className="font-bold text-grey-text-strong flex items-center gap-2 text-sm">
                    <LayoutGrid size={16} className="text-primary" />
                    Bulk Generate Sections
                  </h3>
                </div>
                <div className="overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4 min-h-0">
                  <p className="text-sm text-grey-muted leading-relaxed">
                    Generate multiple sections at once by setting a prefix and quantity.
                  </p>
                  <Input
                    label="Section Prefix"
                    value={sectionPrefix}
                    onChange={(e) => setSectionPrefix(e.target.value)}
                    placeholder="e.g. Room"
                    autoFocus
                  />
                  <Input
                    label="Quantity"
                    type="number"
                    min="1"
                    value={sectionQty}
                    onChange={(e) => setSectionQty(e.target.value)}
                    placeholder="e.g. 5"
                  />
                  <Button
                    variant="primary"
                    text="Generate Sections"
                    icon={Plus}
                    onClick={handleGenerateSections}
                    disabled={!sectionQty || parseInt(sectionQty, 10) <= 0}
                    className="w-full justify-center mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Right: Section List Wrapper */}
            <div className="flex-1 min-h-0 flex flex-col justify-start">
              <div className="w-full min-h-0 shrink bg-white rounded-xl border border-grey-border shadow-sm flex flex-col overflow-hidden">
                <div className="bg-grey-bg/50 px-4 py-3 border-b border-grey-border flex items-center justify-between shrink-0">
                  <h3 className="font-bold text-grey-text-strong text-sm">Generated Sections ({sections.length})</h3>
                  <span className="text-[11px] text-grey-muted">Edit names below</span>
                </div>

                <div className="overflow-y-auto p-4 custom-scrollbar bg-white min-h-0">
                  {sections.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-grey-bg rounded-full flex items-center justify-center text-grey-muted mb-4">
                        <LayoutGrid className="w-8 h-8 opacity-50" />
                      </div>
                      <p className="text-grey-text-strong font-bold">No sections generated yet</p>
                      <p className="text-sm text-grey-muted mt-1">Use the panel on the left to add sections.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sections.map((section, index) => (
                        <div key={section.id} className="flex items-center gap-3 bg-grey-bg/20 p-3 rounded-lg border border-grey-border/50 focus-within:border-primary focus-within:ring-1 transition-all group">
                          <div className="w-8 h-8 rounded-md bg-white border border-grey-border flex items-center justify-center text-xs font-bold text-grey-text-strong shadow-sm shrink-0">
                            {index + 1}
                          </div>
                          <input
                            id={`section-input-${index}`}
                            type="text"
                            value={section.name}
                            onChange={(e) => updateSectionField(section.id, 'name', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.altKey && (e.key === 'Delete' || e.key === 'Backspace' || e.key.toLowerCase() === 'd')) {
                                e.preventDefault();
                                deleteSection(section.id);
                              }
                            }}
                            className="flex-1 bg-transparent border-none outline-none font-semibold text-grey-text-strong w-full"
                          />
                          <button
                            onClick={() => deleteSection(section.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-grey-muted hover:text-red-500 hover:bg-red-50 focus:text-red-500 focus:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shrink-0 bg-white shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ALLOCATE TRAYS */}
        {step === 3 && (
          <div className="h-full flex flex-col lg:flex-row pb-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-200 min-h-0">

            {/* Left: Section Selector Wrapper */}
            <div className="w-full lg:w-[300px] shrink-0 min-h-0 flex flex-col justify-start">
              <div className="w-full min-h-0 shrink bg-white rounded-xl border border-grey-border shadow-sm flex flex-col overflow-hidden">
                <div className="bg-grey-bg/50 px-4 py-3 border-b border-grey-border shrink-0">
                  <h3 className="font-bold text-grey-text-strong flex items-center gap-2 text-sm">
                    <LayoutGrid size={16} className="text-primary" />
                    Select Section
                  </h3>
                </div>
                <div className="overflow-y-auto p-3 custom-scrollbar flex flex-col gap-2 min-h-0">
                  {sections.length === 0 ? (
                    <p className="text-sm text-grey-muted text-center p-4">No sections available.</p>
                  ) : (
                    sections.map((section) => (
                      <button
                        key={section.id}
                        id={`section-btn-${section.id}`}
                        onClick={() => setSelectedSectionId(section.id)}
                        className={`section-btn flex items-center justify-between p-3 rounded-lg border text-left transition-all ${selectedSectionId === section.id
                            ? 'bg-primary/5 border-primary shadow-sm'
                            : 'bg-white border-grey-border hover:bg-grey-bg'
                          }`}
                      >
                        <span className={`font-bold ${selectedSectionId === section.id ? 'text-primary' : 'text-grey-text-strong'}`}>
                          {section.name}
                        </span>
                        <span className="text-xs bg-grey-bg px-2 py-1 rounded-full text-grey-muted border border-grey-border/50">
                          {section.trays.length} Trays
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Trays For Selected Section Wrapper */}
            <div className="flex-1 min-h-0 flex flex-col justify-start">
              <div className="w-full min-h-0 shrink bg-white rounded-xl border border-grey-border shadow-sm flex flex-col overflow-hidden">
                {selectedSectionId ? (() => {
                  const selectedSection = sections.find(s => s.id === selectedSectionId);
                  return (
                    <div className="overflow-y-auto custom-scrollbar flex flex-col min-h-0 w-full">
                      {/* Tray Generator Header */}
                      <div className="bg-grey-bg/50 px-6 py-5 border-b border-grey-border flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <Layers className="text-primary" size={20} />
                          <h3 className="text-lg font-bold text-grey-text-strong">
                            Allocate Trays for <span className="text-primary">"{selectedSection?.name}"</span>
                          </h3>
                        </div>

                        <div className="flex items-end gap-3 bg-white p-4 rounded-xl border border-grey-border shadow-sm">
                          <div className="flex-1">
                            <Input
                              label="Tray Prefix"
                              value={selectedSection?.trayPrefix || ''}
                              onChange={(e) => updateSectionField(selectedSectionId, 'trayPrefix', e.target.value)}
                              placeholder="e.g. Row"
                              className="bg-grey-bg/20"
                              autoFocus
                            />
                          </div>
                          <div className="w-24 shrink-0">
                            <Input
                              label="Qty"
                              type="number"
                              min="1"
                              value={selectedSection?.trayQty || ''}
                              onChange={(e) => updateSectionField(selectedSectionId, 'trayQty', e.target.value)}
                              placeholder="e.g. 10"
                              className="bg-grey-bg/20"
                            />
                          </div>
                          <div className="flex items-end gap-2 shrink-0">
                            <Button
                              variant="primary"
                              icon={Plus}
                              text="Generate Bulk"
                              onClick={() => handleGenerateTraysForSection(selectedSectionId)}
                              disabled={!selectedSection?.trayQty || parseInt(selectedSection.trayQty, 10) <= 0}
                              className="h-10 px-4"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Scrolling Trays List */}
                      <div className="p-6 bg-white shrink-0">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                          <h4 className="font-bold text-grey-text-strong text-sm uppercase tracking-wider">Trays List</h4>
                          <Button
                            variant="secondary"
                            icon={Plus}
                            text="Add Single Tray"
                            onClick={() => {
                              const newTray = { id: Date.now() + Math.random(), name: `Tray ${selectedSection.trays.length + 1}` };
                              setSections(sections.map(s => s.id === selectedSectionId ? { ...s, trays: [...s.trays, newTray] } : s));
                            }}
                            className="!h-8 text-xs bg-white"
                          />
                        </div>

                        {selectedSection?.trays.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white rounded-full border border-grey-border flex items-center justify-center text-grey-muted mb-4 shadow-sm">
                              <Layers className="w-8 h-8 opacity-50" />
                            </div>
                            <p className="text-grey-text-strong font-bold">No trays allocated</p>
                            <p className="text-sm text-grey-muted mt-1">Generate trays using the controls above.</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-4">
                            {selectedSection?.trays.map((tray, tIndex) => (
                              <div key={tray.id} className="group flex items-center gap-2 bg-white p-2 rounded-lg border border-grey-border shadow-sm focus-within:border-primary focus-within:ring-1 transition-all w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]">
                                <div className="w-7 h-7 rounded-md bg-grey-bg border border-grey-border/50 flex items-center justify-center text-xs font-bold text-grey-text-strong shrink-0">
                                  {tIndex + 1}
                                </div>
                                <input
                                  id={`tray-input-${selectedSectionId}-${tIndex}`}
                                  type="text"
                                  value={tray.name}
                                  onChange={(e) => updateTrayName(selectedSectionId, tray.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.altKey && (e.key === 'Delete' || e.key === 'Backspace' || e.key.toLowerCase() === 'd')) {
                                      e.preventDefault();
                                      deleteTray(selectedSectionId, tray.id);
                                    }
                                  }}
                                  className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-grey-text-strong w-full min-w-0"
                                />
                                <button
                                  onClick={() => deleteTray(selectedSectionId, tray.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-grey-muted hover:text-red-500 hover:bg-red-50 focus:text-red-500 focus:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shrink-0"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="h-full flex flex-col items-center justify-center text-center bg-grey-bg/10">
                    <p className="text-grey-muted font-medium">Please select a section from the left.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer Actions */}
      <div className="bg-white px-5 py-3 border-t border-grey-border shrink-0 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-between mt-auto">
        <div>
          <Button variant="secondary" onClick={handleClose} text="Cancel" className="px-5 h-9 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          {step > 1 && (
            <Button variant="secondary" onClick={prevStep} text="Back" className="px-5 h-9 text-sm" />
          )}
          {step < 3 && (
            <Button 
              variant="primary" 
              onClick={nextStep} 
              text="Next Step" 
              className="px-5 h-9 text-sm"
              disabled={(step === 1 && !name.trim()) || (step === 2 && sections.length === 0)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
