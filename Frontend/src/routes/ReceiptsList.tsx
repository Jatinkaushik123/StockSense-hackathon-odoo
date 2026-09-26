import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';

export const ReceiptsList: React.FC = () => {
  const { operations, selectedWarehouse } = useInventory();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const receipts = operations.filter((op) => op.type === 'Receipt');

  const filtered = receipts.filter((r) => {
    if (selectedWarehouse !== 'All' && r.warehouse && r.warehouse !== selectedWarehouse) {
      return false;
    }
    if (statusFilter !== 'All' && r.status !== statusFilter) {
      return false;
    }
    if (
      searchQuery &&
      !r.refNo.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.partner.toLowerCase().includes(searchQuery.toLowerCase())
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
            <span className="text-slate-900">Receipts</span>
          </div>
          <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
            Inbound Receipts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical stock intake queue, vendor advance shipping notices, and inspection logs
          </p>
        </div>

        {filtered.length > 0 && (
          <button
            onClick={() => navigate(`/operations/receipts/${filtered[0].refNo}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-base leading-none">open_in_new</span>
            <span>Open {filtered[0].refNo} Intake</span>
          </button>
        )}
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
            placeholder="Search reference # or supplier..."
            className="w-full h-8 pl-9 pr-3 bg-slate-100/80 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto select-none">
          {['All', 'Ready', 'Waiting', 'Done'].map((st) => (
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

      {/* Receipts Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Ref #</th>
                <th className="py-2.5 px-4">Supplier</th>
                <th className="py-2.5 px-4">Receiving Dock</th>
                <th className="py-2.5 px-4">Destination Location</th>
                <th className="py-2.5 px-4">Items / Expected</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const totalPcs = r.items.reduce((acc, it) => acc + it.expectedQty, 0);
                const isTarget = r.refNo === 'REC-2026-0084';

                return (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/operations/receipts/${r.refNo}`)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                      isTarget ? 'bg-indigo-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {r.refNo}
                      {isTarget && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-sans font-semibold">
                          Target
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{r.partner}</td>
                    <td className="py-3 px-4 text-slate-500">{r.sourceLocation}</td>
                    <td className="py-3 px-4 text-slate-800">{r.destLocation}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className="font-semibold text-slate-900">{r.items.length} items</span>{' '}
                      <span className="text-slate-400">({totalPcs} pcs)</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          r.status === 'Done'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/operations/receipts/${r.refNo}`)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-xs transition-colors"
                      >
                        Open Intake
                      </button>
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
