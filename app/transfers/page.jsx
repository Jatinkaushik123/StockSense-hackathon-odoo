import AppShell from '../../components/AppShell.jsx';
import OperationForm from '../../components/OperationForm.jsx';
import OperationsBoard from '../../components/OperationsBoard.jsx';
import { requirePageUser } from '../_lib/page-auth.js';
import catalog from '../../modules/products/catalog.js';
import locationService from '../../modules/products/locations.js';
import engineShared from '../../modules/engine/shared.js';
import { createTransferAction } from '../actions/operations.js';
const { listOperations } = engineShared;

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transfers — StockSense' };

export default async function TransfersPage() {
  const user = await requirePageUser();

  const [operations, products, internalLocations] = await Promise.all([
    listOperations({ type: 'internal', limit: 50 }),
    catalog.listProducts({ limit: 200 }),
    locationService.listInternalLocations(),
  ]);

  return (
    <AppShell user={user} active="transfers">
      <header>
        <h1 className="page-title">Internal transfers</h1>
        <p className="page-sub">
          Move stock between zones (TRF-XXXX), e.g. Main Store → Production Floor or Rack A → Rack B.
          Both endpoints are locked in a deterministic order so concurrent transfers never deadlock.
        </p>
      </header>

      <details className="panel">
        <summary>＋ New transfer</summary>
        <OperationForm
          kind="transfer"
          action={createTransferAction}
          products={products}
          locations={internalLocations}
          submitLabel="Create draft transfer"
        />
      </details>

      <section className="panel">
        <h2 className="panel-title">Documents ({operations.length})</h2>
        <OperationsBoard kind="transfer" operations={operations} user={user} />
      </section>
    </AppShell>
  );
}
