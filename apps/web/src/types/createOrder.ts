import type { DummyOrder } from '../data/dummy';

export type OrderLineDraft = {
  modelId: string;
  modelName: string;
  modelCode: string;
  quantity: number;
  specs: Record<string, string | number>;
};

export type CreateOrderDraft = {
  customerId: string | null;
  lines: OrderLineDraft[];
  dueDate: string;
  priority: DummyOrder['priority'];
  notes: string;
};

export const INITIAL_CREATE_ORDER_DRAFT: CreateOrderDraft = {
  customerId: null,
  lines: [],
  dueDate: '',
  priority: 'Low',
  notes: '',
};

export type WizardStep = 'customer' | 'models' | 'specs' | 'details';

export const WIZARD_STEPS: {
  id: WizardStep;
  label: string;
  description: string;
}[] = [
  {
    id: 'customer',
    label: 'Customer',
    description: 'Who is this order for?',
  },
  {
    id: 'models',
    label: 'Models',
    description: 'Select models and enter quantity for each',
  },
  {
    id: 'specs',
    label: 'Specs',
    description: 'Set customisation for each model line',
  },
  {
    id: 'details',
    label: 'Schedule',
    description: 'Due date, priority, and review',
  },
];
