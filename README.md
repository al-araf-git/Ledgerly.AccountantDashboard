# Ledgerly Accounting

A responsive accounting SaaS interface built with React 19, TypeScript, Tailwind CSS 4, Recharts, and Vinext. Includes animated financial charts, mobile navigation, accessible dialogs, reduced-motion support, and a coherent teal / midnight visual system.

## Showcase

AI-styled promotional mockups based on Ledgerly, rather than exact application screenshots.

![Ledgerly accounting dashboard](showcase/01-fiverr-cover.png)

![Accounting features showcase](showcase/02-features-showcase.png)

![Desktop, tablet, and mobile presentation](showcase/03-responsive-design.png)

[Download the showcase image bundle](showcase/ledgerly-fiverr-showcase.zip)

## Run

```sh
npm install
npm run dev
```

Open the local address printed by the development server. `npm run build` produces the Cloudflare-compatible production bundle. `npx tsc --noEmit` checks types. `node --test app/accounting.test.mjs` runs accounting tests on Node 24.

## Implemented

- Dashboard derived from posted entries, cash-flow chart, expense distribution.
- 19 document types: sales invoice, purchase bill, receipt, payment, journal, contra, credit note, debit note, sales return, purchase return, payroll, expense, opening balance, delivery note, goods receipt, purchase order, sales order, quotation, pro forma invoice.
- Validated line items, manual tax rates, draft/edit/post/void lifecycle, balanced accounting entries, partial and full invoice/bill payments with linked vouchers.
- Printable documents / browser Save as PDF, search, status/type filters, pagination, CSV exports.
- Manual bank reconciliation and transfers, contacts, product catalog, stock adjustments.
- Profit and loss, balance sheet, trial balance, general ledger, aging, tax summary.
- Company profile, chart of accounts, local activity log, illustrative SaaS plans, JSON backup download.

## Scope and production integration

This is a **local single-organization demo**, not a deployed financial system. It starts with sample data and persists in this browser's localStorage. Settings, the header, help, and documents label this explicitly.

- Authentication, real tenant isolation, team permissions, server-side persistence, cloud synchronization, subscription charging, bank feeds, automated tax filing, and email delivery are not connected.
- Currency is USD. Dates use a calendar financial year. Tax rates are entered manually; no jurisdiction-specific compliance is claimed.
- Inventory quantities are manually managed and do not automatically move with accounting documents.
- Journal vouchers currently use paired accounts; orders and delivery documents do not post to the ledger.
- Credit/debit notes affect ledger accounts but are not allocated against individual invoice/bill balances. Aging lists invoices and bills independently.
- The activity log is device-local, not an immutable compliance audit trail.
- Export a backup before clearing browser storage. JSON restore is not implemented.

Before production, implement authenticated organization-scoped APIs and durable storage, enforce posting and payment validation on the server in transactions, add roles and approval workflows, integrate subscriptions and bank providers, and confirm local accounting/tax requirements.

## Source

- `app/page.tsx`: application navigation and workflows.
- `app/overview.tsx`: animated dashboard.
- `app/accounting.ts`: accounting rules, validation, sample data, exports.
- `app/globals.css`: Tailwind theme and responsive styles.
- `app/accounting.test.mjs`: financial logic checks.

