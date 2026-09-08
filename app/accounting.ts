export type Account = {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
};
export const accounts: Account[] = [
  { code: '1000', name: 'Cash on hand', type: 'Asset' },
  { code: '1010', name: 'Mercury checking', type: 'Asset' },
  { code: '1020', name: 'Business savings', type: 'Asset' },
  { code: '1100', name: 'Accounts receivable', type: 'Asset' },
  { code: '1200', name: 'Inventory', type: 'Asset' },
  { code: '1300', name: 'Input tax', type: 'Asset' },
  { code: '1500', name: 'Fixed assets', type: 'Asset' },
  { code: '2000', name: 'Accounts payable', type: 'Liability' },
  { code: '2100', name: 'Sales tax payable', type: 'Liability' },
  { code: '2200', name: 'Payroll payable', type: 'Liability' },
  { code: '3000', name: 'Owner equity', type: 'Equity' },
  { code: '4000', name: 'Sales revenue', type: 'Income' },
  { code: '4100', name: 'Other income', type: 'Income' },
  { code: '5000', name: 'Operating expenses', type: 'Expense' },
  { code: '5100', name: 'Payroll expense', type: 'Expense' },
  { code: '5200', name: 'Marketing expense', type: 'Expense' },
  { code: '5300', name: 'Cost of goods sold', type: 'Expense' },
  { code: '5400', name: 'Bank charges', type: 'Expense' },
];
export const voucherTypes = [
  'Sales invoice',
  'Purchase bill',
  'Receipt voucher',
  'Payment voucher',
  'Journal voucher',
  'Contra voucher',
  'Credit note',
  'Debit note',
  'Sales return',
  'Purchase return',
  'Payroll voucher',
  'Expense voucher',
  'Opening balance',
  'Delivery note',
  'Goods receipt',
  'Purchase order',
  'Sales order',
  'Quotation',
  'Pro forma invoice',
] as const;
export type VoucherType = (typeof voucherTypes)[number];
export type Line = { account: string; debit: number; credit: number };
export type Item = {
  description: string;
  quantity: number;
  rate: number;
  tax: number;
};
export type Voucher = {
  id: string;
  type: VoucherType;
  party: string;
  date: string;
  due: string;
  reference: string;
  notes: string;
  status: 'Draft' | 'Posted' | 'Void';
  items: Item[];
  lines: Line[];
  total: number;
  paid: number;
  reconciled: boolean;
  createdAt: string;
  linkedId?: string;
};
export type Contact = {
  id: string;
  name: string;
  email: string;
  role: 'Customer' | 'Supplier';
  phone: string;
};
export type Stock = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  reorder: number;
};
export type Audit = { id: string; at: string; action: string };
export type State = {
  vouchers: Voucher[];
  contacts: Contact[];
  stock: Stock[];
  audit: Audit[];
  company: string;
  email: string;
};
export const cents = (v: number) =>
  Math.round((v + Number.EPSILON) * 100) / 100;
export const itemTotals = (items: Item[]) => {
  const subtotal = cents(
    items.reduce((s, i) => s + cents(i.quantity * i.rate), 0),
  );
  const tax = cents(
    items.reduce((s, i) => s + cents((i.quantity * i.rate * i.tax) / 100), 0),
  );
  return { subtotal, tax, total: cents(subtotal + tax) };
};
export const nonPosting = (t: string) =>
  [
    'Delivery note',
    'Goods receipt',
    'Purchase order',
    'Sales order',
    'Quotation',
    'Pro forma invoice',
  ].includes(t);
