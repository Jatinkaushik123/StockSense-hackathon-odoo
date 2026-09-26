import AppShell from '../../components/AppShell.jsx';
import { requirePageUser } from '../_lib/page-auth.js';
import { classForStock, formatQty } from '../_lib/format.js';
import stockService from '../../modules/products/stock.js';
import locationService from '../../modules/products/locations.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Stock levels — StockSense' };

export default async function StockPage({ searchParams }) {
  const user = await requirePageUser();
  const params = (await searchParams) ?? {};

  const search = typeof params.q === 'string' && params.q ? params.q : null;
  const locationId = params.location ? Number(params.location) : null;

  const [rows, zones, locations] = await Promise.all([
    stockService.stockByLocation({ search, locationId }),
    stockService.locationSummary({ internalOnly: true }),
    locationService.listInternalLocations(),
  ]);

  return (
    <AppShell user={user} active="stock">
      <header>
        <h1 className="page-title">Stock levels</h1>
        <p className="page-sub">
          Live balances kept in lock-step with the ledger by every posting engine.
        </p>
      </header>

      <section className="stat-grid" aria-label="Zone summary">
        {zones.map((zone) => (
          <div className="kpi-card" key={zone.id}>
            <p className="kpi-label">{zone.name}</p>
            <p className="kpi-value">{Number(zone.total_units).toLocaleString()}</p>
            <p className="kpi-sub">
              {zone.product_count} product{zone.product_count === 1 ? '' : 's'} stored
            </p>
          </div>
        ))}
      </section>

      <form className="filter-bar" method="get" action="/stock">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ''}
          placeholder="Search product or SKU…"
          aria-label="Search product or SKU"
        />
        <select name="location" defaultValue={locationId ? String(locationId) : ''} aria-label="Location">
          <option value="">All internal zones</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
        <a className="btn btn-ghost" href="/stock">
          Reset
        </a>
      </form>

      <section className="panel">
        <h2 className="panel-title">Balances ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="empty">No stock found for this filter — receive stock to populate balances.</p>
        ) : (
          <div className="table-wrap">
            <table className="data rtable">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Location</th>
                  <th className="num">On hand</th>
                  <th className="num">Min alert</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = classForStock(row.quantity, row.min_stock_alert);
                  return (
                    <tr key={row.id}>
                      <td data-label="Product">{row.product_name}</td>
                      <td data-label="SKU">
                        <code>{row.sku}</code>
                      </td>
                      <td data-label="Location">{row.location_name}</td>
                      <td className="num" data-label="On hand">
                        {formatQty(row.quantity, row.uom)}
                      </td>
                      <td className="num" data-label="Min alert">
                        {row.min_stock_alert}
                      </td>
                      <td data-label="Status">
                        <span className={status.badge}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
