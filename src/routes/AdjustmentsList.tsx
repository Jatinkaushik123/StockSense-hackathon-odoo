import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const AdjustmentsList: React.FC = () => {
  const { operations, products, selectedWarehouse, applyAdjustment } = useInventory();

  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjProductId, setAdjProductId] = useState(products[0]?.id || '');
  const [adjLocation, setAdjLocation] = useState('Main Store - Zone A');
  const [adjPhysicalCount, setAdjPhysicalCount] = useState<number>(0);

  const adjustments = operations.filter((op) => op.type === 'Adjustment');

  const filtered = adjustments.filter((adj) => {
    if (selectedWarehouse !== 'All' && adj.warehouse && adj.warehouse !== selectedWarehouse) {
      return false;
    }
    return true;
  });

  const targetProduct =
    products.find((p) => p.id === adjProductId || p.sku === adjProductId) || products[0];
  const recordedStock = targetProduct ? targetProduct.currentStock : 0;
  const delta = adjPhysicalCount - recordedStock;

  const handleOpenAdjModal = () => {
    if (targetProduct) {
      setAdjPhysicalCount(targetProduct.currentStock);
      setAdjLocation(targetProduct.location);
    }
    setIsAdjModalOpen(true);
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProduct) return;
    applyAdjustment(targetProduct.id, adjLocation, adjPhysicalCount);
    setIsAdjModalOpen(false);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Operations</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900">Adjustments</span>
          </div>
          <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
            Inventory Adjustments & Physical Audits
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Periodic cycle counts, discrepancy reconciliation, and shrinkage write-offs
          </p>
        </div>

        <button
          onClick={handleOpenAdjModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start md:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base leading-none">tune</span>
          <span>New Physical Count Audit</span>
        </button>
      </div>

      {/* Adjustments Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Total Audits Completed
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {adjustments.length}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
            <span className="material-symbols-outlined text-xl">fact_check</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Latest Adjustment Ref
            </span>
            <div className="text-base font-bold font-mono text-indigo-600 mt-1">
              {adjustments[0]?.refNo || 'N/A'}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-slate-100 text-slate-700">
            <span className="material-symbols-outlined text-xl">history_edu</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Discrepancy Accuracy
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">99.4%</div>
          </div>
          <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <span className="material-symbols-outlined text-xl">verified</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Audit & Adjustment Logs</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
              {filtered.length} Recorded
            </span>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Ref #</th>
                <th className="py-2.5 px-4">Audit Auditor</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4">Adjusted Lines</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No adjustments recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{op.refNo}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{op.partner}</td>
                    <td className="py-3 px-4 text-slate-600">{op.destLocation}</td>
                    <td className="py-3 px-4 font-mono">
                      {op.items.map((it) => (
                        <div key={it.productId || it.sku} className="text-slate-800 font-medium">
                          {it.name}: <span className="font-bold">{it.receivedQty} pcs</span>{' '}
                          <span
                            className={
                              it.variance < 0
                                ? 'text-rose-600 font-bold'
                                : it.variance > 0
                                ? 'text-indigo-600 font-bold'
                                : 'text-slate-400'
                            }
                          >
                            (Delta: {it.variance >= 0 ? `+${it.variance}` : it.variance})
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{op.date}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {op.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{op.notes || 'Routine physical cycle count'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Physical Count Adjustment Modal */}
      {isAdjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-lg">tune</span>
                <h3 className="text-sm font-bold text-slate-900">
                  Quick Physical Count Adjustment
                </h3>
              </div>
              <button
                onClick={() => setIsAdjModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="p-5 flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Select Target Product</label>
                <select
                  value={adjProductId}
                  onChange={(e) => {
                    setAdjProductId(e.target.value);
                    const p = products.find((prod) => prod.id === e.target.value);
                    if (p) {
                      setAdjPhysicalCount(p.currentStock);
                      setAdjLocation(p.location);
                    }
                  }}
                  className="w-full h-8 px-2 rounded bg-slate-100 border border-slate-200 text-slate-900 focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) [Recorded: {p.currentStock} {p.uom}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Storage Location</label>
                <input
                  type="text"
                  required
                  value={adjLocation}
                  onChange={(e) => setAdjLocation(e.target.value)}
                  className="w-full h-8 px-3 rounded bg-slate-100 border border-slate-200 text-slate-900 focus:outline-none"
                />
              </div>

              {/* Live Delta Calculation Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[11px] text-slate-500">Recorded Stock</span>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {recordedStock}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Physical Count</span>
                  <input
                    type="number"
                    min={0}
                    value={adjPhysicalCount}
                    onChange={(e) => setAdjPhysicalCount(Number(e.target.value))}
                    className="w-full h-7 mt-0.5 text-center font-mono font-bold bg-white border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Adjustment Delta</span>
                  <div
                    className={`text-base font-bold font-mono mt-0.5 ${
                      delta < 0
                        ? 'text-rose-600'
                        : delta > 0
                        ? 'text-indigo-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {delta >= 0 ? `+${delta}` : delta}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  Apply & Commit to State
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
