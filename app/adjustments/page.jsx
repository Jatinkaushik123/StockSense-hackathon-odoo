import AppShell from '../../components/AppShell.jsx';
import OperationForm from '../../components/OperationForm.jsx';
import OperationsBoard from '../../components/OperationsBoard.jsx';
import { requirePageUser } from '../_lib/page-auth.js';
import catalog from '../../modules/products/catalog.js';
import locationService from '../../modules/products/locations.js';
import engineShared from '../../modules/engine/shared.js';
import { createAdjustmentAction } from '../actions/operations.js';
const { listOperations } = engineShared;

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Adjustments — StockSense' };

export default async function AdjustmentsPage() {
  const user = await requirePageUser();
  const isManager = user.role === 'manager';

  const [operations, products, internalLocations] = await Promise.all([
    listOperations({ type: 'adjustment', limit: 50 }),
    catalog.listProducts({ limit: 200 }),
    locationService.listInternalLocations(),
  ]);

  return (
    <AppShell user={user} active="adjustments">
      <header>
        <h1 className="page-title">Stock adjustments</h1>
        <p className="page-sub">
          Reconcile the recorded balance with a physical count (ADJ-XXXX). The discrepancy
          Δ = Counted − Recorded is logged as a compensating move against{' '}
          <strong>Scrap/Loss</strong>.
        </p>
      </header>

      {isManager ? (
        <details className="panel">
          <summary>＋ New physical count</summary>
          <OperationForm
            kind="adjustment"
            action={createAdjustmentAction}
            products={products}
            locations={internalLocations}
            submitLabel="Record counted quantities"
          />
        </details>
      ) : (
        <p className="locked-note">
          Physical counts and adjustments are restricted to the Inventory Manager.
        </p>
      )}

      <section className="panel">
        <h2 className="panel-title">Documents ({operations.length})</h2>
        <OperationsBoard kind="adjustment" operations={operations} user={user} />
      </section>
    </AppShell>
  );
}
