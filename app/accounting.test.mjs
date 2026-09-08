import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  accounts,
  balances,
  cents,
  createLines,
  itemTotals,
  nonPosting,
  seedState,
  summarize,
  validateVoucher,
  voucherTypes,
  csv,
} from './accounting.ts';
test('every sample transaction balances and the balance sheet reconciles', () => {
  const state = seedState();
  state.vouchers.forEach(validateVoucher);
  const b = balances(state.vouchers);
  assert.equal(cents(Object.values(b).reduce((s, v) => s + v, 0)), 0);
  const totals = summarize(state.vouchers);
  assert.equal(totals.revenue, 128450);
  assert.equal(totals.receivable, 18640);
  const assets = accounts
    .filter((a) => a.type === 'Asset')
    .reduce((s, a) => s + b[a.code], 0);
  const liabilitiesEquity =
    -accounts
      .filter((a) => ['Liability', 'Equity'].includes(a.type))
      .reduce((s, a) => s + b[a.code], 0) + totals.profit;
  assert.equal(cents(assets), cents(liabilitiesEquity));
});
test('tax rounding and all 19 document types produce balanced entries', () => {
  const items = [
    { description: 'Design services', quantity: 3, rate: 33.33, tax: 7.5 },
  ];
  const totals = itemTotals(items);
  assert.deepEqual(totals, { subtotal: 99.99, tax: 7.5, total: 107.49 });
  for (const type of voucherTypes) {
    const lines = createLines(type, totals.total, totals.tax, '5000', '1010');
    const v = {
      ...seedState().vouchers[0],
      type,
      items,
      lines,
      total: totals.total,
    };
    validateVoucher(v);
    assert.equal(cents(lines.reduce((s, l) => s + l.debit - l.credit, 0)), 0);
    if (nonPosting(type)) assert.equal(lines.length, 0);
  }
});
test('draft and void entries have no financial effect', () => {
  const v = seedState().vouchers[0];
  for (const status of ['Draft', 'Void'])
    assert.ok(
      Object.values(balances([{ ...v, status }])).every((v) => v === 0),
    );
});
test('posting refuses negative, unbalanced, non-finite, and invalid account entries', () => {
  const v = seedState().vouchers[0];
  assert.throws(() => validateVoucher({ ...v, total: -1 }));
  assert.throws(() =>
    validateVoucher({
      ...v,
      lines: [{ account: '1010', debit: 20, credit: 0 }],
    }),
  );
  assert.throws(() =>
    validateVoucher({
      ...v,
      lines: [{ account: '1010', debit: NaN, credit: 0 }],
    }),
  );
  assert.throws(() =>
    validateVoucher({
      ...v,
      lines: [
        { account: '9999', debit: 1, credit: 0 },
        { account: '1010', debit: 0, credit: 1 },
      ],
    }),
  );
  assert.throws(() =>
    validateVoucher({
      ...v,
      items: [{ description: 'Bad tax', quantity: 1, rate: 1, tax: 101 }],
    }),
  );
});
test('payment clears receivables without creating additional revenue', () => {
  const invoice = {
    ...seedState().vouchers[1],
    total: 100,
    lines: createLines('Sales invoice', 100, 0),
  };
  const payment = {
    ...invoice,
    type: 'Receipt voucher',
    lines: createLines('Receipt voucher', 100, 0, '1010', '1100'),
  };
  const b = balances([invoice, payment]);
  assert.equal(b['1100'], 0);
  assert.equal(b['1010'], 100);
  assert.equal(b['4000'], -100);
});
test('CSV escapes quotes and spreadsheet formulas', () => {
  assert.equal(
    csv(['Name'], [['=SUM(A1)'], ['A "quote"']]),
    '"Name"\r\n"\'=SUM(A1)"\r\n"A ""quote"""',
  );
});
