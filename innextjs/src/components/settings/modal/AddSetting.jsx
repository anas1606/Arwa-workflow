import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Input from '@/common/input/Input';
import Button from '@/common/buttons/Button';
import { toast } from 'sonner';
import { createSettingApi } from '@/lib/fetcher';

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

export default function AddSetting({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    key: '',
    value: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setShouldRender(true);
  }, []);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setShouldRender(false);
      onClose();
    }, 200);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.key.trim()) newErrors.key = 'Key is required';
    if (!formData.value.trim()) newErrors.value = 'Value is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await createSettingApi(formData);
      if (res.data?.success) {
        toast.success('Setting created successfully');
        onSuccess();
      } else {
        toast.error(res.data?.message || 'Failed to create setting');
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

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
        className={`app-modal-panel bg-white shadow-2xl rounded-xl sm:rounded-2xl border border-grey-border ${isAnimatingOut ? 'animate-modal-panel-out' : 'animate-modal-panel'} max-w-md w-full`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-grey-border px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-grey-text-strong">
            Add Setting
          </h2>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-md p-0 flex items-center justify-center transition-colors hover:bg-grey-bg text-grey-muted hover:text-grey-text-strong"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <form id="add-setting-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="setting-key"
            label="Setting Key"
            required
            value={formData.key}
            onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
            error={errors.key}
            placeholder="e.g. DEFAULT_STICKER_LABEL"
          />
          <Input
            id="setting-value"
            label="Setting Value"
            required
            value={formData.value}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            error={errors.value}
            placeholder="e.g. Arwa Default Sticker"
          />
          </form>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-grey-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="flex-1" onClick={handleClose} text="Cancel" />
          <Button variant="primary" type="submit" form="add-setting-form" className="flex-1" text={loading ? 'Saving...' : 'Save'} disabled={loading} />
        </div>
      </div>
    </div>,
    root
  );
}
