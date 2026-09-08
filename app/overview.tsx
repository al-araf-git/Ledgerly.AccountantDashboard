'use client';

import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Plus,
  Receipt,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

import { summarize, money, type Voucher } from './accounting';
export default function Overview({
  vouchers,
  setView,
  create,
  transactions,
}: {
  vouchers: Voucher[];
  setView: (s: string) => void;
  create: (s: string) => void;
  transactions: React.ReactNode;
}) {
  const totals = summarize(vouchers);
  const unpaid = vouchers.filter(
    (v) =>
      v.type === 'Sales invoice' && v.status === 'Posted' && v.paid < v.total,
  ).length;
  const flow = months.map((month, i) => {
    const monthly = vouchers.filter(
      (v) => Number(v.date.slice(5, 7)) === i + 1 && v.status === 'Posted',
    );
    return {
      month,
      income: monthly
        .filter((v) => v.type === 'Receipt voucher')
        .reduce((s, v) => s + v.total, 0),
      expense: monthly
        .filter((v) =>
          ['Expense voucher', 'Payroll voucher', 'Payment voucher'].includes(
            v.type,
          ),
        )
        .reduce((s, v) => s + v.total, 0),
    };
  });
  const expenseData = ['5000', '5100', '5200', '5400'].map((code, i) => ({
    name: ['Operations', 'Payroll', 'Marketing', 'Other'][i],
    value: Math.max(
      0,
      vouchers
        .filter((v) => v.status === 'Posted')
        .reduce(
          (s, v) =>
            s +
            v.lines
              .filter(
                (l) =>
                  l.account === code ||
                  (code === '5400' && l.account === '5300'),
              )
              .reduce((n, l) => n + l.debit - l.credit, 0),
          0,
        ),
    ),
  }));
  return (
    <>
      <div className="stats-grid">
        {[
          {
            label: 'Total revenue',
            value: totals.revenue,
            change: 'Posted income',
            icon: TrendingUp,
            color: 'teal',
            points: '0,28 14,21 25,24 37,11 48,17 60,6 73,10 90,0',
          },
          {
            label: 'Total expenses',
            value: totals.expenses,
            change: 'Posted expenses',
            icon: ArrowUpRight,
            color: 'violet',
            points: '0,8 14,13 25,8 37,21 48,14 60,24 73,19 90,29',
          },
          {
            label: 'Net profit',
            value: totals.profit,
            change: 'Revenue − expenses',
            icon: Wallet,
            color: 'blue',
            points: '0,28 14,25 25,29 37,15 48,20 60,9 73,14 90,0',
          },
          {
            label: 'Outstanding invoices',
            value: totals.receivable,
            change: unpaid + ' invoices',
            icon: Receipt,
            color: 'orange',
            points: '0,25 14,14 25,20 37,10 48,18 60,5 73,10 90,3',
          },
        ].map((s, i) => (
          <article
            className="stat-card"
            style={{ animationDelay: `${i * 80}ms` }}
            key={s.label}
          >
            <div className="stat-head">
              <span>{s.label}</span>
              <span className={'stat-icon ' + s.color}>
                <s.icon size={17} />
              </span>
            </div>
            <h2>{money(s.value)}</h2>
            <div className="stat-bottom">
              <span>
                <b className={i === 3 ? 'orange-text' : 'positive'}>
                  {i !== 3 && <ArrowUpRight size={13} />} {s.change}
                </b>
                <small>{i === 3 ? 'awaiting payment' : 'current period'}</small>
              </span>
              <svg className={'spark ' + s.color} viewBox="0 0 92 35">
                <polyline points={s.points} />
              </svg>
            </div>
          </article>
        ))}
      </div>
      <div className="chart-grid">
        <section className="panel cashflow">
          <div className="panel-head">
            <div>
              <h3>Cash flow</h3>
              <p>Your money in, your money out.</p>
            </div>
            <div className="chart-legend">
              <span>
                <i />
                Income
              </span>
              <span>
                <i />
                Expenses
              </span>
            </div>
          </div>
          <div className="cash-total">
            {money(totals.cash)}
            <span className="positive">Available funds</span>
          </div>
          <div className="area-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={flow}
                margin={{ left: 0, right: 10, top: 15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ca58c" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#0ca58c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#e9edf2"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#87909e' }}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(v) => '$' + v / 1000 + 'k'}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#87909e' }}
                  width={45}
                />
                <Tooltip
                  formatter={(v) => money(Number(v))}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e7ebef',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#0a9f86"
                  strokeWidth={3}
                  fill="url(#income)"
                  animationDuration={1800}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expenses"
                  stroke="#a9a0ed"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="transparent"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel expenses">
          <div className="panel-head">
            <h3>Expense breakdown</h3>
            <button
              className="icon-btn"
              aria-label="View expense reports"
              onClick={() => setView('Reports')}
            >
              <ArrowUpRight size={19} />
            </button>
          </div>
          <div className="donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  dataKey="value"
                  innerRadius={69}
                  outerRadius={91}
                  paddingAngle={4}
                  cornerRadius={5}
                  stroke="none"
                  animationDuration={1600}
                >
                  {['#0ba58d', '#9ae0d2', '#aaa0ef', '#e1e8ef'].map((c) => (
                    <Cell key={c} fill={c} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-label">
              <small>Total expenses</small>
              <b>{money(totals.expenses)}</b>
            </div>
          </div>
          <div className="expense-legend">
            {['Operations', 'Payroll', 'Marketing', 'Other'].map((s, i) => (
              <div key={s}>
                <span>
                  <i
                    style={{
                      background: ['#0ba58d', '#9ae0d2', '#aaa0ef', '#e1e8ef'][
                        i
                      ],
                    }}
                  />
                  {s}
                </span>
                <b>
                  {totals.expenses
                    ? Math.round((expenseData[i].value / totals.expenses) * 100)
                    : 0}
                  %
                </b>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="quick-actions">
        <span>QUICK ACTIONS</span>
        {[
          { name: 'Create invoice', icon: FileText },
          { name: 'Record expense', icon: Wallet },
          { name: 'Receive payment', icon: ArrowDownLeft },
          { name: 'Create voucher', icon: BookOpen },
        ].map((a) => (
          <button key={a.name} onClick={() => create(a.name)}>
            <a.icon size={17} />
            {a.name}
            <Plus size={14} />
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Recent transactions</h3>
            <p>A little detail. A lot of clarity.</p>
          </div>
          <button
            className="text-button"
            onClick={() => setView('Transactions')}
          >
            View all transactions <ArrowRight size={16} />
          </button>
        </div>
        {transactions}
      </section>
    </>
  );
}
