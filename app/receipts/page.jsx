import AppShell from '../../components/AppShell.jsx';
import OperationForm from '../../components/OperationForm.jsx';
import OperationsBoard from '../../components/OperationsBoard.jsx';
import { requirePageUser } from '../_lib/page-auth.js';
import catalog from '../../modules/products/catalog.js';
import locationService from '../../modules/products/locations.js';
import engineShared from '../../modules/engine/shared.js';
import { createReceiptAction } from '../actions/operations.js';
const { listOperations } = engineShared;

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Receipts — StockSense' };

export default async function ReceiptsPage() {
  const user = await requirePageUser();

  const [operations, products, internalLocations] = await Promise.all([
    listOperations({ type: 'receipt', limit: 50 }),
    catalog.listProducts({ limit: 200 }),
    locationService.listInternalLocations(),
  ]);

  return (
    <AppShell user={user} active="receipts">
      <header>
        <h1 className="page-title">Inbound receipts</h1>
        <p className="page-sub">
          Supplier deliveries (REC-XXXX) posted from the virtual <strong>Vendors</strong> location
          into an internal zone. Workflow: Draft → Waiting → Ready → Done.
        </p>
      </header>

      <details className="panel">
        <summary>＋ New receipt</summary>
        <OperationForm
          kind="receipt"
          action={createReceiptAction}
          products={products}
          locations={internalLocations}
          submitLabel="Create draft receipt"
        />
      </details>

      <section className="panel">
        <h2 className="panel-title">Documents ({operations.length})</h2>
        <OperationsBoard kind="receipt" operations={operations} user={user} />
      </section>
    </AppShell>
  );
}
