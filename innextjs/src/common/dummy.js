export const ORDER_TYPES = ['Standard', 'Customised'];

export function orderTotalQty(order) {
  return order.products.reduce((sum, line) => sum + line.quantity, 0);
}

export function dueDaysLabel(dueDate, now = new Date()) {
  const due = new Date(`${dueDate}T12:00:00`);
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  const diff = Math.round((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { text: 'Due today', tone: 'warning' };
  if (diff === 1) return { text: '1 day left', tone: 'info' };
  if (diff > 1) return { text: `${diff} days left`, tone: 'neutral' };
  if (diff === -1) return { text: '1 day overdue', tone: 'danger' };
  return { text: `${Math.abs(diff)} days overdue`, tone: 'danger' };
}

export const DUMMY_ORDERS = [
  {
    id: '1',
    orderNumber: 'ORD-00012',
    customerName: 'Acme Industrial',
    orderType: 'Standard',
    machineId: 'm1',
    products: [
      { name: 'Steel Frame Assembly', quantity: 40 },
      { name: 'Bracket Kit B', quantity: 20 },
      { name: 'M8 Bolt Pack', quantity: 8 },
      { name: 'Guard Rail Set', quantity: 4 },
    ],
    status: 'IN_PRODUCTION',
    orderDate: '2026-08-10',
    dueDate: '2026-08-28',
    priority: 'High',
  },
  {
    id: '2',
    orderNumber: 'ORD-00011',
    customerName: 'Northline Parts',
    orderType: 'Customised',
    machineId: 'm2',
    products: [
      { name: 'Bracket Kit B', quantity: 120 },
      { name: 'Housing Cover', quantity: 30 },
    ],
    status: 'CONFIRMED',
    orderDate: '2026-08-12',
    dueDate: '2026-09-02',
    priority: 'Medium',
  },
  {
    id: '3',
    orderNumber: 'ORD-00010',
    customerName: 'Vista Fabrication',
    orderType: 'Standard',
    machineId: 'm3',
    products: [{ name: 'Housing Cover', quantity: 25 }],
    status: 'DRAFT',
    orderDate: '2026-08-18',
    dueDate: '2026-09-10',
    priority: 'Low',
  }
];

export const ORDER_KPIS = [
  { label: 'Open orders', value: '18', hint: 'Not completed or cancelled' },
  { label: 'In production', value: '7', hint: 'Active on the floor' },
  { label: 'Due this week', value: '4', hint: 'Risk of delay' },
  { label: 'Late / blocked', value: '2', hint: 'Needs attention' },
];

export const FACTORY_KPIS = [
  { label: 'Lines running', value: '9/12', tone: 'success' },
  { label: 'Open work orders', value: '14', tone: 'info' },
  { label: 'At-risk orders', value: '3', tone: 'warning' },
  { label: 'Critical alerts', value: '1', tone: 'danger' },
];

export const ALERTS = [
  {
    id: 'a1',
    severity: 'critical',
    title: 'Weld Cell 3 stopped',
    detail: 'Torch fault — production blocked on ORD-00007',
    time: '4m ago',
  },
  {
    id: 'a2',
    severity: 'warning',
    title: 'ORD-00012 behind schedule',
    detail: 'Paint stage delayed 2.5h vs plan',
    time: '18m ago',
  },
  {
    id: 'a3',
    severity: 'info',
    title: 'Material pick complete',
    detail: 'RM-BEAM-01 issued for WO-00018',
    time: '32m ago',
  },
];

export const MACHINES = [
  {
    id: 'm1',
    name: 'Weld Cell 1',
    station: 'WC-01',
    status: 'RUNNING',
    job: 'WO-00012 · Cut/Weld',
    oee: 86,
  },
  {
    id: 'm2',
    name: 'Weld Cell 2',
    station: 'WC-02',
    status: 'IDLE',
    job: 'Awaiting material',
    oee: 71,
  },
  {
    id: 'm3',
    name: 'Weld Cell 3',
    station: 'WC-03',
    status: 'STOPPED',
    job: 'Fault · ORD-00007',
    oee: 42,
  },
  {
    id: 'm4',
    name: 'Paint Booth',
    station: 'PB-01',
    status: 'WARNING',
    job: 'Filter pressure high',
    oee: 64,
  }
];

export const ACTIVITY = [
  { id: 't1', text: 'Operator Ravi completed Paint on WO-00011', time: '12m' },
  { id: 't2', text: 'Planner released ORD-00011 to production', time: '41m' },
  { id: 't3', text: 'QC failed sample on Housing Cover (rework)', time: '1h' },
  { id: 't4', text: 'Inventory low: M8 Bolt Pack (12 packs left)', time: '2h' },
];

export const CUSTOMERS = [
  {
    id: 'c1',
    name: 'Acme Industrial',
    code: 'ACME',
    region: 'North',
    brands: [
      { id: 'b-acme-1', name: 'Acme Pro', panelStickers: ['None', 'Logo only', 'Full branding', 'Warning labels'] },
      { id: 'b-acme-2', name: 'Acme Lite', panelStickers: ['None', 'Logo only', 'Customer artwork'] },
    ],
  },
  {
    id: 'c2',
    name: 'Northline Parts',
    code: 'NRL',
    region: 'Midwest',
    brands: [
      { id: 'b-nrl-1', name: 'Northline OEM', panelStickers: ['None', 'Logo only', 'Full branding'] },
      { id: 'b-nrl-2', name: 'Private label', panelStickers: ['None', 'Customer artwork', 'Warning labels'] },
    ],
  },
  {
    id: 'c3',
    name: 'Vista Fabrication',
    code: 'VIST',
    region: 'West',
    brands: [
      { id: 'b-vist-1', name: 'Vista Standard', panelStickers: ['None', 'Logo only', 'Full branding', 'Customer artwork'] },
    ],
  },
  {
    id: 'c4',
    name: 'Summit OEM',
    code: 'SMMT',
    region: 'South',
    brands: [
      { id: 'b-smmt-1', name: 'Summit', panelStickers: ['None', 'Logo only'] },
      { id: 'b-smmt-2', name: 'OEM blank', panelStickers: ['None'] },
      { id: 'b-smmt-3', name: 'Private label', panelStickers: ['None', 'Customer artwork', 'Full branding'] },
    ],
  },
  {
    id: 'c5',
    name: 'Delta Works',
    code: 'DLTA',
    region: 'East',
    brands: [
      { id: 'b-dlta-1', name: 'Delta Core', panelStickers: ['None', 'Logo only', 'Warning labels'] },
    ],
  },
  {
    id: 'c6',
    name: 'Helix Robotics',
    code: 'HLX',
    region: 'West',
    brands: [
      { id: 'b-hlx-1', name: 'Helix', panelStickers: ['None', 'Logo only', 'Full branding'] },
      { id: 'b-hlx-2', name: 'Helix Partner', panelStickers: ['None', 'Customer artwork'] },
    ],
  },
  {
    id: 'c7',
    name: 'Orbital Systems',
    code: 'ORB',
    region: 'North',
    brands: [
      { id: 'b-orb-1', name: 'Orbital', panelStickers: ['None', 'Logo only', 'Full branding', 'Warning labels'] },
    ],
  },
  {
    id: 'c8',
    name: 'Prime Castings',
    code: 'PRME',
    region: 'Midwest',
    brands: [
      { id: 'b-prme-1', name: 'Prime', panelStickers: ['None', 'Logo only'] },
      { id: 'b-prme-2', name: 'Arwa co-brand', panelStickers: ['None', 'Logo only', 'Full branding', 'Customer artwork'] },
    ],
  },
];

export const CUSTOMISATIONS = [
  {
    id: 'cust-1',
    orderNumber: 'ORD-00011',
    customerName: 'Northline Parts',
    description: 'Custom powder coat (RAL 5002) for all housing covers.',
    status: 'Pending',
    expectedDate: '2026-08-25',
  },
  {
    id: 'cust-2',
    orderNumber: 'ORD-00008',
    customerName: 'Vista Fabrication',
    description: 'Drill 3 extra mounting holes on the backplate.',
    status: 'In Progress',
    expectedDate: '2026-08-20',
  },
  {
    id: 'cust-3',
    orderNumber: 'ORD-00014',
    customerName: 'Delta Works',
    description: 'Include metric hardware instead of imperial.',
    status: 'Completed',
    expectedDate: '2026-08-18',
  },
];

export const CUSTOMISATION_KPIS = [
  { label: 'Pending requests', value: '12', hint: 'Awaiting engineering review' },
  { label: 'In progress', value: '4', hint: 'Currently being fabricated' },
  { label: 'Completed (MTD)', value: '28', hint: 'Customisations finished this month' },
];


const CUSTOMISATION_SPECS = [
  {
    key: "body_design",
    label: "Body Design",
    type: "select",
    options: ["Standard", "Compact", "Extended", "Heavy Duty", "Custom Profile"],
    required: true
  },
  {
    key: "body_color",
    label: "Body Color",
    type: "select",
    options: ["White", "Black", "Grey", "Blue", "Red", "Yellow", "Custom RAL"],
    required: true
  },
  {
    key: "brand_name",
    label: "Brand Name",
    type: "select",
    /** Resolved from customer.brands at order time. */
    options: [],
    required: true
  },
  {
    key: "panel_sticker",
    label: "Panel Sticker",
    type: "select",
    /** Resolved from the selected brand's panelStickers. */
    options: [],
    required: true
  },
  {
    key: "accessories",
    label: "Accessories",
    type: "customise",
    options: ["Regular", "Customise"],
    detailKey: "accessories_detail",
    required: true,
    placeholder: "Describe accessory customisation\u2026"
  },
  {
    key: "packing",
    label: "Packing",
    type: "customise",
    options: ["Regular", "Customise"],
    detailKey: "packing_detail",
    required: true,
    placeholder: "Describe packing customisation\u2026"
  }
];
const MODEL_OPTION_KEYS = ["body_design", "body_color"];
const CUSTOMER_LINKED_SPEC_KEYS = ["brand_name", "panel_sticker"];
const PRODUCT_MODELS = [
  {
    id: "m-steel-frame",
    code: "SFA-100",
    name: "Steel Frame Assembly",
    category: "Structural",
    specs: CUSTOMISATION_SPECS
  },
  {
    id: "m-bracket",
    code: "BKB-200",
    name: "Bracket Kit B",
    category: "Components",
    specs: CUSTOMISATION_SPECS
  },
  {
    id: "m-housing",
    code: "HCV-310",
    name: "Housing Cover",
    category: "Enclosures",
    specs: CUSTOMISATION_SPECS
  },
  {
    id: "m-motor",
    code: "MMT-450",
    name: "Motor Mount",
    category: "Mechanical",
    specs: CUSTOMISATION_SPECS
  },
  {
    id: "m-chassis",
    code: "CSF-500",
    name: "Chassis Subframe",
    category: "Structural",
    specs: CUSTOMISATION_SPECS
  },
  {
    id: "m-guard",
    code: "GRS-120",
    name: "Guard Rail Set",
    category: "Safety",
    specs: CUSTOMISATION_SPECS
  },
  {
    id: "m-panel",
    code: "PNA-220",
    name: "Panel Assembly",
    category: "Electrical",
    specs: CUSTOMISATION_SPECS
  },
  {
    id: "m-fixture",
    code: "WFA-001",
    name: "Weld Fixture A",
    category: "Tooling",
    specs: CUSTOMISATION_SPECS
  }
];
const MODEL_CATEGORIES = [
  ...new Set(PRODUCT_MODELS.map((m) => m.category))
].sort();
function getModelById(id) {
  return PRODUCT_MODELS.find((m) => m.id === id);
}
function defaultSpecsForModel(model) {
  const out = {};
  for (const field of model.specs) {
    if (field.type === "number") {
      out[field.key] = "";
    } else if (field.type === "select" && field.options?.[0]) {
      out[field.key] = field.options[0];
    } else if (field.type === "customise" && field.options?.[0]) {
      out[field.key] = field.options[0];
      if (field.detailKey) out[field.detailKey] = "";
    } else {
      out[field.key] = "";
    }
  }
  return out;
}
function isCustomiseMode(value) {
  return String(value ?? "").toLowerCase() === "customise";
}
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}
function isLineSpecsComplete(line, customer) {
  const model = getModelById(line.modelId);
  if (!model) return false;
  for (const field of model.specs) {
    if (!field.required) continue;
    const val = line.specs[field.key];
    if (val === "" || val === void 0 || val === null) return false;
    if (field.type === "customise" && isCustomiseMode(val) && field.detailKey) {
      if (!stripHtml(String(line.specs[field.detailKey] ?? ""))) return false;
    }
  }
  if (customer) {
    const brandName = String(line.specs.brand_name ?? "");
    const brand = customer.brands.find((b) => b.name === brandName);
    if (!brand) return false;
    const sticker = String(line.specs.panel_sticker ?? "");
    if (!brand.panelStickers.includes(sticker)) return false;
  }
  return true;
}
export {
  CUSTOMER_LINKED_SPEC_KEYS,
  CUSTOMISATION_SPECS,
  MODEL_CATEGORIES,
  MODEL_OPTION_KEYS,
  PRODUCT_MODELS,
  defaultSpecsForModel,
  getModelById,
  isCustomiseMode,
  isLineSpecsComplete,
  stripHtml
};
