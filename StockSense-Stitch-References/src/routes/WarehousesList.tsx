import React from 'react';
import { useInventory } from '../context/InventoryContext';

export const WarehousesList: React.FC = () => {
  const { selectedWarehouse, setSelectedWarehouse, products, addToast } = useInventory();

  const warehouses = [
    {
      id: 'wh-main',
      name: 'Main Warehouse',
      code: 'WH-MAIN-01',
      address: '742 Industrial Parkway, Building A, Dock 1-4',
      capacityPct: 82,
      totalCapacity: '15,000 m³',
      activeZones: ['Zone A (High-Bay)', 'Zone B (Shelving)', 'Zone C (Bulk)'],
      manager: 'Alex Vance',
      status: 'Active',
    },
    {
      id: 'wh-overflow',
      name: 'Overflow Warehouse',
      code: 'WH-OVER-02',
      address: '780 Industrial Parkway, Building C, Dock 5',
      capacityPct: 45,
      totalCapacity: '8,500 m³',
      activeZones: ['Bulk Pallet Stacking', 'Packaging Supplies'],
      manager: 'Marcus Brody',
      status: 'Active',
    },
    {
      id: 'wh-assembly',
      name: 'Assembly Store',
      code: 'WH-ASY-03',
      address: 'Manufacturing Floor 2, Sub-Assembly Annex',
      capacityPct: 67,
      totalCapacity: '4,000 m³',
      activeZones: ['Kitting Area', 'WIP Buffer'],
      manager: 'Sarah Lin',
      status: 'Active',
    },
    {
      id: 'wh-cold',
      name: 'Cold Storage',
      code: 'WH-COLD-04',
      address: 'Climate Control Unit - Building B (-5°C to 4°C)',
      capacityPct: 91,
      totalCapacity: '2,200 m³',
      activeZones: ['Refrigerated Bay', 'Sample Vault'],
      manager: 'David Chen',
      status: 'High Occupancy',
    },
  ];

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Settings</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900">Warehouses</span>
          </div>
          <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
            Warehouses & Facilities Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-facility topology, storage zone capacities, dock routing, and active warehouse switching
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedWarehouse('All');
            addToast('info', 'Active filter set to Global (All Warehouses)');
          }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors self-start md:self-auto border ${
            selectedWarehouse === 'All'
              ? 'bg-indigo-600 text-white border-transparent'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-base leading-none">public</span>
          <span>View All Facilities (Global)</span>
        </button>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {warehouses.map((wh) => {
          const isSelected = selectedWarehouse === wh.name;
          const whProducts = products.filter((p) => p.warehouse === wh.name);

          let barColor = 'bg-indigo-600';
          if (wh.capacityPct > 85) barColor = 'bg-rose-500';
          else if (wh.capacityPct > 70) barColor = 'bg-amber-500';

          return (
            <div
              key={wh.id}
              className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{wh.name}</h2>
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {wh.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm leading-none text-slate-400">
                        location_on
                      </span>
                      <span>{wh.address}</span>
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      wh.capacityPct > 85
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {wh.status}
                  </span>
                </div>

                {/* Capacity Gauge */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 my-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-600 font-medium">Volumetric Occupancy</span>
                    <span className="font-mono font-bold text-slate-900">
                      {wh.capacityPct}% ({wh.totalCapacity})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${wh.capacityPct}%` }}
                    />
                  </div>
                </div>

                {/* Facility Details */}
                <div className="grid grid-cols-2 gap-3 text-xs py-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Facility Manager</span>
                    <span className="font-semibold text-slate-800">{wh.manager}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Assigned SKUs</span>
                    <span className="font-mono font-bold text-slate-800">
                      {whProducts.length} items
                    </span>
                  </div>
                </div>

                {/* Zones */}
                <div className="mt-2">
                  <span className="text-[11px] text-slate-400 block mb-1">Configured Storage Zones</span>
                  <div className="flex flex-wrap gap-1.5">
                    {wh.activeZones.map((z) => (
                      <span
                        key={z}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                      >
                        {z}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Bottom */}
              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {isSelected ? (
                    <strong className="text-indigo-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Active Context Warehouse
                    </strong>
                  ) : (
                    'Not currently selected'
                  )}
                </span>

                <button
                  onClick={() => {
                    setSelectedWarehouse(wh.name);
                    addToast('success', `Active facility switched to ${wh.name}`);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                  disabled={isSelected}
                  type="button"
                >
                  {isSelected ? 'Active Facility' : 'Select Facility'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
