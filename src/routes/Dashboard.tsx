import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { OperationType } from '../types/inventory';

export const Dashboard: React.FC = () => {
  const {
    products,
    operations,
    kpis,
    selectedWarehouse,
    applyAdjustment,
    addToast,
  } = useInventory();

  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<'All' | OperationType>('All');
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);

  // Quick Adjustment Modal State
  const [adjProductId, setAdjProductId] = useState(products[0]?.id || '');
  const [adjLocation, setAdjLocation] = useState('Main Store - Zone A');
  const [adjPhysicalCount, setAdjPhysicalCount] = useState<number>(0);

  const targetProduct = products.find((p) => p.id === adjProductId || p.sku === adjProductId) || products[0];
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

  // Filter operations by warehouse and selectedType
  const filteredOps = operations.filter((op) => {
    if (selectedWarehouse !== 'All' && op.warehouse && op.warehouse !== selectedWarehouse) {
      return false;
    }
    if (selectedType !== 'All' && op.type !== selectedType) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
            Inventory Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time overview of warehouse operations, physical inventory levels, and velocity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="font-medium">Live Synced</span>
          </div>

          <button
            onClick={handleOpenAdjModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-base leading-none">tune</span>
            <span>Quick Physical Count Adjustment</span>
          </button>
        </div>
      </div>

      {/* Top KPI Metric Strip (5 Cards Calculated Live from Context) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Products */}
        <div
          onClick={() => navigate('/products')}
          className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs hover:border-indigo-400 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Total Products
            </span>
            <span className="p-1 rounded bg-indigo-50 text-indigo-700 font-mono">
              <span className="material-symbols-outlined text-base leading-none">inventory_2</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl text-slate-900 font-bold font-mono tracking-tight">
                {kpis.totalProducts}
              </span>
              <span className="text-xs text-slate-500 font-sans">SKUs</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 font-semibold font-mono flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              <span>Catalog Active</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Low / Out of Stock Items */}
        <div
          onClick={() => navigate('/products')}
          className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs hover:border-rose-400 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Low / Out of Stock
            </span>
            <span className="p-1 rounded bg-rose-50 text-rose-700">
              <span className="material-symbols-outlined text-base leading-none">warning</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl text-rose-600 font-bold font-mono tracking-tight">
                {kpis.lowStockCount}
              </span>
              <span className="text-xs text-slate-500 font-sans">Alerts</span>
            </div>
            <div className="mt-1 text-[11px] text-rose-600 font-mono font-semibold">
              Reorder Point Triggered
            </div>
          </div>
        </div>

        {/* KPI 3: Pending Receipts */}
        <div
          onClick={() => setSelectedType('Receipt')}
          className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs hover:border-indigo-400 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Pending Receipts
            </span>
            <span className="p-1 rounded bg-blue-50 text-blue-700">
              <span className="material-symbols-outlined text-base leading-none">schedule</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl text-slate-900 font-bold font-mono tracking-tight">
                {kpis.pendingReceiptsCount}
              </span>
              <span className="text-xs text-slate-500 font-sans">Incoming</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">Inbound Dock Intake</div>
          </div>
        </div>

        {/* KPI 4: Pending Deliveries */}
        <div
          onClick={() => setSelectedType('Delivery')}
          className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs hover:border-indigo-400 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Pending Deliveries
            </span>
            <span className="p-1 rounded bg-slate-100 text-slate-700">
              <span className="material-symbols-outlined text-base leading-none">
                local_shipping
              </span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl text-slate-900 font-bold font-mono tracking-tight">
                {kpis.pendingDeliveriesCount}
              </span>
              <span className="text-xs text-slate-500 font-sans">Dispatches</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">Picking & Packing</div>
          </div>
        </div>

        {/* KPI 5: Scheduled Transfers */}
        <div
          onClick={() => setSelectedType('Transfer')}
          className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs hover:border-indigo-400 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Scheduled Transfers
            </span>
            <span className="p-1 rounded bg-indigo-50 text-indigo-700">
              <span className="material-symbols-outlined text-base leading-none">sync_alt</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl text-slate-900 font-bold font-mono tracking-tight">
                {kpis.scheduledTransfersCount}
              </span>
              <span className="text-xs text-slate-500 font-sans">In-Transit</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-mono">Inter-Zone Moves</div>
          </div>
        </div>
      </div>

      {/* Operations Filter Bar */}
      <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto select-none">
          {(['All', 'Receipt', 'Delivery', 'Transfer'] as const).map((tab) => {
            const isCurrent = selectedType === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelectedType(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                type="button"
              >
                {tab === 'All' ? `All Operations (${operations.length})` : `${tab}s`}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          Showing {filteredOps.length} documents
        </span>
      </div>

      {/* Active Operations Table Panel */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Active Warehouse Operations</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
              {filteredOps.length} Active
            </span>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1"
          >
            Full Move History
            <span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Ref #</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Partner / Counterparty</th>
                <th className="py-2.5 px-4">Source Location</th>
                <th className="py-2.5 px-4">Destination Location</th>
                <th className="py-2.5 px-4">Lines & Items</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No operations matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredOps.map((op) => {
                  let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (op.status === 'Done') {
                    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  } else if (op.status === 'Picking' || op.status === 'Packing') {
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                  } else if (op.status === 'In Transit') {
                    badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  }

                  const isTargetReceipt = op.refNo === 'REC-2026-0084';
                  const totalPcs = op.items.reduce((acc, it) => acc + it.receivedQty, 0);

                  return (
                    <tr
                      key={op.id}
                      onClick={() => {
                        if (op.type === 'Receipt') {
                          navigate(`/operations/receipts/${op.refNo}`);
                        } else if (op.type === 'Delivery') {
                          navigate('/operations/deliveries');
                        } else if (op.type === 'Transfer') {
                          navigate('/operations/transfers');
                        }
                      }}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                        isTargetReceipt ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {op.refNo}
                        {isTargetReceipt && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-sans font-semibold">
                            Primary Test
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {op.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{op.partner}</td>
                      <td className="py-3 px-4 text-slate-500">{op.sourceLocation}</td>
                      <td className="py-3 px-4 text-slate-700">{op.destLocation}</td>
                      <td className="py-3 px-4 font-mono">
                        <span className="font-semibold text-slate-900">{op.items.length} items</span>{' '}
                        <span className="text-slate-400">({totalPcs} pcs)</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}
                        >
                          {op.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {op.type === 'Receipt' ? (
                          <button
                            onClick={() => navigate(`/operations/receipts/${op.refNo}`)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-xs transition-colors"
                            type="button"
                          >
                            Open Intake
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (op.type === 'Delivery') navigate('/operations/deliveries');
                              if (op.type === 'Transfer') navigate('/operations/transfers');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-base leading-none">
                              visibility
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
