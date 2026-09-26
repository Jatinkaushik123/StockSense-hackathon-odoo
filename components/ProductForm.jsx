'use client';

import ActionForm from './ActionForm.jsx';

export default function ProductForm({ action, product = null, submitLabel = 'Save product' }) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} resetOnSuccess={!product}>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input name="name" defaultValue={product?.name ?? ''} required maxLength={150} placeholder="Industrial Safety Helmet" />
        </label>
        <label className="field">
          <span>SKU</span>
          <input name="sku" defaultValue={product?.sku ?? ''} required maxLength={50} placeholder="SKU-HELMET-001" />
        </label>
        <label className="field">
          <span>Category</span>
          <input name="category" defaultValue={product?.category ?? ''} required maxLength={100} placeholder="Safety Equipment" />
        </label>
        <label className="field">
          <span>Unit of measure</span>
          <input name="uom" defaultValue={product?.uom ?? ''} required maxLength={20} placeholder="pcs / box / kg" />
        </label>
        <label className="field">
          <span>Minimum stock alert</span>
          <input
            name="minStockAlert"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            defaultValue={product?.min_stock_alert ?? 10}
          />
        </label>
      </div>
    </ActionForm>
  );
}
