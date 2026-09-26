import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { OperationType } from '../types/inventory';

export const MoveHistoryList: React.FC = () => {
  const { moveHistory, addToast } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | OperationType>('All');

  const filteredMoves = moveHistory.filter((m) => {
    if (typeFilter !== 'All' && m.type !== typeFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.refNo.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.productName.toLowerCase().includes(q) ||
        m.user.toLowerCase().includes(q) ||
        m.sourceLocation.toLowerCase().includes(q) ||
        m.destLocation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    if (filteredMoves.length === 0) {
      addToast('warning', 'No records to export');
      return;
    }

    const headers = [
      'Timestamp',
      'Ref No',
      'Operation Type',
      'SKU',
      'Product Name',
      'Source Location',
      'Destination Location',
      'Quantity',
      'Operator',
    ];

    const rows = filteredMoves.map((m) => [
      `"${m.timestamp}"`,
      `"${m.refNo}"`,
      `"${m.type}"`,
      `"${m.sku}"`,
      `"${m.productName.replace(/"/g, '""')}"`,
      `"${m.sourceLocation}"`,
      `"${m.destLocation}"`,
      m.quantity,
      `"${m.user}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stocksense_move_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', `Exported ${filteredMoves.length} audit records to CSV.`);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Audit & Compliance</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900">Move History</span>
          </div>
          <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
            Immutable Stock Move Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Double-entry ledger trail recording every inbound, outbound, transfer, and cycle adjustment
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-xs transition-colors self-start md:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base leading-none">download</span>
          <span>Export Ledger CSV</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Total Moves Logged
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {moveHistory.length}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
            <span className="material-symbols-outlined text-xl">history</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Inbound Receipts
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
              {moveHistory.filter((m) => m.type === 'Receipt').length}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 font-mono">
            <span className="material-symbols-outlined text-xl">login</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Outbound Deliveries
            </span>
            <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
              {moveHistory.filter((m) => m.type === 'Delivery').length}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-blue-50 text-blue-700 font-mono">
            <span className="material-symbols-outlined text-xl">logout</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Adjustments
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
              {moveHistory.filter((m) => m.type === 'Adjustment').length}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-amber-50 text-amber-700 font-mono">
            <span className="material-symbols-outlined text-xl">tune</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full max-w-md flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 leading-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search by ref, SKU, product, location, or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
          />
        </div>

        {/* Type tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto select-none">
          {(['All', 'Receipt', 'Delivery', 'Transfer', 'Adjustment'] as const).map((tab) => {
            const isCurrent = typeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setTypeFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                type="button"
              >
                {tab === 'All' ? 'All Moves' : `${tab}s`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ledger Table (Strict JetBrains Mono Data Cells) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Ledger Entries</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
              {filteredMoves.length} Entries
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Double-Entry Verified</span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Doc Ref #</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Product & SKU</th>
                <th className="py-2.5 px-4">Source Location</th>
                <th className="py-2.5 px-4">Destination Location</th>
                <th className="py-2.5 px-4 text-right">Quantity</th>
                <th className="py-2.5 px-4">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredMoves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                    No ledger move history matching criteria.
                  </td>
                </tr>
              ) : (
                filteredMoves.map((m) => {
                  let typeClass = 'bg-slate-100 text-slate-700';
                  let qtyPrefix = '';
                  let qtyColor = 'text-slate-900';

                  if (m.type === 'Receipt') {
                    typeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 border';
                    qtyPrefix = '+';
                    qtyColor = 'text-emerald-600';
                  } else if (m.type === 'Delivery') {
                    typeClass = 'bg-blue-50 text-blue-700 border-blue-200 border';
                    qtyPrefix = '-';
                    qtyColor = 'text-blue-600';
                  } else if (m.type === 'Adjustment') {
                    typeClass = 'bg-amber-50 text-amber-700 border-amber-200 border';
                    qtyPrefix = m.quantity >= 0 ? '+' : '';
                    qtyColor = m.quantity < 0 ? 'text-rose-600' : 'text-amber-600';
                  } else if (m.type === 'Transfer') {
                    typeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200 border';
                  }

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{m.timestamp}</td>
                      <td className="py-3 px-4 font-bold text-indigo-600 whitespace-nowrap">
                        {m.refNo}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${typeClass}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 font-sans">{m.productName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{m.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-sans text-[11px]">
                        {m.sourceLocation}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-sans text-[11px]">
                        {m.destLocation}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold text-sm ${qtyColor}`}>
                        {qtyPrefix}
                        {m.quantity} {m.uom || 'pcs'}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">{m.user}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
