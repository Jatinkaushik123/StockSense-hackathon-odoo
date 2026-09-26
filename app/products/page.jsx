import AppShell from '../../components/AppShell.jsx';
import ProductForm from '../../components/ProductForm.jsx';
import ActionForm from '../../components/ActionForm.jsx';
import { requirePageUser } from '../_lib/page-auth.js';
import { classForStock, formatQty } from '../_lib/format.js';
import catalog from '../../modules/products/catalog.js';
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
} from '../actions/products.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Products — StockSense' };

export default async function ProductsPage({ searchParams }) {
  const user = await requirePageUser();
  const params = (await searchParams) ?? {};
  const search = typeof params.q === 'string' && params.q ? params.q : null;
  const isManager = user.role === 'manager';

  const products = await catalog.listProducts({ search });

  return (
    <AppShell user={user} active="products">
      <header>
        <h1 className="page-title">Product catalog</h1>
        <p className="page-sub">
          Name, SKU, category, unit of measure and minimum alert threshold.
          {isManager ? ' You can add, edit and delete products.' : ' Read-only for Warehouse Staff.'}
        </p>
      </header>

      {isManager ? (
        <details className="panel">
          <summary>＋ Add product</summary>
          <ProductForm action={createProductAction} submitLabel="Create product" />
        </details>
      ) : (
        <p className="locked-note">Only an Inventory Manager can change the catalog.</p>
      )}

      <form className="filter-bar" method="get" action="/products">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ''}
          placeholder="Search name, SKU or category…"
          aria-label="Search products"
        />
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
        <a className="btn btn-ghost" href="/products">
          Reset
        </a>
      </form>

      <section className="panel">
        <h2 className="panel-title">Catalog ({products.length})</h2>
        {products.length === 0 ? (
          <p className="empty">No products match this filter.</p>
        ) : (
          <ul className="op-list">
            {products.map((product) => {
              const status = classForStock(product.on_hand, product.min_stock_alert);
              return (
                <li className="op-card" key={product.id}>
                  <div className="op-head">
                    <div>
                      <p className="op-ref">{product.name}</p>
                      <p className="op-meta">
                        <code>{product.sku}</code> · {product.category} · sold by {product.uom} · min
                        alert {product.min_stock_alert}
                      </p>
                    </div>
                    <div className="row">
                      <strong>{formatQty(product.on_hand, product.uom)}</strong>
                      <span className={status.badge}>{status.label}</span>
                    </div>
                  </div>

                  {isManager ? (
                    <details>
                      <summary>Edit / delete</summary>
                      <ProductForm
                        action={updateProductAction}
                        product={product}
                        submitLabel="Save changes"
                      />
                      <ActionForm
                        action={deleteProductAction}
                        hiddenFields={{ id: product.id }}
                        submitLabel="Delete product"
                        variant="danger"
                        confirmMessage={`Delete ${product.name}? Only products without ledger history can be removed.`}
                      />
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
