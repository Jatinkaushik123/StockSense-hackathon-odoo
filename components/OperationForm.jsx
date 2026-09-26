'use client';

import { useActionState, useRef, useState } from 'react';
import SubmitButton from './SubmitButton.jsx';

const KIND_CONFIG = {
  receipt: {
    partnerLabel: 'Supplier',
    partnerPlaceholder: 'e.g. Acme Industrial Supply',
    quantityLabel: 'Qty in',
    addLabel: '＋ Add product line',
  },
  delivery: {
    partnerLabel: 'Customer / order',
    partnerPlaceholder: 'e.g. Metro Construction Ltd.',
    quantityLabel: 'Qty out',
    addLabel: '＋ Add product line',
  },
  transfer: {
    partnerLabel: null,
    quantityLabel: 'Qty moved',
    addLabel: '＋ Add product line',
  },
  adjustment: {
    partnerLabel: null,
    quantityLabel: 'Counted qty',
    addLabel: '＋ Add counted product',
  },
};

function LocationSelect({ name, label, locations, defaultValue }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue ?? ''} required>
        <option value="" disabled>
          Select location…
        </option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
            {location.warehouse_name ? ` — ${location.warehouse_name}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Renders the create-document form for one operation kind.
 * Line rows are dynamic; repeated `productId` + quantity fields are
 * read back in the Server Action with formData.getAll().
 */
export default function OperationForm({ kind, action, products, locations, submitLabel }) {
  const config = KIND_CONFIG[kind] || KIND_CONFIG.receipt;
  const [state, formAction] = useActionState(action, null);
  const [rows, setRows] = useState([{ id: 1 }, { id: 2 }]);
  const nextRowId = useRef(3);

  const quantityKey = kind === 'adjustment' ? 'countedQty' : 'quantity';
  const minQuantity = kind === 'adjustment' ? 0 : 1;
  const fieldErrors = state?.fieldErrors ? Object.values(state.fieldErrors) : [];

  const addRow = () => {
    setRows((current) => [...current, { id: nextRowId.current }]);
    nextRowId.current += 1;
  };
  const removeRow = (id) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  return (
    <form action={formAction} className="form">
      {config.partnerLabel ? (
        <label className="field">
          <span>{config.partnerLabel}</span>
          <input
            name="partnerName"
            maxLength={150}
            placeholder={config.partnerPlaceholder}
            autoComplete="off"
          />
        </label>
      ) : null}

      <div className="form-grid">
        {kind === 'receipt' ? (
          <LocationSelect name="destLocationId" label="Receive into" locations={locations} />
        ) : null}
        {kind === 'delivery' ? (
          <LocationSelect name="sourceLocationId" label="Pick from" locations={locations} />
        ) : null}
        {kind === 'transfer' ? (
          <>
            <LocationSelect name="sourceLocationId" label="From zone" locations={locations} />
            <LocationSelect name="destLocationId" label="To zone" locations={locations} />
          </>
        ) : null}
        {kind === 'adjustment' ? (
          <LocationSelect name="locationId" label="Counted at" locations={locations} />
        ) : null}
      </div>

      <div className="lines">
        <div className="lines-head">
          <span>Product</span>
          <span>{config.quantityLabel}</span>
          <span aria-hidden="true" />
        </div>
        {rows.map((row) => (
          <div className="line-row" key={row.id}>
            <select name="productId" aria-label="Product" defaultValue="">
              <option value="">Select product…</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.sku}
                </option>
              ))}
            </select>
            <input
              name={quantityKey}
              type="number"
              inputMode="numeric"
              step="1"
              min={minQuantity}
              placeholder="0"
              aria-label={config.quantityLabel}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => removeRow(row.id)}
              aria-label="Remove line"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm add-line" onClick={addRow}>
          {config.addLabel}
        </button>
      </div>

      {fieldErrors.length > 0 ? (
        <ul className="form-error" role="alert">
          {fieldErrors.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      ) : null}
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok && state?.data?.message ? (
        <p className="form-success" role="status">
          {state.data.message}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} full />
    </form>
  );
}
