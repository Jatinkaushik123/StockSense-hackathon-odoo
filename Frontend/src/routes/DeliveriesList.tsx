import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const DeliveriesList: React.FC = () => {
  const { operations, products, validateDelivery, selectedWarehouse } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const deliveries = operations.filter((op) => op.type === 'Delivery');

  const filtered = deliveries.filter((d) => {
    if (selectedWarehouse !== 'All' && d.warehouse && d.warehouse !== selectedWarehouse) {
      return false;
    }
    if (statusFilter !== 'All' && d.status !== statusFilter) {
      return false;
    }
    if (
      searchQuery &&
      !d.refNo.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !d.partner.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Operations</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900">Delivery Orders</span>
          </div>
          <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
            Delivery Orders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Outbound customer shipments, picking & packing staging, and stock dispatching
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full max-w-md flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-base leading-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference # or customer..."
            className="w-full h-8 pl-9 pr-3 bg-slate-100/80 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto select-none">
          {['All', 'Ready', 'Waiting', 'Draft', 'Done'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Ref #</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Source Location</th>
                <th className="py-2.5 px-4">Destination</th>
                <th className="py-2.5 px-4">Line Items & Stock Check</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => {
                const hasInsufficient = d.items.some((it) => {
                  const prod = products.find((p) => p.id === it.productId || p.sku === it.sku);
                  return it.expectedQty > (prod ? prod.currentStock : 0);
                });

                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{d.refNo}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{d.partner}</td>
                    <td className="py-3 px-4 text-slate-500">{d.sourceLocation}</td>
                    <td className="py-3 px-4 text-slate-800">{d.destLocation}</td>
                    <td className="py-3 px-4 font-mono">
                      <div className="flex items-center gap-2">
                        <span>{d.items.length} items</span>
                        {hasInsufficient && d.status !== 'Done' && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                            INSUFFICIENT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          d.status === 'Done'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.status !== 'Done' ? (
                        <button
                          onClick={() => validateDelivery(d.refNo)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-xs transition-colors"
                        >
                          Dispatch
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-xs">Dispatched</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