export function createLines(
  type: VoucherType,
  total: number,
  tax: number,
  debit = '5000',
  credit = '1010',
): Line[] {
  if (nonPosting(type)) return [];
  const net = cents(total - tax);
  const dr = (account: string, value: number): Line => ({
    account,
    debit: value,
    credit: 0,
  });
  const cr = (account: string, value: number): Line => ({
    account,
    debit: 0,
    credit: value,
  });
  let lines: Line[];
  switch (type) {
    case 'Sales invoice':
      lines = [dr('1100', total), cr('4000', net), cr('2100', tax)];
      break;
    case 'Purchase bill':
      lines = [dr(debit, net), dr('1300', tax), cr('2000', total)];
      break;
    case 'Receipt voucher':
      lines = [dr(debit, total), cr(credit, total)];
      break;
    case 'Credit note':
    case 'Sales return':
      lines = [dr('4000', net), dr('2100', tax), cr('1100', total)];
      break;
    case 'Debit note':
    case 'Purchase return':
      lines = [dr('2000', total), cr(debit, net), cr('1300', tax)];
      break;
    default:
      lines = [
        dr(debit, net),
        ...(tax ? [dr('1300', tax)] : []),
        cr(credit, total),
      ];
  }
  return lines.filter((l) => l.debit || l.credit);
}
export function validateVoucher(v: Voucher) {
  if (!v.party.trim()) throw Error('Enter a customer, supplier, or payee.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(v.date) ||
    !Number.isFinite(Date.parse(v.date))
  )
    throw Error('Choose a valid date.');
  if (
    !v.items.length ||
    v.items.some(
      (i) =>
        !i.description.trim() ||
        !Number.isFinite(i.quantity) ||
        i.quantity <= 0 ||
        !Number.isFinite(i.rate) ||
        i.rate < 0 ||
        !Number.isFinite(i.tax) ||
        i.tax < 0 ||
        i.tax > 100,
    )
  )
    throw Error(
      'Complete every line with a description, positive quantity, and valid rate and tax.',
    );
  if (v.total <= 0 || !Number.isFinite(v.total))
    throw Error('The total must be greater than zero.');
  if (v.due && v.due < v.date)
    throw Error('Due date cannot be before the document date.');
  if (nonPosting(v.type)) return;
  const debit = cents(v.lines.reduce((s, l) => s + l.debit, 0)),
    credit = cents(v.lines.reduce((s, l) => s + l.credit, 0));
  if (!v.lines.length || debit !== credit || debit === 0)
    throw Error('Debits and credits must balance.');
  if (
    v.lines.some(
      (l) =>
        !accounts.some((a) => a.code === l.account) ||
        !Number.isFinite(l.debit) ||
        !Number.isFinite(l.credit) ||
        l.debit < 0 ||
        l.credit < 0 ||
        (l.debit > 0 && l.credit > 0),
    )
  )
    throw Error('Each entry needs a valid account and a debit or credit.');
  if (new Set(v.lines.map((l) => l.account)).size < 2)
    throw Error('Choose different debit and credit accounts.');
}
export function balances(vouchers: Voucher[]) {
  const result: Record<string, number> = Object.fromEntries(
    accounts.map((a) => [a.code, 0]),
  );
  for (const v of vouchers.filter((v) => v.status === 'Posted'))
    for (const l of v.lines)
      result[l.account] = cents((result[l.account] || 0) + l.debit - l.credit);
  return result;
}
export const outstanding = (v: Voucher) =>
  v.status === 'Posted' ? Math.max(0, cents(v.total - v.paid)) : 0;
export function summarize(vouchers: Voucher[]) {
  const b = balances(vouchers);
  const revenue = -accounts
    .filter((a) => a.type === 'Income')
    .reduce((s, a) => s + b[a.code], 0);
  const expenses = accounts
    .filter((a) => a.type === 'Expense')
    .reduce((s, a) => s + b[a.code], 0);
  return {
    revenue,
    expenses,
    profit: cents(revenue - expenses),
    receivable: vouchers
      .filter((v) => v.type === 'Sales invoice')
      .reduce((s, v) => s + outstanding(v), 0),
    payable: vouchers
      .filter((v) => v.type === 'Purchase bill')
      .reduce((s, v) => s + outstanding(v), 0),
    cash: cents(b['1000'] + b['1010'] + b['1020']),
  };
}
export const money = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    v,
  );
