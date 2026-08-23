import {
  dueDaysLabel,
  orderTotalQty,
  type DummyOrder,
} from '../data/dummy';

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function exportOrdersCsv(orders: DummyOrder[], filename = 'arwa-orders.csv') {
  const header = [
    'Order',
    'Order date',
    'Customer',
    'Order type',
    'Due',
    'Products',
    'Qty',
    'Priority',
    'Status',
  ];
  const rows = orders.map((o) => [
    o.orderNumber,
    o.orderDate,
    o.customerName,
    o.orderType,
    o.dueDate,
    o.products.map((p) => `${p.name} x${p.quantity}`).join('; '),
    String(orderTotalQty(o)),
    o.priority,
    o.status,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function orderBlockHtml(order: DummyOrder) {
  const due = dueDaysLabel(order.dueDate);
  const products = order.products
    .map(
      (p) =>
        `<tr><td>${escapeHtml(p.name)}</td><td style="text-align:right;font-family:ui-monospace,monospace">${p.quantity}</td></tr>`,
    )
    .join('');
  return `
    <section style="margin-bottom:28px;page-break-inside:avoid">
      <h2 style="margin:0 0 8px;font-size:16px;font-family:system-ui,sans-serif">
        ${escapeHtml(order.orderNumber)}
      </h2>
      <dl style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin:0 0 12px;font-family:system-ui,sans-serif;font-size:13px">
        <div><dt style="color:#64748b;font-size:11px;text-transform:uppercase">Customer</dt><dd style="margin:2px 0 0;font-weight:600">${escapeHtml(order.customerName)}</dd></div>
        <div><dt style="color:#64748b;font-size:11px;text-transform:uppercase">Order type</dt><dd style="margin:2px 0 0;font-weight:600">${escapeHtml(order.orderType)}</dd></div>
        <div><dt style="color:#64748b;font-size:11px;text-transform:uppercase">Order date</dt><dd style="margin:2px 0 0;font-weight:600">${escapeHtml(order.orderDate)}</dd></div>
        <div><dt style="color:#64748b;font-size:11px;text-transform:uppercase">Status</dt><dd style="margin:2px 0 0;font-weight:600">${escapeHtml(order.status.replaceAll('_', ' '))}</dd></div>
        <div><dt style="color:#64748b;font-size:11px;text-transform:uppercase">Due</dt><dd style="margin:2px 0 0;font-weight:600">${escapeHtml(due.text)} · ${escapeHtml(order.dueDate)}</dd></div>
        <div><dt style="color:#64748b;font-size:11px;text-transform:uppercase">Priority</dt><dd style="margin:2px 0 0;font-weight:600">${escapeHtml(order.priority)}</dd></div>
        <div><dt style="color:#64748b;font-size:11px;text-transform:uppercase">Total qty</dt><dd style="margin:2px 0 0;font-weight:600;font-family:ui-monospace,monospace">${orderTotalQty(order)}</dd></div>
      </dl>
      <table style="width:100%;border-collapse:collapse;font-family:system-ui,sans-serif;font-size:13px">
        <thead>
          <tr>
            <th style="text-align:left;border-bottom:1px solid #cbd5e1;padding:6px 0;color:#64748b;font-size:11px;text-transform:uppercase">Product</th>
            <th style="text-align:right;border-bottom:1px solid #cbd5e1;padding:6px 0;color:#64748b;font-size:11px;text-transform:uppercase">Qty</th>
          </tr>
        </thead>
        <tbody>${products}</tbody>
      </table>
    </section>`;
}

export function printOrders(orders: DummyOrder[], title = 'Orders') {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return;
  const body =
    orders.length === 0
      ? '<p>No orders to print.</p>'
      : orders.map(orderBlockHtml).join('');
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 24px; color: #0f172a; }
    h1 { font-family: system-ui, sans-serif; font-size: 18px; margin: 0 0 4px; }
    .meta { font-family: system-ui, sans-serif; font-size: 12px; color: #64748b; margin-bottom: 20px; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">${orders.length} order${orders.length === 1 ? '' : 's'} · Printed ${new Date().toLocaleString()}</p>
  ${body}
  <script>window.onload = function () { window.focus(); window.print(); };<\/script>
</body>
</html>`);
  w.document.close();
}

export function printOrder(order: DummyOrder) {
  printOrders([order], `Order ${order.orderNumber}`);
}
