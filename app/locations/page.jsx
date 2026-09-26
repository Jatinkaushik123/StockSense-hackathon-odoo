import AppShell from '../../components/AppShell.jsx';
import ActionForm from '../../components/ActionForm.jsx';
import { requirePageUser } from '../_lib/page-auth.js';
import locationService from '../../modules/products/locations.js';
import stockService from '../../modules/products/stock.js';
import { createLocationAction } from '../actions/products.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Locations — StockSense' };

const GROUP_ORDER = [
  { type: 'internal', title: 'Internal zones', hint: 'Physical stock lives here.' },
  { type: 'vendor', title: 'Vendor (virtual)', hint: 'Source party for inbound receipts.' },
  { type: 'customer', title: 'Customer (virtual)', hint: 'Destination party for deliveries.' },
  { type: 'inventory_loss', title: 'Scrap / Loss (virtual)', hint: 'Counterparty for adjustments.' },
];

export default async function LocationsPage() {
  const user = await requirePageUser();
  const isManager = user.role === 'manager';

  const [locations, balances] = await Promise.all([
    locationService.listLocations(),
    stockService.locationSummary({ internalOnly: false }),
  ]);
  const unitsByLocation = new Map(
    balances.map((row) => [row.id, { units: Number(row.total_units), products: row.product_count }])
  );

  return (
    <AppShell user={user} active="locations">
      <header>
        <h1 className="page-title">Warehouse &amp; locations</h1>
        <p className="page-sub">
          Physical zones plus the virtual ledger parties used by the double-entry engines.
        </p>
      </header>

      {isManager ? (
        <details className="panel">
          <summary>＋ Add location</summary>
          <ActionForm action={createLocationAction} submitLabel="Create location" resetOnSuccess>
            <div className="form-grid">
              <label className="field">
                <span>Name</span>
                <input name="name" required maxLength={100} placeholder="Rack C" />
              </label>
              <label className="field">
                <span>Warehouse</span>
                <input name="warehouseName" maxLength={100} placeholder="Main Warehouse" />
              </label>
              <label className="field">
                <span>Type</span>
                <select name="type" defaultValue="internal">
                  <option value="internal">Internal zone (physical)</option>
                  <option value="vendor">Vendor (virtual)</option>
                  <option value="customer">Customer (virtual)</option>
                  <option value="inventory_loss">Scrap / Loss (virtual)</option>
                </select>
              </label>
            </div>
          </ActionForm>
        </details>
      ) : (
        <p className="locked-note">Only an Inventory Manager can add locations.</p>
      )}

      {GROUP_ORDER.map((group) => {
        const items = locations.filter((location) => location.type === group.type);
        if (!items.length) return null;
        return (
          <section className="panel" key={group.type}>
            <h2 className="panel-title">{group.title}</h2>
            <p className="hint">{group.hint}</p>
            <div className="loc-grid" style={{ marginTop: 12 }}>
              {items.map((location) => {
                const stats = unitsByLocation.get(location.id);
                const isVirtual = location.type !== 'internal';
                return (
                  <article className="loc-card" key={location.id}>
                    <span className={isVirtual ? 'type-tag virtual' : 'type-tag'}>
                      {location.type.replace('_', ' ')}
                    </span>
                    <h3>{location.name}</h3>
                    <p>
                      {location.warehouse_name}
                      {!isVirtual && stats
                        ? ` · ${stats.units.toLocaleString()} units · ${stats.products} product(s)`
                        : ''}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </AppShell>
  );
}
