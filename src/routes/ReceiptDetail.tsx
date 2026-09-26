import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';

export const ReceiptDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operations, validateReceipt, updateReceiptItem, addToast } = useInventory();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Match REC-2026-0084 by refNo or fallback
  const targetRef = id || 'REC-2026-0084';
  const receipt = operations.find(
    (op) => op.refNo === targetRef || op.id === targetRef
  ) || operations.find((op) => op.refNo === 'REC-2026-0084') || operations[0];

  if (!receipt) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Receipt Not Found</h2>
        <Link to="/" className="text-indigo-600 underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isDone = receipt.status === 'Done';
  const hasDiscrepancy = receipt.items.some((item) => item.variance !== 0);

  const handleValidateClick = () => {
    setConfirmModalOpen(true);
  };

  const handleConfirmValidation = () => {
    setConfirmModalOpen(false);
    validateReceipt(receipt.refNo);
  };

  const totalExpected = receipt.items.reduce((acc, it) => acc + it.expectedQty, 0);
  const totalReceived = receipt.items.reduce((acc, it) => acc + it.receivedQty, 0);
  const totalInboundValue = receipt.items.reduce(
    (acc, it) => acc + it.receivedQty * it.unitCost,
    0
  );

  return (
    <div className="flex flex-col w-full print-container">
      {/* Top Breadcrumb & Timestamp Bar */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Link to="/" className="hover:text-indigo-600 transition-colors">
              Operations
            </Link>
            <span className="material-symbols-outlined text-sm leading-none text-slate-400">
              chevron_right
            </span>
            <Link to="/operations/receipts" className="hover:text-indigo-600 transition-colors">
              Receipts
            </Link>
            <span className="material-symbols-outlined text-sm leading-none text-slate-400">
              chevron_right
            </span>
            <span className="font-mono text-slate-900 font-semibold">{receipt.refNo}</span>
          </nav>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
            <span className="material-symbols-outlined text-sm leading-none">history</span>
            <span>Auto-synced with #PO-2026-8942 · 4m ago</span>
          </div>
        </div>

        {/* Header Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl leading-none">inventory_2</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
                  Receipt / {receipt.refNo}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isDone
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isDone ? 'bg-emerald-600' : 'bg-indigo-600 animate-pulse'
                    }`}
                  />
                  {receipt.status}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                Inbound Physical Stock Intake & Inspection Assessment
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium shadow-xs transition-colors border border-slate-200"
              type="button"
            >
              <span className="material-symbols-outlined text-base leading-none">print</span>
              <span>Print Slip</span>
            </button>

            {!isDone ? (
              <button
                onClick={handleValidateClick}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-base leading-none">check_circle</span>
                <span>Validate Receipt</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold">
                <span className="material-symbols-outlined text-base leading-none">done_all</span>
                <span>Validated & Posted</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Operational Pipeline Stepper Card */}
      <div className="bg-white rounded-lg p-4 shadow-xs mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200">
        <div className="flex items-center gap-4 flex-1">
          {/* Step 1: Draft */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold">
              <span className="material-symbols-outlined text-sm font-bold">check</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Draft</span>
              <span className="text-[10px] text-slate-400">Created PO</span>
            </div>
          </div>

          <div className="flex-1 h-0.5 bg-slate-200" />

          {/* Step 2: Waiting */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold">
              <span className="material-symbols-outlined text-sm font-bold">check</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Waiting</span>
              <span className="text-[10px] text-slate-400">Gate Arrival</span>
            </div>
          </div>

          <div className={`flex-1 h-0.5 ${isDone ? 'bg-slate-200' : 'bg-indigo-600'}`} />

          {/* Step 3: Ready */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              {!isDone && (
                <span className="absolute inline-flex h-7 w-7 animate-ping rounded-full bg-indigo-400 opacity-60" />
              )}
              <div
                className={`relative w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isDone ? 'bg-slate-100 text-slate-700' : 'bg-indigo-600 text-white'
                }`}
              >
                {isDone ? (
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                ) : (
                  '3'
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <span
                className={`text-xs font-bold uppercase tracking-wide ${
                  !isDone ? 'text-indigo-600' : 'text-slate-900'
                }`}
              >
                Ready
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold">Stock Intake</span>
            </div>
          </div>

          <div className={`flex-1 h-0.5 ${isDone ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          {/* Step 4: Done */}
          <div className={`flex items-center gap-2 ${isDone ? 'opacity-100' : 'opacity-50'}`}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {isDone ? (
                <span className="material-symbols-outlined text-sm font-bold">done_all</span>
              ) : (
                '4'
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wide">Done</span>
              <span className="text-[10px] text-slate-400">Ledger Posted</span>
            </div>
          </div>
        </div>

        {/* Stepper Status Note */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600 text-xs border border-slate-200">
          <span className="material-symbols-outlined text-base text-indigo-600 leading-none">
            info
          </span>
          <span>
            {isDone
              ? 'Inbound verified: Ledger updated with physical stock increment.'
              : 'Inbound stage: Goods undergoing intake inspection.'}
          </span>
        </div>
      </div>

      {/* Discrepancy Alert Notification Banner (Dynamic) */}
      {hasDiscrepancy && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg shadow-xs mb-4 flex items-start gap-3 animate-in fade-in duration-150">
          <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg leading-none">warning</span>
          </div>
          <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-900 text-sm">Discrepancy Detected</span>
                <span className="font-mono text-[11px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                  Variance Active
                </span>
              </div>
              <p className="text-rose-700 mt-0.5">
                Physical count received does not match purchase order expected stock. A discrepancy
                note will automatically be recorded upon validation.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-white text-rose-700 font-semibold border border-rose-300 shrink-0">
              Audit Pending
            </span>
          </div>
        </div>
      )}

      {/* Line Items Intake Section Card */}
      <div className="bg-white rounded-lg shadow-xs mb-4 flex flex-col border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Line Items & Physical Count Intake</h2>
            <span className="text-xs text-slate-500">({receipt.items.length} line items)</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Fast intake table active</span>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Product Description</th>
                <th className="py-2.5 px-4">SKU / Barcode</th>
                <th className="py-2.5 px-4 text-center">UoM</th>
                <th className="py-2.5 px-4 text-right">Expected Qty</th>
                <th className="py-2.5 px-4 text-right">Received Qty (Editable)</th>
                <th className="py-2.5 px-4 text-center">Variance</th>
                <th className="py-2.5 px-4 text-right">Unit Cost</th>
                <th className="py-2.5 px-4 text-right">Subtotal</th>
                <th className="py-2.5 px-4 text-center">QC Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {receipt.items.map((item, idx) => {
                const isShort = item.variance < 0;
                const isExcess = item.variance > 0;

                return (
                  <tr
                    key={item.productId || item.sku}
                    className={`hover:bg-slate-50 transition-colors ${
                      isShort ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-sans">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <span className="text-[11px] text-slate-400">
                        {item.sku === 'BRK-001'
                          ? 'Cast Iron Heavy-Duty Fitting'
                          : 'Industrial Quality Specification'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{item.sku}</div>
                      <div className="text-[11px] text-slate-400">{item.barcode || '789123001'}</div>
                    </td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">
                        {item.uom || 'pcs'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-700">
                      {item.expectedQty}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {!isDone ? (
                        <input
                          type="number"
                          min={0}
                          value={item.receivedQty}
                          onChange={(e) =>
                            updateReceiptItem(
                              receipt.refNo,
                              item.productId,
                              Number(e.target.value)
                            )
                          }
                          className={`w-20 h-7 text-right px-2 rounded bg-slate-50 border text-xs font-mono font-bold focus:outline-none focus:border-indigo-600 ${
                            isShort
                              ? 'border-rose-300 text-rose-700 bg-rose-50/50'
                              : 'border-slate-300 text-slate-900'
                          }`}
                        />
                      ) : (
                        <span className="font-bold text-slate-900">{item.receivedQty}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {item.variance < 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                          {item.variance} {item.uom || 'pcs'}
                        </span>
                      ) : item.variance > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                          +{item.variance} {item.uom || 'pcs'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                          0 {item.uom || 'pcs'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      ${item.unitCost.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      ${(item.receivedQty * item.unitCost).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        Passed
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footnote */}
        <div className="py-2.5 px-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>Showing {receipt.items.length} line items</span>
            <span>•</span>
            <span>
              Net Line Variance:{' '}
              <strong className="font-mono text-slate-900">
                {totalReceived - totalExpected} units net
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Hardware Wedge Scanner Linked</span>
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          </div>
        </div>
      </div>

      {/* Metadata & Valuation Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Logistics Information */}
        <div className="bg-white p-4 rounded-lg shadow-xs border border-slate-200 flex flex-col justify-between gap-3 text-xs">
          <div className="font-bold uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-100">
            Logistics & Stowage
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Supplier:</span>
              <span className="font-semibold text-slate-900">{receipt.partner}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Inbound Dock:</span>
              <span className="text-slate-800">{receipt.sourceLocation}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Stowage Destination:</span>
              <span className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">
                {receipt.destLocation}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Lead Inspector:</span>
              <span className="text-slate-800 font-medium">Alex Vance</span>
            </div>
          </div>
        </div>

        {/* Valuation Summary */}
        <div className="bg-white p-4 rounded-lg shadow-xs border border-slate-200 flex flex-col justify-between gap-3 text-xs">
          <div className="font-bold uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-100">
            Intake Valuation Summary
          </div>
          <div className="flex flex-col gap-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="font-sans text-slate-500">Total Units Expected:</span>
              <span className="font-semibold text-slate-900">{totalExpected} units</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-slate-500">Total Units Received:</span>
              <span className="font-bold text-indigo-600">{totalReceived} units</span>
            </div>
            <div className="h-0.5 bg-slate-100 my-0.5" />
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm font-bold text-slate-900">
                Total Inbound Value:
              </span>
              <span className="text-base font-bold text-indigo-600 font-mono">
                ${totalInboundValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Validate Receipt */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-600 text-2xl">
                  check_circle
                </span>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  Confirm Receipt Validation
                </h3>
              </div>

              <p className="text-slate-600 leading-relaxed font-sans">
                Are you sure you want to validate <strong>{receipt.refNo}</strong>? This will
                atomically post physical stock intake to the inventory ledger and update on-hand
                quantities.
              </p>

              {hasDiscrepancy && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
                  <strong>Warning:</strong> A variance exists between expected and received items.
                  Validation will record this discrepancy in the immutable audit log.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmValidation}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  Confirm & Post to Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
