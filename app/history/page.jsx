import AppShell from '../../components/AppShell.jsx';
import { requirePageUser } from '../_lib/page-auth.js';
import { formatWhen, formatQty } from '../_lib/format.js';
import history from '../../modules/operations/moveHistory.js';
import catalog from '../../modules/products/catalog.js';
import locationService from '../../modules/products/locations.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Move history — StockSense' };

function buildQuery(base, overrides) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${base.path}?${query}` : base.path;
}

export default async function HistoryPage({ searchParams }) {
  const user = await requirePageUser();
  const params = (await searchParams) ?? {};

  const search = typeof params.q === 'string' && params.q ? params.q : null;
  const type = ['receipt', 'delivery', 'internal', 'adjustment'].includes(params.type)
    ? params.type
    : null;
  const locationFilter = params.location ? Number(params.location) : null;
  const page = params.page ? Math.max(0, Number(params.page)) : 0;

  const [result, stats, locations] = await Promise.all([
    history.listMoves({ page, pageSize: 20, search, type, locationId: locationFilter }),
    history.moveStats(),
    locationService.listLocations(),
  ]);

  const baseFilters = {
    path: '/history',
    q: search,
    type,
    location: locationFilter,
  };

  return (
    <AppShell user={user} active="history">
      <header>
        <h1 className="page-title">Move history</h1>
        <p className="page-sub">
          Immutable double-entry audit log — every row joins the product, both locations, the
          document and the responsible user.
        </p>
      </header>

      <section className="stat-grid" aria-label="Ledger statistics">
        <div className="kpi-card">
          <p className="kpi-label">Ledger rows</p>
          <p className="kpi-value">{stats.totalMoves.toLocaleString()}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Units moved</p>
          <p className="kpi-value">{stats.totalUnits.toLocaleString()}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Posted today</p>
          <p className="kpi-value">{stats.movesToday}</p>
        </div>
      </section>

      <form className="filter-bar" method="get" action="/history">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ''}
          placeholder="Search product, SKU or document…"
          aria-label="Search"
        />
        <select name="type" defaultValue={type ?? ''} aria-label="Document type">
          <option value="">All document types</option>
          <option value="receipt">Receipts</option>
          <option value="delivery">Deliveries</option>
          <option value="internal">Internal transfers</option>
          <option value="adjustment">Adjustments</option>
        </select>
        <select
          name="location"
          defaultValue={locationFilter ? String(locationFilter) : ''}
          aria-label="Location"
        >
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
        <a className="btn btn-ghost" href="/history">
          Reset
        </a>
      </form>

      <section className="panel">
        <h2 className="panel-title">
          {result.total.toLocaleString()} movement{result.total === 1 ? '' : 's'}
        </h2>
        {result.moves.length === 0 ? (
          <p className="empty">No ledger rows match this filter.</p>
        ) : (
          <div className="table-wrap">
            <table className="data rtable">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Document</th>
                  <th>Product</th>
                  <th>From</th>
                  <th>To</th>
                  <th className="num">Qty</th>
                  <th>Responsible</th>
                </tr>
              </thead>
              <tbody>
                {result.moves.map((move) => (
                  <tr key={move.id}>
                    <td data-label="When">{formatWhen(move.timestamp)}</td>
                    <td data-label="Document">
                      <code>{move.reference_no || '—'}</code>
                    </td>
                    <td data-label="Product">
                      {move.product_name} <span className="muted">· {move.sku}</span>
                    </td>
                    <td data-label="From">{move.source_location}</td>
                    <td data-label="To">{move.dest_location}</td>
                    <td className="num" data-label="Qty">
                      {formatQty(move.quantity, move.uom)}
                    </td>
                    <td data-label="Responsible">{move.responsible || 'system'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {result.pageCount > 1 ? (
        <nav className="pagination" aria-label="Pagination">
          <a
            className={`pager ${result.page === 0 ? 'disabled' : ''}`}
            href={buildQuery(baseFilters, { page: Math.max(0, result.page - 1) })}
          >
            ‹ Prev
          </a>
          <span className="pager active">
            {result.page + 1} / {result.pageCount}
          </span>
          <a
            className={`pager ${result.page >= result.pageCount - 1 ? 'disabled' : ''}`}
            href={buildQuery(baseFilters, { page: Math.min(result.pageCount - 1, result.page + 1) })}
          >
            Next ›
          </a>
        </nav>
      ) : null}
    </AppShell>
  );
}
