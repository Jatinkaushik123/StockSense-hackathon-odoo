import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Product, UoM } from '../types/inventory';

export const ProductsList: React.FC = () => {
  const { products, selectedWarehouse, applyAdjustment, addProduct, addToast } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Quick adjustment modal state
  const [adjProduct, setAdjProduct] = useState<Product | null>(null);
  const [adjPhysicalCount, setAdjPhysicalCount] = useState<number>(0);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<{
    sku: string;
    barcode: string;
    name: string;
    category: string;
    uom: UoM;
    currentStock: number;
    minStock: number;
    maxStock: number;
    warehouse: string;
    location: string;
    unitCost: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  }>({
    sku: '',
    barcode: '',
    name: '',
    category: 'Electronics',
    uom: 'pcs',
    currentStock: 50,
    minStock: 20,
    maxStock: 200,
    warehouse: 'Main Warehouse',
    location: 'Main Store - Zone B (Aisle 02)',
    unitCost: 15.0,
    status: 'In Stock',
  });

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    if (selectedWarehouse !== 'All' && p.warehouse !== selectedWarehouse) {
      return false;
    }
    if (categoryFilter !== 'All' && p.category !== categoryFilter) {
      return false;
    }
    if (statusFilter !== 'All' && p.status !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      );
    }
    return true;
  });

  const totalValuation = filteredProducts.reduce(
    (sum, p) => sum + p.currentStock * p.unitCost,
    0
  );

  const handleOpenQuickAdj = (p: Product) => {
    setAdjProduct(p);
    setAdjPhysicalCount(p.currentStock);
  };

  const handleCommitQuickAdj = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProduct) return;
    applyAdjustment(adjProduct.id, adjProduct.location, adjPhysicalCount);
    setAdjProduct(null);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.sku || !newProduct.name) {
      addToast('error', 'Please fill in SKU and Name');
      return;
    }
    addProduct(newProduct);
    setIsAddModalOpen(false);
    setNewProduct({
      sku: '',
      barcode: '',
      name: '',
      category: 'Electronics',
      uom: 'pcs',
      currentStock: 50,
      minStock: 20,
      maxStock: 200,
      warehouse: 'Main Warehouse',
      location: 'Main Store - Zone B (Aisle 02)',
      unitCost: 15.0,
      status: 'In Stock',
    });
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Catalog</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900">Products</span>
          </div>
          <h1 className="text-xl font-bold font-sans text-slate-900 tracking-tight">
            Product Master Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active industrial SKU master file, reorder triggers, valuations, and storage bin mapping
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start md:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base leading-none">add</span>
          <span>Register New Product</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Total SKUs Listed
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {filteredProducts.length}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
            <span className="material-symbols-outlined text-xl">category</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Low Stock Warnings
            </span>
            <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
              {filteredProducts.filter((p) => p.status !== 'In Stock').length}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-rose-50 text-rose-700">
            <span className="material-symbols-outlined text-xl">warning</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Total Inventory Valuation
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
              ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <span className="material-symbols-outlined text-xl">payments</span>
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full max-w-md flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 leading-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search by SKU, barcode, or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="All">All Stock Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4">SKU / ID</th>
                <th className="py-2.5 px-4">Product Name & Category</th>
                <th className="py-2.5 px-4">Barcode</th>
                <th className="py-2.5 px-4 text-center">UoM</th>
                <th className="py-2.5 px-4 text-right">Physical On Hand</th>
                <th className="py-2.5 px-4 text-right">Min / Max Threshold</th>
                <th className="py-2.5 px-4 text-right">Unit Cost</th>
                <th className="py-2.5 px-4 text-right">Total Value</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No products match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  let statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      In Stock
                    </span>
                  );
                  if (p.status === 'Low Stock') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Low Stock
                      </span>
                    );
                  } else if (p.status === 'Out of Stock') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Out of Stock
                      </span>
                    );
                  }

                  const value = p.currentStock * p.unitCost;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{p.sku}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <span className="text-[11px] text-slate-400">{p.category}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.barcode}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">
                          {p.uom}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {p.currentStock}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {p.minStock} / {p.maxStock}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        ${p.unitCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">{p.location}</td>
                      <td className="py-3 px-4 text-center">{statusBadge}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenQuickAdj(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition-colors"
                          type="button"
                          title="Quick count adjustment"
                        >
                          Adjust Count
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Quick Adjust Modal */}
      {adjProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-lg">tune</span>
                <h3 className="text-sm font-bold text-slate-900">
                  Adjust Physical Stock: {adjProduct.sku}
                </h3>
              </div>
              <button
                onClick={() => setAdjProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCommitQuickAdj} className="p-5 flex flex-col gap-3.5 text-xs">
              <div className="text-slate-700">
                Product: <strong className="text-slate-900">{adjProduct.name}</strong>
              </div>

              {/* Live Delta Calculation Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[11px] text-slate-500">Recorded</span>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {adjProduct.currentStock}
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
                  <span className="text-[11px] text-slate-500">Delta</span>
                  <div
                    className={`text-base font-bold font-mono mt-0.5 ${
                      adjPhysicalCount - adjProduct.currentStock < 0
                        ? 'text-rose-600'
                        : adjPhysicalCount - adjProduct.currentStock > 0
                        ? 'text-indigo-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {adjPhysicalCount - adjProduct.currentStock >= 0
                      ? `+${adjPhysicalCount - adjProduct.currentStock}`
                      : adjPhysicalCount - adjProduct.currentStock}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  onClick={() => setAdjProduct(null)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-lg">add_box</span>
                <h3 className="text-sm font-bold text-slate-900">Register New Inventory Product</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MTR-250"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="w-full h-8 px-2.5 rounded bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600 uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. 789123008"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    className="w-full h-8 px-2.5 rounded bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stepper Motor 12V 2.5A"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full h-8 px-2.5 rounded bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full h-8 px-2.5 rounded bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Unit of Measure</label>
                  <select
                    value={newProduct.uom}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, uom: e.target.value as 'pcs' | 'kg' | 'box' | 'meter' })
                    }
                    className="w-full h-8 px-2 rounded bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="box">box</option>
                    <option value="meter">meter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={newProduct.unitCost}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, unitCost: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded bg-slate-50 border border-slate-200 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.currentStock}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, currentStock: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded bg-slate-50 border border-slate-200 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Min Threshold</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.minStock}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, minStock: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded bg-slate-50 border border-slate-200 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Max Capacity</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.maxStock}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, maxStock: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded bg-slate-50 border border-slate-200 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Bin Location</label>
                <input
                  type="text"
                  value={newProduct.location}
                  onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                  className="w-full h-8 px-2.5 rounded bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
