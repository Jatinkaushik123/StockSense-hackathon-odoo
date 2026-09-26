import './globals.css';

export const metadata = {
  title: 'StockSense — Inventory Management',
  description:
    'Enterprise double-entry inventory management: receipts, deliveries, internal transfers, stock adjustments and an immutable stock ledger.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
