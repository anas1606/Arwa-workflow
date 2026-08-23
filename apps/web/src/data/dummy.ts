export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderType = 'Standard' | 'Customised';

export type MachineStatus = 'RUNNING' | 'IDLE' | 'WARNING' | 'STOPPED';

export type OrderLine = {
  name: string;
  quantity: number;
  modelId?: string;
  specs?: Record<string, string | number>;
};

export type DummyOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  orderType: OrderType;
  machineId: string;
  products: OrderLine[];
  status: OrderStatus;
  orderDate: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
};

export const ORDER_TYPES: OrderType[] = ['Standard', 'Customised'];

export function orderTotalQty(order: DummyOrder) {
  return order.products.reduce((sum, line) => sum + line.quantity, 0);
}

/** Relative due label from ISO date (YYYY-MM-DD). */
export function dueDaysLabel(dueDate: string, now = new Date()) {
  const due = new Date(`${dueDate}T12:00:00`);
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  const diff = Math.round(
    (due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return { text: 'Due today', tone: 'warning' as const };
  if (diff === 1) return { text: '1 day left', tone: 'info' as const };
  if (diff > 1) return { text: `${diff} days left`, tone: 'neutral' as const };
  if (diff === -1) return { text: '1 day overdue', tone: 'danger' as const };
  return { text: `${Math.abs(diff)} days overdue`, tone: 'danger' as const };
}

export type AlertItem = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  time: string;
};

export type MachineItem = {
  id: string;
  name: string;
  station: string;
  status: MachineStatus;
  job: string;
  oee: number;
};

export type ActivityItem = {
  id: string;
  text: string;
  time: string;
};

export const DUMMY_ORDERS: DummyOrder[] = [
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
  },
  {
    id: '4',
    orderNumber: 'ORD-00009',
    customerName: 'Summit OEM',
    orderType: 'Standard',
    machineId: 'm4',
    products: [
      { name: 'Motor Mount', quantity: 60 },
      { name: 'Chassis Subframe', quantity: 10 },
      { name: 'Weld Fixture A', quantity: 2 },
    ],
    status: 'COMPLETED',
    orderDate: '2026-07-28',
    dueDate: '2026-08-18',
    priority: 'Low',
  },
  {
    id: '5',
    orderNumber: 'ORD-00008',
    customerName: 'Delta Works',
    orderType: 'Customised',
    machineId: 'm5',
    products: [{ name: 'Panel Assembly', quantity: 15 }],
    status: 'CANCELLED',
    orderDate: '2026-07-20',
    dueDate: '2026-08-15',
    priority: 'Low',
  },
  {
    id: '6',
    orderNumber: 'ORD-00007',
    customerName: 'Helix Robotics',
    orderType: 'Standard',
    machineId: 'm6',
    products: [
      { name: 'Weld Fixture A', quantity: 8 },
      { name: 'Steel Frame Assembly', quantity: 4 },
    ],
    status: 'IN_PRODUCTION',
    orderDate: '2026-08-08',
    dueDate: '2026-08-25',
    priority: 'High',
  },
  {
    id: '7',
    orderNumber: 'ORD-00006',
    customerName: 'Orbital Systems',
    orderType: 'Standard',
    machineId: 'm1',
    products: [{ name: 'Chassis Subframe', quantity: 22 }],
    status: 'CONFIRMED',
    orderDate: '2026-08-15',
    dueDate: '2026-09-05',
    priority: 'High',
  },
  {
    id: '8',
    orderNumber: 'ORD-00005',
    customerName: 'Prime Castings',
    orderType: 'Customised',
    machineId: 'm2',
    products: [
      { name: 'Guard Rail Set', quantity: 50 },
      { name: 'Panel Assembly', quantity: 12 },
      { name: 'Motor Mount', quantity: 6 },
      { name: 'Housing Cover', quantity: 6 },
    ],
    status: 'IN_PRODUCTION',
    orderDate: '2026-08-09',
    dueDate: '2026-08-27',
    priority: 'Low',
  },
  {
    id: '9',
    orderNumber: 'ORD-00004',
    customerName: 'Acme Industrial',
    orderType: 'Standard',
    machineId: 'm3',
    products: [{ name: 'Steel Frame Assembly', quantity: 12 }],
    status: 'CONFIRMED',
    orderDate: '2026-08-20',
    dueDate: '2026-09-08',
    priority: 'High',
  },
  {
    id: '10',
    orderNumber: 'ORD-00003',
    customerName: 'Northline Parts',
    orderType: 'Standard',
    machineId: 'm5',
    products: [
      { name: 'Bracket Kit B', quantity: 80 },
      { name: 'M8 Bolt Pack', quantity: 40 },
    ],
    status: 'DRAFT',
    orderDate: '2026-08-22',
    dueDate: '2026-09-12',
    priority: 'Low',
  },
];

export const ORDER_KPIS = [
  { label: 'Open orders', value: '18', hint: 'Not completed or cancelled' },
  { label: 'In production', value: '7', hint: 'Active on the floor' },
  { label: 'Due this week', value: '4', hint: 'Risk of delay' },
  { label: 'Late / blocked', value: '2', hint: 'Needs attention' },
];

export const FACTORY_KPIS = [
  { label: 'Lines running', value: '9/12', tone: 'success' as const },
  { label: 'Open work orders', value: '14', tone: 'info' as const },
  { label: 'At-risk orders', value: '3', tone: 'warning' as const },
  { label: 'Critical alerts', value: '1', tone: 'danger' as const },
];

export const ALERTS: AlertItem[] = [
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

export const MACHINES: MachineItem[] = [
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
  },
  {
    id: 'm5',
    name: 'CNC Fixture',
    station: 'CNC-02',
    status: 'RUNNING',
    job: 'WO-00015 · Prep',
    oee: 91,
  },
  {
    id: 'm6',
    name: 'QC Bench',
    station: 'QC-01',
    status: 'RUNNING',
    job: 'Inspection queue: 4',
    oee: 78,
  },
];

export const ACTIVITY: ActivityItem[] = [
  { id: 't1', text: 'Operator Ravi completed Paint on WO-00011', time: '12m' },
  { id: 't2', text: 'Planner released ORD-00011 to production', time: '41m' },
  { id: 't3', text: 'QC failed sample on Housing Cover (rework)', time: '1h' },
  { id: 't4', text: 'Inventory low: M8 Bolt Pack (12 packs left)', time: '2h' },
];
