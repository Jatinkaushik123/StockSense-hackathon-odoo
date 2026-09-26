import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const TransfersList: React.FC = () => {
  const { operations, selectedWarehouse } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');

  const transfers = operations.filter((op) => op.type === 'Transfer');

  const filtered = transfers.filter((t) => {
    if (selectedWarehouse !== 'All' && t.warehouse && t.warehouse !== selectedWarehouse) {
      return false;
    }
    if (
      searchQuery &&
      !t.refNo.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !t.sourceLocation.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !t.destLocation.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full gap-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
          <span>Operations</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900">Internal Transfers</span>
        </div>
        <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
          Internal Transfers
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Inter-warehouse stock movements and internal zone replenishment
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-full max-w-md flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-slate-400 text-base leading-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference # or location..."
              className="w-full h-8 pl-9 pr-3 bg-white border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filtered.length} transfer records
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Ref #</th>
                <th className="py-2.5 px-4">Source Location</th>
                <th className="py-2.5 px-4">Destination Location</th>
                <th className="py-2.5 px-4">Scheduled Date</th>
                <th className="py-2.5 px-4">Items / Qty</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">{t.refNo}</td>
                  <td className="py-3 px-4 text-slate-600">{t.sourceLocation}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{t.destLocation}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{t.date}</td>
                  <td className="py-3 px-4 font-mono">
                    {t.items.map((it) => (
                      <span key={it.sku}>
                        {it.expectedQty} {it.uom || 'pcs'} {it.name}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
