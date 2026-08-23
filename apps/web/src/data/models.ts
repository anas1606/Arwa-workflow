import type { Customer } from './customers';

export type SpecFieldType = 'text' | 'number' | 'select' | 'customise';

export type SpecField = {
  key: string;
  label: string;
  type: SpecFieldType;
  unit?: string;
  options?: string[];
  /** Companion key for customise detail (HTML / plain text). */
  detailKey?: string;
  required?: boolean;
  placeholder?: string;
};

export type ProductModel = {
  id: string;
  code: string;
  name: string;
  category: string;
  specs: SpecField[];
};

/**
 * Shared customisation fields on every model line.
 * - body_design / body_color: configured per product model (Customisation).
 * - brand_name: options come from the selected customer’s brands.
 * - panel_sticker: options come from the selected brand’s panel stickers.
 * - accessories / packing: fixed Regular | Customise.
 */
export const CUSTOMISATION_SPECS: SpecField[] = [
  {
    key: 'body_design',
    label: 'Body Design',
    type: 'select',
    options: ['Standard', 'Compact', 'Extended', 'Heavy Duty', 'Custom Profile'],
    required: true,
  },
  {
    key: 'body_color',
    label: 'Body Color',
    type: 'select',
    options: ['White', 'Black', 'Grey', 'Blue', 'Red', 'Yellow', 'Custom RAL'],
    required: true,
  },
  {
    key: 'brand_name',
    label: 'Brand Name',
    type: 'select',
    /** Resolved from customer.brands at order time. */
    options: [],
    required: true,
  },
  {
    key: 'panel_sticker',
    label: 'Panel Sticker',
    type: 'select',
    /** Resolved from the selected brand’s panelStickers. */
    options: [],
    required: true,
  },
  {
    key: 'accessories',
    label: 'Accessories',
    type: 'customise',
    options: ['Regular', 'Customise'],
    detailKey: 'accessories_detail',
    required: true,
    placeholder: 'Describe accessory customisation…',
  },
  {
    key: 'packing',
    label: 'Packing',
    type: 'customise',
    options: ['Regular', 'Customise'],
    detailKey: 'packing_detail',
    required: true,
    placeholder: 'Describe packing customisation…',
  },
];

/** Spec keys configured on the product model itself. */
export const MODEL_OPTION_KEYS = ['body_design', 'body_color'] as const;

/** Spec keys resolved from customer → brand hierarchy. */
export const CUSTOMER_LINKED_SPEC_KEYS = ['brand_name', 'panel_sticker'] as const;

export const PRODUCT_MODELS: ProductModel[] = [
  {
    id: 'm-steel-frame',
    code: 'SFA-100',
    name: 'Steel Frame Assembly',
    category: 'Structural',
    specs: CUSTOMISATION_SPECS,
  },
  {
    id: 'm-bracket',
    code: 'BKB-200',
    name: 'Bracket Kit B',
    category: 'Components',
    specs: CUSTOMISATION_SPECS,
  },
  {
    id: 'm-housing',
    code: 'HCV-310',
    name: 'Housing Cover',
    category: 'Enclosures',
    specs: CUSTOMISATION_SPECS,
  },
  {
    id: 'm-motor',
    code: 'MMT-450',
    name: 'Motor Mount',
    category: 'Mechanical',
    specs: CUSTOMISATION_SPECS,
  },
  {
    id: 'm-chassis',
    code: 'CSF-500',
    name: 'Chassis Subframe',
    category: 'Structural',
    specs: CUSTOMISATION_SPECS,
  },
  {
    id: 'm-guard',
    code: 'GRS-120',
    name: 'Guard Rail Set',
    category: 'Safety',
    specs: CUSTOMISATION_SPECS,
  },
  {
    id: 'm-panel',
    code: 'PNA-220',
    name: 'Panel Assembly',
    category: 'Electrical',
    specs: CUSTOMISATION_SPECS,
  },
  {
    id: 'm-fixture',
    code: 'WFA-001',
    name: 'Weld Fixture A',
    category: 'Tooling',
    specs: CUSTOMISATION_SPECS,
  },
];

export const MODEL_CATEGORIES = [
  ...new Set(PRODUCT_MODELS.map((m) => m.category)),
].sort();

export function getModelById(id: string) {
  return PRODUCT_MODELS.find((m) => m.id === id);
}

export function defaultSpecsForModel(model: ProductModel): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const field of model.specs) {
    if (field.type === 'number') {
      out[field.key] = '';
    } else if (field.type === 'select' && field.options?.[0]) {
      out[field.key] = field.options[0];
    } else if (field.type === 'customise' && field.options?.[0]) {
      out[field.key] = field.options[0];
      if (field.detailKey) out[field.detailKey] = '';
    } else {
      out[field.key] = '';
    }
  }
  return out;
}

export function isCustomiseMode(value: string | number | undefined) {
  return String(value ?? '').toLowerCase() === 'customise';
}

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isLineSpecsComplete(
  line: {
    modelId: string;
    specs: Record<string, string | number>;
  },
  customer?: Customer | null,
) {
  const model = getModelById(line.modelId);
  if (!model) return false;
  for (const field of model.specs) {
    if (!field.required) continue;
    const val = line.specs[field.key];
    if (val === '' || val === undefined || val === null) return false;
    if (field.type === 'customise' && isCustomiseMode(val) && field.detailKey) {
      if (!stripHtml(String(line.specs[field.detailKey] ?? ''))) return false;
    }
  }

  if (customer) {
    const brandName = String(line.specs.brand_name ?? '');
    const brand = customer.brands.find((b) => b.name === brandName);
    if (!brand) return false;
    const sticker = String(line.specs.panel_sticker ?? '');
    if (!brand.panelStickers.includes(sticker)) return false;
  }

  return true;
}