export const today = () => new Date().toISOString().slice(0, 10);
export function seedState(): State {
  const vouchers: Voucher[] = [];
  function add(
    type: VoucherType,
    party: string,
    date: string,
    total: number,
    debit: string,
    credit: string,
    description: string,
    paid = 0,
  ) {
    const id = `${type === 'Sales invoice' ? 'INV' : type === 'Purchase bill' ? 'BILL' : 'VCH'}-${String(vouchers.length + 1001)}`;
    vouchers.push({
      id,
      type,
      party,
      date,
      due: date.slice(0, 8) + '28',
      reference: '',
      notes: 'Sample company data',
      status: 'Posted',
      items: [{ description, quantity: 1, rate: total, tax: 0 }],
      lines: createLines(type, total, 0, debit, credit),
      total,
      paid,
      reconciled: false,
      createdAt: date + 'T09:00:00Z',
    });
    return id;
  }
  add(
    'Opening balance',
    'Studio Acme',
    '2026-01-01',
    65000,
    '1010',
    '3000',
    'Opening capital',
  );
  for (let m = 1; m <= 9; m++) {
    const date = `2026-${String(m).padStart(2, '0')}-05`;
    add(
      'Sales invoice',
      ['Linear Studio', 'Notion Labs', 'Arc Technologies'][m % 3],
      date,
      [8500, 10400, 9200, 15600, 11800, 17800, 14900, 19500, 20750][m - 1],
      '1100',
      '4000',
      'Brand strategy and design',
      m < 9
        ? [8500, 10400, 9200, 15600, 11800, 17800, 14900, 19500, 20750][m - 1]
        : 2110,
    );
    add(
      'Receipt voucher',
      'Client payment',
      date,
      m < 9
        ? [8500, 10400, 9200, 15600, 11800, 17800, 14900, 19500, 20750][m - 1]
        : 2110,
      '1010',
      '1100',
      'Payment received',
    );
    add(
      'Expense voucher',
      'Operations',
      date,
      1400 + m * 170,
      '5000',
      '1010',
      'Workspace and subscriptions',
    );
    add(
      'Payroll voucher',
      'Studio team',
      date,
      2800,
      '5100',
      '1010',
      'Monthly payroll',
    );
    add(
      'Expense voucher',
      'Marketing',
      date,
      300 + m * 60,
      '5200',
      '1010',
      'Advertising and promotion',
    );
  }
  add(
    'Purchase bill',
    'Figma, Inc.',
    '2026-09-08',
    240,
    '5000',
    '2000',
    'Annual software subscription',
  );
  add(
    'Purchase bill',
    'Northstar Supply',
    '2026-09-07',
    3200,
    '1200',
    '2000',
    'Studio supplies',
  );
  add(
    'Contra voucher',
    'Business savings',
    '2026-09-08',
    1200,
    '1020',
    '1010',
    'Reserve transfer',
  );
  return {
    vouchers,
    contacts: [
      {
        id: 'c1',
        name: 'Linear Studio',
        email: 'finance@linear.example',
        role: 'Customer',
        phone: '+1 415 555 0101',
      },
      {
        id: 'c2',
        name: 'Notion Labs',
        email: 'billing@notion.example',
        role: 'Customer',
        phone: '+1 415 555 0102',
      },
      {
        id: 'c3',
        name: 'Arc Technologies',
        email: 'accounts@arc.example',
        role: 'Customer',
        phone: '+1 415 555 0103',
      },
      {
        id: 'c4',
        name: 'Figma, Inc.',
        email: 'billing@figma.example',
        role: 'Supplier',
        phone: '+1 415 555 0104',
      },
      {
        id: 'c5',
        name: 'Northstar Supply',
        email: 'hello@northstar.example',
        role: 'Supplier',
        phone: '+1 415 555 0105',
      },
    ],
    stock: [
      {
        id: 's1',
        name: 'Studio notebook',
        sku: 'ST-001',
        quantity: 120,
        price: 18,
        reorder: 20,
      },
      {
        id: 's2',
        name: 'Brand toolkit',
        sku: 'ST-002',
        quantity: 36,
        price: 149,
        reorder: 10,
      },
      {
        id: 's3',
        name: 'Desk organizer',
        sku: 'ST-003',
        quantity: 8,
        price: 42,
        reorder: 15,
      },
    ],
    audit: [
      {
        id: 'a1',
        at: '2026-09-08T09:00:00Z',
        action: 'Demo company initialized with sample transactions',
      },
    ],
    company: 'Studio Acme',
    email: 'hello@studioacme.example',
  };
}
export function csv(headers: string[], rows: unknown[][]) {
  const cell = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+@\-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}
