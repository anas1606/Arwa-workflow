import type { CreateOrderDraft, OrderLineDraft, WizardStep } from '../types/createOrder';
import {
  getModelById,
  isCustomiseMode,
  stripHtml,
  type SpecField,
} from '../data/models';

export function validateStep(
  step: WizardStep,
  draft: CreateOrderDraft,
): string | null {
  switch (step) {
    case 'customer':
      return draft.customerId ? null : 'Select a customer to continue.';
    case 'models':
      if (draft.lines.length === 0) return 'Add at least one model.';
      for (const line of draft.lines) {
        if (line.quantity < 1) return `Enter quantity for ${line.modelName}.`;
      }
      return null;
    case 'specs':
      return validateSpecs(draft.lines);
    case 'details':
      if (!draft.dueDate) return 'Due date is required.';
      {
        const max = new Date();
        max.setDate(max.getDate() + 90);
        const maxIso = max.toISOString().slice(0, 10);
        if (draft.dueDate > maxIso) return 'Due date cannot be more than 3 months out.';
      }
      return null;
    default:
      return null;
  }
}

function validateSpecs(lines: OrderLineDraft[]): string | null {
  for (const line of lines) {
    const model = getModelById(line.modelId);
    if (!model) return 'Invalid model in selection.';
    if (line.quantity < 1) return `Quantity required for ${line.modelName}.`;
    for (const field of model.specs) {
      if (!field.required) continue;
      const val = line.specs[field.key];
      if (val === '' || val === undefined || val === null) {
        return `${field.label} is required for ${line.modelName}.`;
      }
      if (field.type === 'customise' && isCustomiseMode(val) && field.detailKey) {
        const detail = stripHtml(String(line.specs[field.detailKey] ?? ''));
        if (!detail) {
          return `${field.label} customisation details are required for ${line.modelName}.`;
        }
      }
    }
  }
  return null;
}

export function specDisplayValue(
  field: SpecField,
  value: string | number | undefined,
  detail?: string | number,
): string {
  if (value === '' || value === undefined) return '—';
  if (field.type === 'customise') {
    if (isCustomiseMode(value)) {
      const text = stripHtml(String(detail ?? ''));
      return text ? `Customise — ${text}` : 'Customise';
    }
    return String(value);
  }
  return field.unit ? `${value} ${field.unit}` : String(value);
}

export function draftToOrderNumber(existingCount: number) {
  return `ORD-${String(existingCount + 13).padStart(5, '0')}`;
}
