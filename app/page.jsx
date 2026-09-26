import AppShell from '../components/AppShell.jsx';
import KpiGrid from '../components/KpiGrid.jsx';
import LowStockTable from '../components/LowStockTable.jsx';
import { requirePageUser } from './_lib/page-auth.js';
import { formatWhen, formatQty } from './_lib/format.js';
import dashboard from '../modules/operations/dashboard.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard — StockSense' };

export default async function DashboardPage() {
  const user = await requirePageUser();
  const kpis = await dashboard.getDashboardKpis();

  return (
    <AppShell user={user} active="dashboard">
      <header>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">
          {kpis.internalLocations} internal zones · {kpis.movesTotal.toLocaleString()} immutable
          ledger rows · {kpis.movesToday} posted today
        </p>
      </header>

      <KpiGrid kpis={kpis} />

      <section className="panel">
        <h2 className="panel-title">Low / out of stock</h2>
        <LowStockTable items={kpis.lowStock} />
      </section>

      <section className="panel">
        <h2 className="panel-title">Recent ledger activity</h2>
        {kpis.recentMoves.length === 0 ? (
          <p className="empty">
            No stock movements yet — validate a receipt to post the first ledger entry.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data rtable">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th>From</th>
                  <th>To</th>
                  <th className="num">Qty</th>
                  <th>Document</th>
                </tr>
              </thead>
              <tbody>
                {kpis.recentMoves.map((move) => (
                  <tr key={move.id}>
                    <td data-label="When">{formatWhen(move.timestamp)}</td>
                    <td data-label="Product">
                      {move.product_name} <span className="muted">· {move.sku}</span>
                    </td>
                    <td data-label="From">{move.source_location}</td>
                    <td data-label="To">{move.dest_location}</td>
                    <td className="num" data-label="Qty">
                      {formatQty(move.quantity, move.uom)}
                    </td>
                    <td data-label="Document">
                      <code>{move.reference_no || '—'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
