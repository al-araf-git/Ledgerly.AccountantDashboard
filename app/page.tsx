'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Plus,
  Printer,
  Receipt,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import Overview from './overview';
import {
  accounts,
  balances,
  cents,
  createLines,
  csv,
  itemTotals,
  money,
  nonPosting,
  outstanding,
  seedState,
  summarize,
  today,
  validateVoucher,
  voucherTypes,
  type Voucher,
  type VoucherType,
  type State,
  type Item,
  type Line,
} from './accounting';
const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Transactions', icon: ArrowDownLeft },
  { label: 'Sales & invoices', icon: FileText },
  { label: 'Purchases & bills', icon: FolderOpen },
  { label: 'Vouchers', icon: BookOpen },
  { label: 'Banking', icon: Wallet },
  { label: 'Contacts', icon: Users },
  { label: 'Inventory', icon: Package },
  { label: 'Reports', icon: TrendingUp },
];
function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="choice" aria-label={label}>
        <SelectValue>
          {typeof options[0] === 'string'
            ? value
            : (options as { value: string; label: string }[]).find(
                (o) => o.value === value,
              )?.label || value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem
            key={typeof o === 'string' ? o : o.value}
            value={typeof o === 'string' ? o : o.value}
          >
            {typeof o === 'string' ? o : o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function download(name: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function status(v: Voucher) {
  if (v.status !== 'Posted') return v.status;
  if (nonPosting(v.type)) return 'Issued';
  if (['Sales invoice', 'Purchase bill'].includes(v.type))
    return outstanding(v) === 0
      ? 'Paid'
      : v.due < today()
        ? 'Overdue'
        : v.paid
          ? 'Partial'
          : 'Unpaid';
  return 'Posted';
}
export default function Home() {
  const [data, setData] = useState<State>(seedState);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('Overview');
  const [period, setPeriod] = useState('2026');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All documents');
  const [modal, setModal] = useState('');
  const [type, setType] = useState<VoucherType>('Sales invoice');
  const [selected, setSelected] = useState<Voucher | null>(null);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [toast, setToast] = useState('');
  const [report, setReport] = useState('Profit & loss');
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState('');
  const [contactRole, setContactRole] = useState('Customer');
  const [bank, setBank] = useState('1010');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ledgerly-workspace-v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          Array.isArray(parsed.vouchers) &&
          Array.isArray(parsed.contacts) &&
          Array.isArray(parsed.stock) &&
          Array.isArray(parsed.audit) &&
          typeof parsed.company === 'string'
        ) {
          for (const v of parsed.vouchers) validateVoucher(v);
          setData(parsed);
        }
      }
    } catch {
      setToast('Saved workspace could not be loaded. Sample data is shown.');
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem('ledgerly-workspace-v1', JSON.stringify(data));
      } catch {
        setToast(
          'Browser storage is full or unavailable. Export a backup before leaving.',
        );
      }
  }, [data, loaded]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4800);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    setPage(1);
  }, [view, search, filter]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('workspace-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  function go(name: string) {
    setView(name);
    setSearch('');
    setFilter('All documents');
    setPage(1);
  }
  function change(fn: (s: State) => State, action: string) {
    setData((s) => {
      const next = fn(s);
      return {
        ...next,
        audit: [
          { id: crypto.randomUUID(), at: new Date().toISOString(), action },
          ...next.audit,
        ],
      };
    });
    setToast(action);
  }
  function openCreate(value: string) {
    const map: Record<string, VoucherType> = {
      'Create invoice': 'Sales invoice',
      'Record expense': 'Expense voucher',
      'Receive payment': 'Receipt voucher',
      'Create voucher': 'Journal voucher',
    };
    setType(
      map[value] || voucherTypes.find((t) => t === value) || 'Sales invoice',
    );
    setEditing(null);
    setFormError('');
    setModal('create');
  }
  const current = data.vouchers.filter((v) => v.date.startsWith(period));
  const totals = summarize(current);
  const currentBalances = balances(
    data.vouchers.filter((v) => v.date <= period + '-12-31'),
  );
  const filtered = useMemo(
    () =>
      current
        .filter((v) => {
          const category =
            view === 'Sales & invoices'
              ? [
                  'Sales invoice',
                  'Credit note',
                  'Sales return',
                  'Quotation',
                  'Pro forma invoice',
                  'Sales order',
                  'Delivery note',
                ].includes(v.type)
              : view === 'Purchases & bills'
                ? [
                    'Purchase bill',
                    'Debit note',
                    'Purchase return',
                    'Purchase order',
                    'Goods receipt',
                  ].includes(v.type)
                : true;
          return (
            category &&
            (filter === 'All documents' ||
              filter === v.type ||
              filter === status(v)) &&
            `${v.id} ${v.party} ${v.type} ${v.notes}`
              .toLowerCase()
              .includes(search.toLowerCase())
          );
        })
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
    [current, view, filter, search],
  );
  const liveSelected = selected
    ? data.vouchers.find((v) => v.id === selected.id) || selected
    : null;
  function exportVouchers() {
    download(
      'ledgerly-transactions.csv',
      csv(
        [
          'Number',
          'Type',
          'Contact',
          'Date',
          'Due date',
          'Status',
          'Total USD',
          'Paid USD',
          'Outstanding USD',
        ],
        filtered.map((v) => [
          v.id,
          v.type,
          v.party,
          v.date,
          v.due,
          status(v),
          v.total,
          v.paid,
          outstanding(v),
        ]),
      ),
    );
    setToast('Transactions exported');
  }
  function settle(v: Voucher, amount: number) {
    const due = outstanding(v);
    if (!Number.isFinite(amount) || amount <= 0 || amount > due) {
      setFormError(
        'Enter an amount greater than zero and no more than the outstanding balance.',
      );
      return;
    }
    const isSale = v.type === 'Sales invoice';
    const payment: Voucher = {
      id: 'VCH-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
      type: isSale ? 'Receipt voucher' : 'Payment voucher',
      party: v.party,
      date: today(),
      due: today(),
      reference: v.id,
      linkedId: v.id,
      notes: 'Payment against ' + v.id,
      status: 'Posted',
      items: [
        {
          description: 'Payment against ' + v.id,
          quantity: 1,
          rate: amount,
          tax: 0,
        },
      ],
      lines: createLines(
        isSale ? 'Receipt voucher' : 'Payment voucher',
        amount,
        0,
        isSale ? '1010' : '2000',
        isSale ? '1100' : '1010',
      ),
      total: amount,
      paid: 0,
      reconciled: false,
      createdAt: new Date().toISOString(),
    };
    validateVoucher(payment);
    change(
      (s) => ({
        ...s,
        vouchers: [
          ...s.vouchers.map((x) =>
            x.id === v.id ? { ...x, paid: cents(x.paid + amount) } : x,
          ),
          payment,
        ],
      }),
      'Payment recorded for ' + v.id,
    );
    setModal('detail');
  }
  function table(records: Voucher[], compact = false) {
    return (
      <Table className="data-table">
        <TableHeader>
          <TableRow>
            <TableHead>Document / contact</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {!compact && <TableHead className="text-right">Balance</TableHead>}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((v, i) => (
            <TableRow
              key={v.id}
              onClick={() => {
                setSelected(v);
                setModal('detail');
              }}
              className="click-row"
            >
              <TableCell>
                <button
                  className="record-link"
                  onClick={() => {
                    setSelected(v);
                    setModal('detail');
                  }}
                >
                  <span className={'company-icon company-' + (i % 4)}>
                    {v.party.charAt(0)}
                  </span>
                  <span>
                    <b>{v.party}</b>
                    <small>{v.id}</small>
                  </span>
                </button>
              </TableCell>
              <TableCell>{v.type}</TableCell>
              <TableCell className="date-cell">{v.date}</TableCell>
              <TableCell>
                <span className={'badge status-' + status(v).toLowerCase()}>
                  {status(v)}
                </span>
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {money(v.total)}
              </TableCell>
              {!compact && (
                <TableCell className="text-right tabular-nums">
                  {['Sales invoice', 'Purchase bill'].includes(v.type)
                    ? money(outstanding(v))
                    : '—'}
                </TableCell>
              )}
              <TableCell>
                <ArrowUpRight size={15} className="text-slate-400" />
              </TableCell>
            </TableRow>
          ))}
          {!records.length && (
            <TableRow>
              <TableCell colSpan={7}>
                <div className="empty-state">
                  <Search size={28} />
                  <h3>No documents found</h3>
                  <p>Try another search or create your first document.</p>
                  <button
                    className="btn primary"
                    onClick={() => openCreate('Sales invoice')}
                  >
                    <Plus size={16} />
                    Create document
                  </button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }
  return (
    <SidebarProvider>
      <Sidebar className="app-sidebar">
        <SidebarHeader>
          <a className="brand" href="/">
            <span className="brand-mark">
              <BookOpen size={22} />
            </span>
            ledgerly<span className="brand-dot">.</span>
          </a>
          <button className="workspace" onClick={() => setModal('workspace')}>
            <span className="workspace-logo">{data.company.charAt(0)}</span>
            <span>
              <b>{data.company}</b>
              <small>Organization workspace</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </SidebarHeader>
        <SidebarContent>
          <div className="nav-caption">WORKSPACE</div>
          <nav>
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => go(label)}
                className={'nav-item ' + (view === label ? 'selected' : '')}
              >
                <Icon size={19} />
                {label}
                {label === 'Vouchers' && (
                  <span className="nav-count">
                    {data.vouchers.filter((v) => v.status === 'Draft').length ||
                      19}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="nav-caption">ORGANIZATION</div>
          <button
            className={'nav-item ' + (view === 'Settings' ? 'selected' : '')}
            onClick={() => go('Settings')}
          >
            <Settings2 size={19} />
            Settings
          </button>
        </SidebarContent>
        <SidebarFooter>
          <div className="upgrade">
            <span>
              <Sparkles size={18} /> ROOM TO GROW
            </span>
            <b>Your next chapter, unlocked.</b>
            <p>More clarity. More possibilities.</p>
            <button
              onClick={() => {
                go('Settings');
                setReport('Plans');
              }}
            >
              Explore plans <ArrowUpRight size={16} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setModal('help')}>
            <LifeBuoy size={18} />
            Help & resources <ArrowUpRight size={15} />
          </button>
          <div className="profile">
            <span className="avatar">AM</span>
            <span>
              <b>Alex Morgan</b>
              <small>Workspace owner</small>
            </span>
            <button
              aria-label="Profile settings"
              onClick={() => go('Settings')}
            >
              <ChevronDown size={15} />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger />
            <span>Workspace</span>
            <span>/</span>
            <b>{view}</b>
          </div>
          <div className="top-actions">
            <span className="demo-chip">
              <span />
              Local demo workspace
            </span>
            <button
              aria-label="Search documents"
              onClick={() => {
                go('Transactions');
                setTimeout(
                  () => document.getElementById('workspace-search')?.focus(),
                  100,
                );
              }}
            >
              <Search size={19} />
            </button>
            <button
              aria-label="Notifications"
              className="bell"
              onClick={() => setModal('notifications')}
            >
              <Bell size={19} />
              <i />
            </button>
            <button aria-label="Open profile" onClick={() => go('Settings')}>
              <span className="avatar small">AM</span>
            </button>
          </div>
        </header>
        <main className="page">
          <div className="page-title">
            <div>
              <div className="eyebrow">
                {view === 'Overview'
                  ? 'YOUR BUSINESS, AT A GLANCE'
                  : 'YOUR FINANCIAL WORKSPACE'}
              </div>
              <h1>
                {view === 'Overview' ? 'Financial overview' : view}
                <span className="greeting-dot">.</span>
              </h1>
              <p>
                {
                  (
                    {
                      Overview:
                        'Welcome back, Alex. Let’s make every number count.',
                      Transactions: 'Every movement, in one clear picture.',
                      'Sales & invoices':
                        'From the first quote to the final payment.',
                      'Purchases & bills':
                        'Stay on top of spending and supplier balances.',
                      Vouchers:
                        'Good bookkeeping starts with the right document.',
                      Banking: 'A clear view of your cash and bank activity.',
                      Contacts:
                        'The people and businesses behind your numbers.',
                      Inventory: 'Keep your products and stock levels in view.',
                      Reports: 'Turn your books into better decisions.',
                      Settings: 'Make this workspace your own.',
                    } as Record<string, string>
                  )[view]
                }
              </p>
            </div>
            <div className="title-actions">
              <Choice
                label="Financial year"
                value={period}
                onChange={setPeriod}
                options={['2026', '2025', '2027']}
              />
              <button
                className="btn primary"
                onClick={() =>
                  view === 'Contacts'
                    ? setModal('contact')
                    : view === 'Inventory'
                      ? setModal('stock')
                      : openCreate(
                          view === 'Purchases & bills'
                            ? 'Purchase bill'
                            : 'Sales invoice',
                        )
                }
              >
                <Plus size={17} />
                {view === 'Contacts'
                  ? 'Add contact'
                  : view === 'Inventory'
                    ? 'Add product'
                    : 'Create new'}
              </button>
            </div>
          </div>
          {view === 'Overview' && (
            <Overview
              vouchers={current}
              setView={go}
              create={openCreate}
              transactions={table(
                [...current]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 5),
                true,
              )}
            />
          )}
          {[
            'Transactions',
            'Sales & invoices',
            'Purchases & bills',
            'Vouchers',
          ].includes(view) && (
            <>
              {view === 'Vouchers' && (
                <div className="voucher-catalog">
                  {voucherTypes.map((t, i) => (
                    <button
                      className="voucher-tile"
                      key={t}
                      onClick={() => openCreate(t)}
                    >
                      <span
                        className={
                          'stat-icon ' +
                          ['teal', 'violet', 'blue', 'orange'][i % 4]
                        }
                      >
                        {i % 2 ? <Receipt size={18} /> : <BookOpen size={18} />}
                      </span>
                      <b>{t}</b>
                      <Plus size={15} />
                      <small>
                        {nonPosting(t)
                          ? 'Non-posting document'
                          : 'Double-entry accounting'}
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {['Sales & invoices', 'Purchases & bills'].includes(view) && (
                <div className="summary-strip">
                  {[
                    {
                      label:
                        'Total ' +
                        (view === 'Sales & invoices' ? 'invoiced' : 'billed'),
                      value: filtered
                        .filter((v) => v.status === 'Posted')
                        .reduce((s, v) => s + v.total, 0),
                    },
                    {
                      label: 'Outstanding',
                      value: filtered.reduce((s, v) => s + outstanding(v), 0),
                    },
                    {
                      label: 'Overdue',
                      value: filtered
                        .filter((v) => status(v) === 'Overdue')
                        .reduce((s, v) => s + outstanding(v), 0),
                    },
                  ].map((x) => (
                    <div key={x.label}>
                      <small>{x.label}</small>
                      <b>{money(x.value)}</b>
                    </div>
                  ))}
                </div>
              )}
              <section className="panel">
                <div className="panel-head">
                  <h3>
                    {view === 'Vouchers'
                      ? 'Document register'
                      : view === 'Transactions'
                        ? 'All transactions'
                        : 'Documents'}
                  </h3>
                  <button className="btn" onClick={exportVouchers}>
                    <Download size={15} />
                    Export CSV
                  </button>
                </div>
                <div className="table-toolbar">
                  <label className="search-input">
                    <Search size={17} />
                    <input
                      id="workspace-search"
                      placeholder="Search name, document, or reference…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <kbd>⌘ K</kbd>
                  </label>
                  <Choice
                    label="Filter documents"
                    value={filter}
                    onChange={setFilter}
                    options={[
                      'All documents',
                      'Draft',
                      'Posted',
                      'Paid',
                      'Unpaid',
                      'Overdue',
                      'Partial',
                      'Void',
                      ...voucherTypes,
                    ]}
                  />
                </div>
                {table(filtered.slice((page - 1) * 10, page * 10))}
                <div className="pagination">
                  <span>
                    {filtered.length
                      ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, filtered.length)}`
                      : '0'}{' '}
                    of {filtered.length} documents
                  </span>
                  <div>
                    <button
                      className="btn"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn"
                      disabled={page * 10 >= filtered.length}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
          {view === 'Banking' && (
            <>
              <div className="bank-grid">
                {['1010', '1020', '1000'].map((code, i) => (
                  <button
                    key={code}
                    onClick={() => setBank(code)}
                    className={'bank-card ' + (bank === code ? 'active' : '')}
                  >
                    <div>
                      <span>{accounts.find((a) => a.code === code)?.name}</span>
                      <Wallet size={21} />
                    </div>
                    <small>
                      {i === 2
                        ? 'Cash account'
                        : 'USD account •••• ' + [4821, 9043][i]}
                    </small>
                    <b>{money(currentBalances[code])}</b>
                    <span>
                      {bank === code ? 'Selected account' : 'View activity'}{' '}
                      <ArrowRight size={15} />
                    </span>
                  </button>
                ))}
              </div>
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Reconciliation</h3>
                    <p>
                      Mark entries after comparing them with your bank
                      statement.
                    </p>
                  </div>
                  <button
                    className="btn"
                    onClick={() => openCreate('Contra voucher')}
                  >
                    <Plus size={16} />
                    Transfer funds
                  </button>
                </div>
                <div className="notice">
                  <ShieldCheck size={17} />
                  Manual reconciliation · bank feeds are not connected.
                </div>
                <Table className="data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Money in</TableHead>
                      <TableHead>Money out</TableHead>
                      <TableHead>Reconciliation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {current
                      .filter(
                        (v) =>
                          v.status === 'Posted' &&
                          v.lines.some((l) => l.account === bank),
                      )
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.date}</TableCell>
                          <TableCell>
                            <b>{v.party}</b>
                            <small className="block text-slate-400">
                              {v.id}
                            </small>
                          </TableCell>
                          <TableCell className="positive">
                            {money(
                              v.lines
                                .filter((l) => l.account === bank)
                                .reduce((s, l) => s + l.debit, 0),
                            )}
                          </TableCell>
                          <TableCell>
                            {money(
                              v.lines
                                .filter((l) => l.account === bank)
                                .reduce((s, l) => s + l.credit, 0),
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                              className={
                                'btn ' + (v.reconciled ? 'reconciled' : '')
                              }
                              onClick={() =>
                                change(
                                  (s) => ({
                                    ...s,
                                    vouchers: s.vouchers.map((x) =>
                                      x.id === v.id
                                        ? { ...x, reconciled: !x.reconciled }
                                        : x,
                                    ),
                                  }),
                                  v.id +
                                    (v.reconciled
                                      ? ' marked unreconciled'
                                      : ' reconciled'),
                                )
                              }
                            >
                              {v.reconciled ? (
                                <>
                                  <Check size={14} />
                                  Reconciled
                                </>
                              ) : (
                                'Mark reconciled'
                              )}
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </section>
            </>
          )}
          {view === 'Contacts' && (
            <>
              <div className="table-toolbar standalone">
                <label className="search-input">
                  <Search size={17} />
                  <input
                    placeholder="Search contacts…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="contact-grid">
                {data.contacts
                  .filter((c) =>
                    `${c.name} ${c.email}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((c, i) => (
                    <article className="panel contact-card" key={c.id}>
                      <div className="contact-heading">
                        <span className={'company-icon company-' + (i % 4)}>
                          {c.name.charAt(0)}
                        </span>
                        <span className="badge status-draft">{c.role}</span>
                      </div>
                      <h3>{c.name}</h3>
                      <p>{c.email}</p>
                      <p>{c.phone || 'No phone number'}</p>
                      <div className="contact-balance">
                        <small>Outstanding balance</small>
                        <b>
                          {money(
                            data.vouchers
                              .filter(
                                (v) =>
                                  v.party === c.name &&
                                  v.type ===
                                    (c.role === 'Customer'
                                      ? 'Sales invoice'
                                      : 'Purchase bill'),
                              )
                              .reduce((s, v) => s + outstanding(v), 0),
                          )}
                        </b>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => {
                          go(
                            c.role === 'Customer'
                              ? 'Sales & invoices'
                              : 'Purchases & bills',
                          );
                          setSearch(c.name);
                        }}
                      >
                        View documents <ArrowRight size={15} />
                      </button>
                    </article>
                  ))}
              </div>
              {!data.contacts.some((c) =>
                `${c.name} ${c.email}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              ) && <div className="empty-state">No matching contacts.</div>}
            </>
          )}
          {view === 'Inventory' && (
            <>
              <div className="summary-strip">
                <div>
                  <small>Product lines</small>
                  <b>{data.stock.length}</b>
                </div>
                <div>
                  <small>Stock at selling price</small>
                  <b>
                    {money(
                      data.stock.reduce((s, i) => s + i.quantity * i.price, 0),
                    )}
                  </b>
                </div>
                <div>
                  <small>Low-stock products</small>
                  <b>
                    {data.stock.filter((i) => i.quantity <= i.reorder).length}
                  </b>
                </div>
              </div>
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Product catalog</h3>
                    <p>
                      Manual stock tracking. Accounting documents do not adjust
                      quantities.
                    </p>
                  </div>
                  <button
                    className="btn"
                    onClick={() =>
                      download(
                        'inventory.csv',
                        csv(
                          [
                            'SKU',
                            'Product',
                            'Quantity',
                            'Selling price',
                            'Reorder level',
                          ],
                          data.stock.map((i) => [
                            i.sku,
                            i.name,
                            i.quantity,
                            i.price,
                            i.reorder,
                          ]),
                        ),
                      )
                    }
                  >
                    <Download size={15} />
                    Export
                  </button>
                </div>
                <Table className="data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Unit price</TableHead>
                      <TableHead>Stock level</TableHead>
                      <TableHead>Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.stock.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell>{i.sku}</TableCell>
                        <TableCell>{money(i.price)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              'badge ' +
                              (i.quantity <= i.reorder ? 'status-overdue' : '')
                            }
                          >
                            {i.quantity <= i.reorder ? 'Low stock' : 'In stock'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <form
                            className="quantity-control"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const amount = Number(
                                new FormData(e.currentTarget).get('quantity'),
                              );
                              if (Number.isInteger(amount) && amount >= 0)
                                change(
                                  (s) => ({
                                    ...s,
                                    stock: s.stock.map((x) =>
                                      x.id === i.id
                                        ? { ...x, quantity: amount }
                                        : x,
                                    ),
                                  }),
                                  'Stock updated for ' + i.name,
                                );
                            }}
                          >
                            <input
                              aria-label={'Quantity for ' + i.name}
                              type="number"
                              name="quantity"
                              min="0"
                              step="1"
                              defaultValue={i.quantity}
                              required
                            />
                            <button className="btn" type="submit">
                              Update
                            </button>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            </>
          )}
          {view === 'Reports' && (
            <>
              <Tabs
                value={
                  [
                    'Profit & loss',
                    'Balance sheet',
                    'Trial balance',
                    'General ledger',
                    'Aging',
                    'Tax summary',
                  ].includes(report)
                    ? report
                    : 'Profit & loss'
                }
                onValueChange={(v) => setReport(String(v))}
              >
                <TabsList className="report-tabs">
                  {[
                    'Profit & loss',
                    'Balance sheet',
                    'Trial balance',
                    'General ledger',
                    'Aging',
                    'Tax summary',
                  ].map((r) => (
                    <TabsTrigger value={r} key={r}>
                      {r}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Reports
                report={report}
                vouchers={current}
                allVouchers={data.vouchers.filter(
                  (v) => v.date <= period + '-12-31',
                )}
                company={data.company}
                period={period}
              />
            </>
          )}
          {view === 'Settings' && (
            <>
              <Tabs
                value={
                  [
                    'Company',
                    'Chart of accounts',
                    'Audit trail',
                    'Plans',
                    'Data & backup',
                  ].includes(report)
                    ? report
                    : 'Company'
                }
                onValueChange={(v) => setReport(String(v))}
              >
                <TabsList className="report-tabs">
                  {[
                    'Company',
                    'Chart of accounts',
                    'Audit trail',
                    'Plans',
                    'Data & backup',
                  ].map((r) => (
                    <TabsTrigger value={r} key={r}>
                      {r}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {![
                'Chart of accounts',
                'Audit trail',
                'Plans',
                'Data & backup',
              ].includes(report) && (
                <section className="panel settings-panel">
                  <h3>Company details</h3>
                  <p>Your company identity appears on printed documents.</p>
                  <form
                    className="settings-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      change(
                        (s) => ({
                          ...s,
                          company: String(f.get('company')).trim(),
                          email: String(f.get('email')).trim(),
                        }),
                        'Company settings saved',
                      );
                    }}
                  >
                    <label>
                      Company name
                      <input
                        name="company"
                        defaultValue={data.company}
                        required
                        maxLength={80}
                      />
                    </label>
                    <label>
                      Email address
                      <input
                        name="email"
                        type="email"
                        defaultValue={data.email}
                        required
                      />
                    </label>
                    <label>
                      Base currency
                      <input value="USD — US Dollar" readOnly />
                    </label>
                    <label>
                      Financial year
                      <input value="January – December" readOnly />
                    </label>
                    <button className="btn primary" type="submit">
                      Save changes
                    </button>
                  </form>
                  <div className="notice">
                    This demo uses one local organization, USD, and an owner
                    profile. Authentication, team permissions, and subscription
                    charging are not connected.
                  </div>
                </section>
              )}
              {report === 'Chart of accounts' && (
                <section className="panel">
                  <div className="panel-head">
                    <h3>Chart of accounts</h3>
                    <span className="badge">{accounts.length} accounts</span>
                  </div>
                  <Table className="data-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead className="text-right">
                          Net debit / (credit)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((a) => (
                        <TableRow key={a.code}>
                          <TableCell>{a.code}</TableCell>
                          <TableCell>{a.name}</TableCell>
                          <TableCell>
                            <span className="badge status-draft">{a.type}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {money(currentBalances[a.code])}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}
              {report === 'Audit trail' && (
                <section className="panel">
                  <div className="panel-head">
                    <h3>Workspace activity</h3>
                    <span className="badge">Local activity log</span>
                  </div>
                  {data.audit.map((a) => (
                    <div className="audit-row" key={a.id}>
                      <span className="audit-icon">
                        <Check size={16} />
                      </span>
                      <span>
                        <b>{a.action}</b>
                        <small>{new Date(a.at).toLocaleString()}</small>
                      </span>
                      <span className="avatar small">AM</span>
                    </div>
                  ))}
                </section>
              )}
              {report === 'Plans' && (
                <>
                  <div className="notice">
                    Illustrative SaaS plans. No subscription or payment is
                    created in this demo.
                  </div>
                  <div className="plans-grid">
                    {[
                      {
                        name: 'Starter',
                        price: 19,
                        features: [
                          'Invoices & receipts',
                          'Core financial reports',
                          '1 organization',
                          '1 team member',
                        ],
                      },
                      {
                        name: 'Growth',
                        price: 49,
                        features: [
                          'Everything in Starter',
                          'Vouchers & inventory',
                          'Bank reconciliation',
                          'Up to 5 team members',
                        ],
                      },
                      {
                        name: 'Scale',
                        price: 99,
                        features: [
                          'Everything in Growth',
                          'Multi-company workspaces',
                          'Custom roles & approvals',
                          'Priority support',
                        ],
                      },
                    ].map((p, i) => (
                      <section
                        key={p.name}
                        className={
                          'panel plan-card ' + (i === 1 ? 'featured-plan' : '')
                        }
                      >
                        <span className="eyebrow">
                          {i === 1
                            ? 'BUILT FOR YOUR NEXT CHAPTER'
                            : p.name.toUpperCase()}
                        </span>
                        <h3>{p.name}</h3>
                        <h2>
                          ${p.price}
                          <small>/ month</small>
                        </h2>
                        {p.features.map((f) => (
                          <p key={f}>
                            <Check size={16} />
                            {f}
                          </p>
                        ))}
                        <button
                          className={'btn ' + (i === 1 ? 'primary' : '')}
                          onClick={() =>
                            setToast(
                              p.name +
                                ' plan preview selected. Billing is not connected.',
                            )
                          }
                        >
                          Preview {p.name}
                          <ArrowUpRight size={15} />
                        </button>
                      </section>
                    ))}
                  </div>
                </>
              )}
              {report === 'Data & backup' && (
                <section className="panel settings-panel">
                  <h3>Your workspace data</h3>
                  <p>
                    Records are saved in this browser only. Export a JSON backup
                    to keep a portable copy.
                  </p>
                  <div className="backup-actions">
                    <button
                      className="btn primary"
                      onClick={() =>
                        download(
                          'ledgerly-backup-' + today() + '.json',
                          JSON.stringify(data, null, 2),
                          'application/json',
                        )
                      }
                    >
                      <Download size={17} />
                      Download backup
                    </button>
                    <button className="btn" onClick={exportVouchers}>
                      Export transactions
                    </button>
                  </div>
                  <p>
                    Cloud synchronization, live bank feeds, production access
                    controls, and billing require a backend integration.
                  </p>
                </section>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={14} />
              Your books. Beautifully in balance.
            </span>
            <span>
              USD <span>•</span>{' '}
              {loaded ? 'Saved on this device' : 'Loading workspace'}{' '}
              <span>•</span> Demo company
            </span>
          </footer>
        </main>
      </div>
      <Dialog
        open={modal !== ''}
        onOpenChange={(open) => {
          if (!open) {
            setModal('');
            setFormError('');
          }
        }}
      >
        <DialogContent
          className={
            'app-dialog ' +
            (['create', 'detail'].includes(modal) ? 'wide-dialog' : '')
          }
        >
          {modal === 'create' && (
            <VoucherForm
              type={type}
              setType={setType}
              data={data}
              editing={editing}
              onCancel={() => setModal('')}
              onSave={(v) => {
                change(
                  (s) => ({
                    ...s,
                    vouchers: editing
                      ? s.vouchers.map((x) => (x.id === editing.id ? v : x))
                      : [...s.vouchers, v],
                  }),
                  v.id +
                    (v.status === 'Draft'
                      ? ' saved as draft'
                      : nonPosting(v.type)
                        ? ' issued'
                        : ' posted'),
                );
                setSelected(v);
                setModal('detail');
              }}
            />
          )}
          {modal === 'detail' && liveSelected && (
            <>
              <DialogTitle className="dialog-heading">
                {liveSelected.type}
              </DialogTitle>
              <DialogDescription>
                {liveSelected.id} · {status(liveSelected)}
              </DialogDescription>
              <div className="document-preview" id="print-document">
                <div className="document-brand">
                  <div>
                    <BookOpen size={28} />
                    <h2>{data.company}</h2>
                    <p>{data.email}</p>
                  </div>
                  <div>
                    <span>{liveSelected.type.toUpperCase()}</span>
                    <h3>{liveSelected.id}</h3>
                    <p>Date: {liveSelected.date}</p>
                    <p>Due: {liveSelected.due}</p>
                  </div>
                </div>
                <div className="document-party">
                  <small>TO / FROM</small>
                  <h3>{liveSelected.party}</h3>
                  <p>
                    {liveSelected.reference &&
                      'Reference: ' + liveSelected.reference}
                  </p>
                </div>
                <Table className="data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveSelected.items.map((i, k) => (
                      <TableRow key={k}>
                        <TableCell>{i.description}</TableCell>
                        <TableCell>{i.quantity}</TableCell>
                        <TableCell>{money(i.rate)}</TableCell>
                        <TableCell>{i.tax}%</TableCell>
                        <TableCell className="text-right">
                          {money(
                            cents(i.quantity * i.rate * (1 + i.tax / 100)),
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="document-total">
                  <div>
                    <span>Subtotal</span>
                    <b>{money(itemTotals(liveSelected.items).subtotal)}</b>
                  </div>
                  <div>
                    <span>Tax</span>
                    <b>{money(itemTotals(liveSelected.items).tax)}</b>
                  </div>
                  <div>
                    <span>Total (USD)</span>
                    <b>{money(liveSelected.total)}</b>
                  </div>
                  {['Sales invoice', 'Purchase bill'].includes(
                    liveSelected.type,
                  ) && (
                    <>
                      <div>
                        <span>Paid</span>
                        <b>{money(liveSelected.paid)}</b>
                      </div>
                      <div>
                        <span>Balance due</span>
                        <b>{money(outstanding(liveSelected))}</b>
                      </div>
                    </>
                  )}
                </div>
                <p className="document-notes">{liveSelected.notes}</p>
                {!nonPosting(liveSelected.type) && (
                  <details className="journal-details">
                    <summary>
                      Accounting entries · {liveSelected.status}
                    </summary>
                    <Table className="data-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead>Debit</TableHead>
                          <TableHead>Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {liveSelected.lines.map((l, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              {l.account} ·{' '}
                              {accounts.find((a) => a.code === l.account)?.name}
                            </TableCell>
                            <TableCell>{money(l.debit)}</TableCell>
                            <TableCell>{money(l.credit)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </details>
                )}
                <div className="document-footnote">
                  {liveSelected.status === 'Draft'
                    ? 'DRAFT — not posted to the ledger'
                    : liveSelected.status === 'Void'
                      ? 'VOID — excluded from the ledger'
                      : 'Generated by Ledgerly'}{' '}
                  · Local demo document
                </div>
              </div>
              <div className="dialog-actions">
                <button className="btn" onClick={() => window.print()}>
                  <Printer size={16} />
                  Print / PDF
                </button>
                {liveSelected.status === 'Draft' && (
                  <>
                    <button
                      className="btn"
                      onClick={() => {
                        setEditing(liveSelected);
                        setType(liveSelected.type);
                        setModal('create');
                      }}
                    >
                      Edit draft
                    </button>
                    <button
                      className="btn primary"
                      onClick={() => {
                        try {
                          validateVoucher(liveSelected);
                          change(
                            (s) => ({
                              ...s,
                              vouchers: s.vouchers.map((v) =>
                                v.id === liveSelected.id
                                  ? { ...v, status: 'Posted' }
                                  : v,
                              ),
                            }),
                            liveSelected.id + ' posted',
                          );
                        } catch (e) {
                          setToast((e as Error).message);
                        }
                      }}
                    >
                      Post document
                    </button>
                  </>
                )}
                {['Sales invoice', 'Purchase bill'].includes(
                  liveSelected.type,
                ) &&
                  outstanding(liveSelected) > 0 && (
                    <button
                      className="btn primary"
                      onClick={() => {
                        setFormError('');
                        setModal('payment');
                      }}
                    >
                      <CreditCard size={16} />
                      {liveSelected.type === 'Sales invoice'
                        ? 'Receive payment'
                        : 'Record payment'}
                    </button>
                  )}
                {liveSelected.status !== 'Void' &&
                  liveSelected.paid === 0 &&
                  !liveSelected.linkedId && (
                    <button
                      className="btn danger"
                      onClick={() => setModal('void')}
                    >
                      Void
                    </button>
                  )}
              </div>
            </>
          )}
          {modal === 'payment' && liveSelected && (
            <>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>
                {liveSelected.id} · {money(outstanding(liveSelected))}{' '}
                outstanding
              </DialogDescription>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  settle(
                    liveSelected,
                    Number(new FormData(e.currentTarget).get('amount')),
                  );
                }}
                className="simple-form"
              >
                <label>
                  Amount received / paid (USD)
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    max={outstanding(liveSelected)}
                    step="0.01"
                    defaultValue={outstanding(liveSelected)}
                    required
                  />
                </label>
                <p>
                  Account: Mercury checking. The payment creates a linked,
                  balanced voucher.
                </p>
                {formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
                <button className="btn primary" type="submit">
                  Confirm payment
                </button>
              </form>
            </>
          )}
          {modal === 'void' && liveSelected && (
            <>
              <DialogTitle>Void {liveSelected.id}?</DialogTitle>
              <DialogDescription>
                The document stays in your history, but its accounting entries
                will be excluded from your reports.
              </DialogDescription>
              <div className="dialog-actions">
                <button className="btn" onClick={() => setModal('detail')}>
                  Keep document
                </button>
                <button
                  className="btn danger"
                  onClick={() => {
                    change(
                      (s) => ({
                        ...s,
                        vouchers: s.vouchers.map((v) =>
                          v.id === liveSelected.id
                            ? { ...v, status: 'Void' }
                            : v,
                        ),
                      }),
                      liveSelected.id + ' voided',
                    );
                    setModal('detail');
                  }}
                >
                  Void document
                </button>
              </div>
            </>
          )}
          {modal === 'contact' && (
            <>
              <DialogTitle>Add contact</DialogTitle>
              <DialogDescription>
                Keep customer and supplier information together.
              </DialogDescription>
              <form
                className="simple-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const name = String(f.get('name')).trim();
                  if (
                    data.contacts.some(
                      (c) => c.name.toLowerCase() === name.toLowerCase(),
                    )
                  ) {
                    setFormError('A contact with this name already exists.');
                    return;
                  }
                  change(
                    (s) => ({
                      ...s,
                      contacts: [
                        ...s.contacts,
                        {
                          id: crypto.randomUUID(),
                          name,
                          email: String(f.get('email')),
                          phone: String(f.get('phone')),
                          role: contactRole as 'Customer' | 'Supplier',
                        },
                      ],
                    }),
                    'Contact added',
                  );
                  setModal('');
                }}
              >
                <label>
                  Company or full name
                  <input name="name" required maxLength={100} />
                </label>
                <label>
                  Contact type
                  <Choice
                    label="Contact type"
                    value={contactRole}
                    onChange={setContactRole}
                    options={['Customer', 'Supplier']}
                  />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Phone
                  <input name="phone" type="tel" />
                </label>
                {formError && <p className="form-error">{formError}</p>}
                <button className="btn primary">Save contact</button>
              </form>
            </>
          )}
          {modal === 'stock' && (
            <>
              <DialogTitle>Add product</DialogTitle>
              <DialogDescription>
                Add an item to your stock catalog.
              </DialogDescription>
              <form
                className="simple-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const sku = String(f.get('sku')).trim();
                  if (
                    data.stock.some(
                      (i) => i.sku.toLowerCase() === sku.toLowerCase(),
                    )
                  ) {
                    setFormError('This SKU already exists.');
                    return;
                  }
                  change(
                    (s) => ({
                      ...s,
                      stock: [
                        ...s.stock,
                        {
                          id: crypto.randomUUID(),
                          name: String(f.get('name')).trim(),
                          sku,
                          quantity: Number(f.get('quantity')),
                          price: Number(f.get('price')),
                          reorder: Number(f.get('reorder')),
                        },
                      ],
                    }),
                    'Product added',
                  );
                  setModal('');
                }}
              >
                <label>
                  Product name
                  <input name="name" required />
                </label>
                <label>
                  SKU
                  <input name="sku" required />
                </label>
                <div className="form-grid">
                  <label>
                    Quantity
                    <input
                      name="quantity"
                      type="number"
                      min="0"
                      step="1"
                      required
                      defaultValue="0"
                    />
                  </label>
                  <label>
                    Unit selling price
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>
                  <label>
                    Reorder level
                    <input
                      name="reorder"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue="10"
                      required
                    />
                  </label>
                </div>
                {formError && <p className="form-error">{formError}</p>}
                <button className="btn primary">Save product</button>
              </form>
            </>
          )}
          {modal === 'workspace' && (
            <>
              <DialogTitle>Your workspace</DialogTitle>
              <DialogDescription>
                This browser contains one local demo organization.
              </DialogDescription>
              <div className="workspace-choice">
                <span className="workspace-logo">{data.company.charAt(0)}</span>
                <b>{data.company}</b>
                <Check size={18} />
              </div>
              <button
                className="btn"
                onClick={() => {
                  setModal('');
                  go('Settings');
                }}
              >
                Manage company
              </button>
            </>
          )}
          {modal === 'notifications' && (
            <>
              <DialogTitle>You’re in the loop</DialogTitle>
              <DialogDescription>
                Items that may need your attention.
              </DialogDescription>
              <button
                className="notification-item"
                onClick={() => {
                  setModal('');
                  go('Sales & invoices');
                  setFilter('Overdue');
                }}
              >
                <Receipt size={22} />
                <span>
                  <b>
                    {
                      current.filter(
                        (v) =>
                          v.type === 'Sales invoice' && status(v) === 'Overdue',
                      ).length
                    }{' '}
                    overdue invoices
                  </b>
                  <small>Review balances and record payments.</small>
                </span>
                <ArrowRight size={16} />
              </button>
              <button
                className="notification-item"
                onClick={() => {
                  setModal('');
                  go('Inventory');
                }}
              >
                <Package size={22} />
                <span>
                  <b>
                    {data.stock.filter((i) => i.quantity <= i.reorder).length}{' '}
                    low-stock products
                  </b>
                  <small>Check your stock levels.</small>
                </span>
                <ArrowRight size={16} />
              </button>
            </>
          )}
          {modal === 'help' && (
            <>
              <DialogTitle>A little help, a lot of clarity</DialogTitle>
              <DialogDescription>
                Your guide to the Ledgerly workspace.
              </DialogDescription>
              <div className="help-list">
                <h3>1. Create a document</h3>
                <p>
                  Use Create new or choose one of 19 voucher types. Fill in the
                  party, line items, dates, and accounts.
                </p>
                <h3>2. Save or post</h3>
                <p>
                  Drafts stay outside the ledger. Posting requires balanced
                  debit and credit entries. Orders and delivery documents do not
                  post accounting entries.
                </p>
                <h3>3. Record payment</h3>
                <p>
                  Open an invoice or bill and record a partial or full payment.
                  A linked voucher updates its balance.
                </p>
                <h3>4. Review and export</h3>
                <p>
                  Explore reports, reconcile bank entries, and print documents
                  to PDF. Download a backup in Settings.
                </p>
                <div className="notice">
                  This is a working local SaaS demo. Records stay on this
                  device. There is no live billing, login, bank connection, or
                  tax filing.
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </SidebarProvider>
  );
}

function VoucherForm({
  type,
  setType,
  data,
  editing,
  onCancel,
  onSave,
}: {
  type: VoucherType;
  setType: (t: VoucherType) => void;
  data: State;
  editing: Voucher | null;
  onCancel: () => void;
  onSave: (v: Voucher) => void;
}) {
  const [items, setItems] = useState<Item[]>(
    editing?.items || [{ description: '', quantity: 1, rate: 0, tax: 0 }],
  );
  const [debit, setDebit] = useState(
    editing?.lines.find((l) => l.debit)?.account || defaultAccounts(type)[0],
  );
  const [credit, setCredit] = useState(
    editing?.lines.find((l) => l.credit)?.account || defaultAccounts(type)[1],
  );
  const [error, setError] = useState('');
  const totals = itemTotals(items);
  const lines = createLines(type, totals.total, totals.tax, debit, credit);
  function switchType(t: string) {
    setType(t as VoucherType);
    setDebit(defaultAccounts(t)[0]);
    setCredit(defaultAccounts(t)[1]);
  }
  function submit(e: React.FormEvent<HTMLFormElement>, draft: boolean) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v: Voucher = {
      id:
        editing?.id ||
        `${type === 'Sales invoice' ? 'INV' : type === 'Purchase bill' ? 'BILL' : 'VCH'}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      type,
      party: String(f.get('party')).trim(),
      date: String(f.get('date')),
      due: String(f.get('due')),
      reference: String(f.get('reference')),
      notes: String(f.get('notes')),
      status: draft ? 'Draft' : 'Posted',
      items,
      lines,
      total: totals.total,
      paid: 0,
      reconciled: false,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    try {
      validateVoucher(v);
      onSave(v);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <DialogTitle className="dialog-heading">
        {editing ? 'Edit draft' : 'Create document'}
      </DialogTitle>
      <DialogDescription>
        {nonPosting(type)
          ? 'Prepare a non-posting business document.'
          : 'Record the details. Keep your books in balance.'}
      </DialogDescription>
      <form
        className="voucher-form"
        onSubmit={(e) =>
          submit(
            e,
            (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') ===
              'draft',
          )
        }
      >
        <div className="form-grid">
          <label>
            Document type
            <Choice
              value={type}
              onChange={switchType}
              options={[...voucherTypes]}
              label="Document type"
            />
          </label>
          <label>
            Customer / supplier / payee
            <input
              name="party"
              list="contacts-list"
              placeholder="Select or enter a contact"
              defaultValue={editing?.party}
              required
              maxLength={100}
            />
            <datalist id="contacts-list">
              {data.contacts.map((c) => (
                <option value={c.name} key={c.id} />
              ))}
            </datalist>
          </label>
          <label>
            Document date
            <input
              type="date"
              name="date"
              defaultValue={editing?.date || today()}
              required
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              name="due"
              defaultValue={editing?.due || today()}
              required
            />
          </label>
          <label className="span-2">
            Reference (optional)
            <input
              name="reference"
              placeholder="PO number or external reference"
              defaultValue={editing?.reference}
            />
          </label>
        </div>
        <div className="line-items">
          <div className="line-item labels">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit rate</span>
            <span>Tax %</span>
            <span>Total</span>
            <span />
          </div>
          {items.map((item, i) => (
            <div className="line-item" key={i}>
              <input
                aria-label={'Description ' + (i + 1)}
                placeholder="Product or service"
                value={item.description}
                onChange={(e) =>
                  setItems(
                    items.map((x, k) =>
                      k === i ? { ...x, description: e.target.value } : x,
                    ),
                  )
                }
                required
              />
              {(['quantity', 'rate', 'tax'] as const).map((field) => (
                <input
                  key={field}
                  aria-label={field + ' ' + (i + 1)}
                  type="number"
                  step={field === 'quantity' ? '0.001' : '0.01'}
                  min={field === 'quantity' ? '0.001' : '0'}
                  max={field === 'tax' ? 100 : undefined}
                  value={item[field]}
                  onChange={(e) =>
                    setItems(
                      items.map((x, k) =>
                        k === i ? { ...x, [field]: Number(e.target.value) } : x,
                      ),
                    )
                  }
                  required
                />
              ))}
              <b>
                {money(cents(item.quantity * item.rate * (1 + item.tax / 100)))}
              </b>
              <button
                type="button"
                aria-label={'Remove line ' + (i + 1)}
                disabled={items.length === 1}
                onClick={() => setItems(items.filter((_, k) => k !== i))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setItems([
                ...items,
                { description: '', quantity: 1, rate: 0, tax: 0 },
              ])
            }
          >
            <Plus size={15} />
            Add line item
          </button>
        </div>
        {!nonPosting(type) &&
          !['Sales invoice', 'Credit note', 'Sales return'].includes(type) && (
            <div className="form-grid accounts-fields">
              <label>
                Debit account
                <Choice
                  value={debit}
                  onChange={setDebit}
                  options={accounts.map((a) => ({
                    value: a.code,
                    label: a.code + ' · ' + a.name,
                  }))}
                  label="Debit account"
                />
              </label>
              {!['Purchase bill', 'Debit note', 'Purchase return'].includes(
                type,
              ) && (
                <label>
                  Credit account
                  <Choice
                    value={credit}
                    onChange={setCredit}
                    options={accounts.map((a) => ({
                      value: a.code,
                      label: a.code + ' · ' + a.name,
                    }))}
                    label="Credit account"
                  />
                </label>
              )}
            </div>
          )}
        <div className="form-bottom">
          <label>
            Notes
            <input
              name="notes"
              placeholder="Payment terms, purpose, or additional details"
              defaultValue={editing?.notes}
            />
          </label>
          <div className="totals-box">
            <div>
              <span>Subtotal</span>
              <b>{money(totals.subtotal)}</b>
            </div>
            <div>
              <span>Tax</span>
              <b>{money(totals.tax)}</b>
            </div>
            <div>
              <span>Total</span>
              <b>{money(totals.total)}</b>
            </div>
          </div>
        </div>
        {!nonPosting(type) && (
          <div className="balance-indicator">
            <ShieldCheck size={15} />
            {lines.length > 0
              ? 'Balanced entry'
              : 'Enter an amount to preview the entry'}
            <span>
              Debit {money(lines.reduce((s, l) => s + l.debit, 0))} = Credit{' '}
              {money(lines.reduce((s, l) => s + l.credit, 0))}
            </span>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" value="draft" className="btn">
            Save draft
          </button>
          <button type="submit" value="post" className="btn primary">
            <Check size={16} />
            {nonPosting(type) ? 'Issue document' : 'Save & post'}
          </button>
        </div>
      </form>
    </>
  );
}
function defaultAccounts(type: string) {
  if (type === 'Receipt voucher') return ['1010', '1100'];
  if (type === 'Payment voucher') return ['2000', '1010'];
  if (type === 'Contra voucher') return ['1020', '1010'];
  if (type === 'Payroll voucher') return ['5100', '1010'];
  if (type === 'Opening balance') return ['1010', '3000'];
  if (type === 'Purchase return' || type === 'Debit note')
    return ['1200', '2000'];
  return ['5000', '1010'];
}

function Reports({
  report,
  vouchers,
  allVouchers,
  company,
  period,
}: {
  report: string;
  vouchers: Voucher[];
  allVouchers: Voucher[];
  company: string;
  period: string;
}) {
  const b = balances(report === 'Balance sheet' ? allVouchers : vouchers);
  const totals = summarize(vouchers);
  let headers: string[] = ['Account', 'Amount (USD)'];
  let rows: (string | number)[][] = [];
  let subtitle = 'January 1 – December 31, ' + period;
  if (report === 'Balance sheet') {
    subtitle = 'As of December 31, ' + period;
    rows = accounts
      .filter((a) => ['Asset', 'Liability', 'Equity'].includes(a.type))
      .map((a) => [
        a.code + ' · ' + a.name,
        a.type === 'Asset' ? b[a.code] : -b[a.code],
      ]);
    const earnings = summarize(allVouchers).profit;
    rows.push(['Retained earnings / current profit', earnings]);
    rows.push([
      'Total assets',
      accounts
        .filter((a) => a.type === 'Asset')
        .reduce((s, a) => s + b[a.code], 0),
    ]);
    rows.push([
      'Total liabilities and equity',
      -accounts
        .filter((a) => a.type === 'Liability' || a.type === 'Equity')
        .reduce((s, a) => s + b[a.code], 0) + earnings,
    ]);
  } else if (report === 'Trial balance') {
    headers = ['Code', 'Account', 'Debit (USD)', 'Credit (USD)'];
    rows = accounts.map((a) => [
      a.code,
      a.name,
      Math.max(0, b[a.code]),
      Math.max(0, -b[a.code]),
    ]);
    rows.push([
      '',
      'Total',
      cents(Object.values(b).reduce((s, n) => s + Math.max(n, 0), 0)),
      cents(Object.values(b).reduce((s, n) => s + Math.max(-n, 0), 0)),
    ]);
  } else if (report === 'General ledger') {
    headers = ['Date', 'Document', 'Account', 'Debit (USD)', 'Credit (USD)'];
    rows = vouchers
      .filter((v) => v.status === 'Posted')
      .sort((a, b) => a.date.localeCompare(b.date))
      .flatMap((v) =>
        v.lines.map((l) => [
          v.date,
          v.id,
          l.account + ' · ' + accounts.find((a) => a.code === l.account)?.name,
          l.debit,
          l.credit,
        ]),
      );
  } else if (report === 'Aging') {
    headers = [
      'Document',
      'Contact',
      'Due date',
      'Days overdue',
      'Balance (USD)',
    ];
    rows = vouchers
      .filter(
        (v) =>
          ['Sales invoice', 'Purchase bill'].includes(v.type) &&
          outstanding(v) > 0,
      )
      .map((v) => [
        v.id,
        v.party,
        v.due,
        Math.max(
          0,
          Math.floor((Date.now() - new Date(v.due).getTime()) / 86400000),
        ),
        outstanding(v),
      ]);
    subtitle = 'Open receivables and payables, aged as of today';
  } else if (report === 'Tax summary') {
    rows = [
      ['Output tax payable', -b['2100']],
      ['Input tax recoverable', b['1300']],
      ['Net tax payable', cents(-b['2100'] - b['1300'])],
    ];
    subtitle = 'Recorded tax only. Review local rules before filing.';
  } else {
    rows = accounts
      .filter((a) => a.type === 'Income' || a.type === 'Expense')
      .map((a) => [a.name, a.type === 'Income' ? -b[a.code] : b[a.code]]);
    rows.push(
      ['Total revenue', totals.revenue],
      ['Total expenses', totals.expenses],
      ['Net profit / (loss)', totals.profit],
    );
  }
  return (
    <section className="panel report-panel">
      <div className="panel-head">
        <div>
          <h3>{report === 'Plans' ? 'Profit & loss' : report}</h3>
          <p>
            {company} · {subtitle}
          </p>
        </div>
        <button
          className="btn"
          onClick={() =>
            download(
              'ledgerly-' + report.toLowerCase().replaceAll(' ', '-') + '.csv',
              csv(headers, rows),
            )
          }
        >
          <Download size={15} />
          Export report
        </button>
      </div>
      {report === 'Profit & loss' && (
        <div className="report-highlight">
          <span>NET PROFIT</span>
          <b>{money(totals.profit)}</b>
          <small>
            {totals.revenue
              ? ((totals.profit / totals.revenue) * 100).toFixed(1)
              : 0}
            % profit margin
          </small>
          <Progress
            value={
              totals.revenue
                ? Math.max(
                    0,
                    Math.min(100, (totals.profit / totals.revenue) * 100),
                  )
                : 0
            }
          />
        </div>
      )}
      <Table className="data-table report-table">
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((c, k) => (
                <TableCell key={k}>
                  {typeof c === 'number' && headers[k].includes('USD')
                    ? money(c)
                    : c}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={headers.length}>
                <div className="empty-state">
                  No posted entries in this period.
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="report-note">
        <ShieldCheck size={15} />
        Only posted entries appear in financial reports. Draft and void
        documents are excluded.
      </div>
    </section>
  );
}
