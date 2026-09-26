import AppShell from '../../components/AppShell.jsx';
import OperationForm from '../../components/OperationForm.jsx';
import OperationsBoard from '../../components/OperationsBoard.jsx';
import { requirePageUser } from '../_lib/page-auth.js';
import catalog from '../../modules/products/catalog.js';
import locationService from '../../modules/products/locations.js';
import engineShared from '../../modules/engine/shared.js';
import { createDeliveryAction } from '../actions/operations.js';
const { listOperations } = engineShared;

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Deliveries — StockSense' };

export default async function DeliveriesPage() {
  const user = await requirePageUser();

  const [operations, products, internalLocations] = await Promise.all([
    listOperations({ type: 'delivery', limit: 50 }),
    catalog.listProducts({ limit: 200 }),
    locationService.listInternalLocations(),
  ]);

  return (
    <AppShell user={user} active="deliveries">
      <header>
        <h1 className="page-title">Outbound deliveries</h1>
        <p className="page-sub">
          Sales orders and dispatch requests (DEL-XXXX). Picking locks the source balance with{' '}
          <code>SELECT … FOR UPDATE</code> — if stock is short the whole document rolls back.
        </p>
      </header>

      <details className="panel">
        <summary>＋ New delivery</summary>
        <OperationForm
          kind="delivery"
          action={createDeliveryAction}
          products={products}
          locations={internalLocations}
          submitLabel="Create draft delivery"
        />
      </details>

      <section className="panel">
        <h2 className="panel-title">Documents ({operations.length})</h2>
        <OperationsBoard kind="delivery" operations={operations} user={user} />
      </section>
    </AppShell>
  );
}
