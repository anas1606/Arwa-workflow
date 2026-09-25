import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import Button from '@/common/buttons/Button';
import clsx from 'clsx';
import { toast } from 'sonner';
import { getOrderByIdApi, updateOrderApi } from '@/lib/fetcher';
import { useKeyboardShortcuts } from '@/common/KeyboardShortcut';

import SetQuantityModal from './modals/SetQuantityModal';
import CustomerStep from './create/CustomerStep';
import ModelsStep from './create/ModelsStep';
import SpecsStep from './create/SpecsStep';
import ReviewStep from './create/ReviewStep';
import { usePermission } from '@/hooks/usePermission';
import { CUSTOMISATION_SPECS } from '@/common/dummy';

const WIZARD_STEPS = [
  { id: 'customer', title: 'Customer', desc: 'Who is this order for?' },
  { id: 'models', title: 'Models', desc: 'Select models and enter quantity for each' },
  { id: 'specs', title: 'Specs', desc: 'Set customisation for each model line' },
  { id: 'schedule', title: 'Schedule', desc: 'Due date, priority, and review' },
];

export default function EditOrderView() {
  const router = useRouter();
  const { id } = router.query;
  const { canUpdate } = usePermission('orders');
  const [stepIndex, setStepIndex] = useState(0);

  // Draft state
  const [customer, setCustomer] = useState(null);
  const [lines, setLines] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [plannerNotes, setPlannerNotes] = useState('');
  const [status, setStatus] = useState('CONFIRMED');
  const [orderNumber, setOrderNumber] = useState('');

  // UI state for Steps
  const [modalModel, setModalModel] = useState(null);
  const [activeSpecLineIndex, setActiveSpecLineIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getOrderByIdApi(id).then((res) => {
        if (res.data?.success) {
          const data = res.data.data;
          setCustomer(data.customer);
          setOrderNumber(data.orderNumber);
          setDueDate(data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '');
          setPriority(data.priority || 'Normal');
          setPlannerNotes(data.remark || '');
          setStatus(data.status || 'CONFIRMED');
          
          const mappedLines = (data.orderLines || []).map(l => ({
            model: l.product,
            quantity: l.quantity,
            specs: {
              bodyDesignId: l.bodyDesignId || '',
              bodyDesignIdName: l.bodyDesign?.name || '',
              colourId: l.colourId || '',
              colourIdName: l.colour?.name || '',
              brandId: l.brandId || '',
              brandIdName: l.brand?.brandname || l.brand?.name || '',
              stickerId: l.isDefaultSticker ? 'default' : (l.stickerId || ''),
              stickerIdName: l.isDefaultSticker ? 'Arwa Default Sticker' : (l.sticker?.name || ''),
              accessoriesType: l.accessoriesType || 'STANDARD',
              accessoriesNote: l.accessoriesNote || '',
              packingType: l.packingType || 'STANDARD',
              packingNote: l.packingNote || '',
              packagingId: l.isDefaultPackaging ? 'default' : (l.packagingId || ''),
              packagingIdName: l.isDefaultPackaging ? 'Default Packaging' : (l.packaging?.name || '')
            }
          }));
          setLines(mappedLines);
        } else {
          toast.error("Failed to load order");
          router.push('/orders');
        }
        setLoading(false);
      });
    }
  }, [id, router]);

  // Keyboard shortcuts for stepper
  useKeyboardShortcuts({
    onNextStep: () => {
      if (!isSubmitting && !loading) {
        if (canProceed()) {
          handleNext();
        } else {
          toast.error('Please complete all required fields in this step first.');
        }
      }
    },
    onPrevStep: () => {
      if (!isSubmitting && !loading) {
        handleBack();
      }
    },
    customShortcuts: []
  });

  // Actions
  const handleModalAdd = (model, qty) => {
    const idx = lines.findIndex(l => l.model.id === model.id);
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

  const isStepValid = (idx) => {
    if (idx === 0) return !!customer && !!dueDate && !!priority;
    if (idx === 1) return lines.length > 0;
    if (idx === 2) {
      return lines.every(l => {
        const isAccessoriesValid = (!l.specs?.accessoriesType || l.specs?.accessoriesType === 'STANDARD') ||
          (l.specs?.accessoriesType === 'CUSTOMIZE' && l.specs?.accessoriesNote && l.specs.accessoriesNote.replace(/<[^>]*>?/gm, '').trim() !== '');
          
        const isPackingValid = (!l.specs?.packingType || l.specs?.packingType === 'STANDARD') ? !!l.specs?.packagingId :
          (l.specs?.packingType === 'CUSTOMIZE' && l.specs?.packingNote && l.specs.packingNote.replace(/<[^>]*>?/gm, '').trim() !== '');

        return !!(
          l.specs?.bodyDesignId &&
          l.specs?.colourId &&
          l.specs?.brandId &&
          l.specs?.stickerId &&
          isAccessoriesValid &&
          isPackingValid
        );
      });
    }
    if (idx === 3) return true;
    return true;
  };

  const canProceed = () => isStepValid(stepIndex);

  const handleNext = async () => {
    if (!canProceed()) return;
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      setIsSubmitting(true);
      try {
        const payload = {
          id,
          customerId: customer.id,
          dueDate: new Date(dueDate).toISOString(),
          priority: priority.toUpperCase(),
          status: status,
          remark: plannerNotes || undefined,
          orderLines: lines.map(l => ({
            productId: l.model.id,
            quantity: l.quantity,
            bodyDesignId: l.specs.bodyDesignId || undefined,
            colourId: l.specs.colourId || undefined,
            brandId: l.specs.brandId || undefined,
            stickerId: l.specs.stickerId === 'default' ? 'default' : (l.specs.stickerId || undefined),
            accessoriesType: l.specs.accessoriesType || 'STANDARD',
            accessoriesNote: l.specs.accessoriesNote || undefined,
            packingType: l.specs.packingType || 'STANDARD',
            packingNote: l.specs.packingNote || undefined,
            packagingId: l.specs.packagingId === 'default' ? 'default' : (l.specs.packagingId || undefined)
          }))
        };
        const res = await updateOrderApi(id, payload);
        if (res.data?.success) {
          toast.success('Order updated successfully!');
          router.push('/orders');
        } else {
          toast.error(res.data?.message || 'Failed to update order');
        }
      } catch (err) {
        console.error(err);
        toast.error('An error occurred');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (stepIndex === 0) router.push('/orders');
    else setStepIndex(s => s - 1);
  };

  if (!canUpdate) {
    return (
      <div className="w-full flex items-center justify-center p-20">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-danger-main/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-danger-main font-bold text-xl">!</span>
          </div>
          <h2 className="text-lg font-bold text-grey-text-strong">Access Denied</h2>
          <p className="text-sm text-grey-muted mt-2">You do not have permission to edit orders.</p>
          <Button variant="secondary" text="Go back" className="mt-4" onClick={() => router.push('/orders')} />
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Edit Order {orderNumber && `- ${orderNumber}`} | Arwa Weld</title></Head>
      <div className="flex flex-col h-[96vh] overflow-hidden relative">

        <div className="shrink-0 py-1 flex items-start gap-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/orders')}
            className="!px-0 !bg-transparent text-grey-muted hover:text-grey-text-strong mt-0.5"
            icon={ArrowLeft}
            text="Back to orders"
          />
          <div>
            <h1 className="text-md font-bold text-grey-text-strong leading-tight">Edit Order {orderNumber && <span className="text-primary">{orderNumber}</span>}</h1>
            <p className="text-sm text-grey-muted mt-1">{WIZARD_STEPS[stepIndex]?.desc}</p>
          </div>
        </div>

        {/* STEPPER HEADER */}
        <div className="bg-white border-y border-grey-border/60 shrink-0">
          <div className="w-full mx-auto rounded-xl">
            <div className="flex items-center">
              {WIZARD_STEPS.map((step, idx) => {
                const isActive = idx === stepIndex;
                const isDone = idx < stepIndex;
                return (
                  <div
                    key={step.id}
                    className="relative flex-1 px-1 py-1"
                    onClick={() => { 
                      if (idx <= stepIndex) {
                        setStepIndex(idx);
                      } else {
                        let allValid = true;
                        for (let i = stepIndex; i < idx; i++) {
                          if (!isStepValid(i)) {
                            allValid = false;
                            break;
                          }
                        }
                        if (allValid) setStepIndex(idx);
                      }
                    }}
                  >
                    {/* Top border indicator */}
                    {(isActive || isDone) && <div className="absolute top-0 inset-x-0 h-[2px] bg-primary rounded-b-sm" />}
                    
                    <div className={clsx(
                      'flex items-center w-full gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                      isActive ? 'bg-primary-bg' : isDone ? '' : 'hover:bg-grey-surface/50'
                    )}>
                      <div className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors',
                        isActive ? 'bg-primary text-white shadow-sm shadow-primary/20' : isDone ? 'bg-primary-subtle text-primary-dark' : 'bg-grey-surface text-grey-muted'
                      )}>
                        {isDone ? <Check size={14} /> : idx + 1}
                      </div>
                      <div className="hidden sm:block min-w-0">
                        <p className={clsx('text-sm font-bold leading-tight truncate', isActive ? 'text-grey-text-strong' : isDone ? 'text-primary' : 'text-grey-icon')}>{step.title}</p>
                        <p className="text-[11px] text-grey-icon truncate leading-tight mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="w-full mx-auto py-3 h-full">
            <>
              {stepIndex === 0 && (
                <CustomerStep
                  customer={customer}
                  setCustomer={setCustomer}
                  dueDate={dueDate}
                  setDueDate={setDueDate}
                  priority={priority}
                  setPriority={setPriority}
                  plannerNotes={plannerNotes}
                  setPlannerNotes={setPlannerNotes}
                  isActive={stepIndex === 0}
                />
              )}
                
                {stepIndex === 1 && (
                  <ModelsStep
                    lines={lines}
                    setLines={setLines}
                    isActive={stepIndex === 1}
                    modalModel={modalModel}
                    onAddLineClick={setModalModel}
                    onUpdateLineQty={handleUpdateLineQty}
                  />
                )}

                {stepIndex === 2 && (
                  <SpecsStep
                    customer={customer}
                    lines={lines}
                    setLines={setLines}
                    isActive={stepIndex === 2}
                    activeSpecLineIndex={activeSpecLineIndex}
                    setActiveSpecLineIndex={setActiveSpecLineIndex}
                  />
                )}

                {stepIndex === 3 && (
                  <ReviewStep
                    customer={customer}
                    lines={lines}
                    dueDate={dueDate}
                    priority={priority}
                    status={status}
                    setStatus={setStatus}
                    isEdit={true}
                  />
                )}
              </>
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
        <div className="bg-white border-t border-grey-border/60 shrink-0">
          <div className="w-full mx-auto px-3 py-2 flex items-center justify-end gap-3 rounded-xl">
            <Button
              variant="secondary"
              text={stepIndex === 0 ? 'Cancel' : 'Back'}
              onClick={handleBack}
            />
            <Button
              variant="primary"
              text={stepIndex === WIZARD_STEPS.length - 1 ? (isSubmitting ? 'Saving...' : 'Save changes') : 'Next'}
              icon={stepIndex === WIZARD_STEPS.length - 1 ? Check : ArrowRight}
              iconPosition="right"
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting || loading}
            />
          </div>
        </div>

      </div>
    </>
  );
}
