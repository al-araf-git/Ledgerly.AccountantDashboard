import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Ledgerly — Accounting, with clarity',
  description:
    'Your financial workspace for invoices, vouchers, banking, inventory, and accounting reports.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
