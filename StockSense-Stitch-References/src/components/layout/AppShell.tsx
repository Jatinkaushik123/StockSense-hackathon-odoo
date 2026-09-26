import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useInventory } from '../../context/InventoryContext';

export const AppShell: React.FC = () => {
  const {
    selectedWarehouse,
    setSelectedWarehouse,
    products,
    kpis,
    toasts,
    removeToast,
    globalSearchOpen,
    setGlobalSearchOpen,
    operations,
  } = useInventory();

  const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWarehouseDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Global Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(!globalSearchOpen);
      } else if (e.key === 'Escape' && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen, setGlobalSearchOpen]);

  useEffect(() => {
    if (globalSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [globalSearchOpen]);

  // Low stock alert flag for notification red dot
  const hasLowStock = kpis.lowStockCount > 0;
  const lowStockItems = products.filter(
    (p) => p.status === 'Low Stock' || p.status === 'Out of Stock'
  );

  // Search results
  const q = searchQuery.trim().toLowerCase();
  const matchedProducts = q
    ? products.filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q)
      ).slice(0, 5)
    : [];

  const matchedOps = q
    ? operations.filter(
        (op) =>
          op.refNo.toLowerCase().includes(q) ||
          op.partner.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
      isActive
        ? 'bg-primary-container text-white font-semibold shadow-sm'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  const sidebarNav = (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Brand Header: Fixed Sidebar Header Height (64px / h-16) */}
      <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-800/80 shrink-0 bg-slate-900">
        <img
          alt="StockSense Logo"
          className="h-9 w-9 object-contain shrink-0"
          src="/brand/logo.png"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-white tracking-tight leading-none truncate">
            StockSense
          </span>
          <span className="text-[10px] uppercase tracking-wider text-teal-400 mt-1 leading-none font-semibold truncate">
            Modular IMS
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto px-4 py-4">
        {/* Navigation items */}
        <nav className="flex flex-col gap-1">
          {/* Dashboard */}
          <div className="mb-2">
            <NavLink to="/" end className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span className="material-symbols-outlined text-lg leading-none">dashboard</span>
              <span>Dashboard</span>
            </NavLink>
          </div>

          {/* OPERATIONS */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mt-3 mb-1">
            OPERATIONS
          </div>
          <div className="flex flex-col gap-1">
            <NavLink
              to="/operations/receipts"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined text-lg leading-none">inventory_2</span>
              <span>Receipts</span>
            </NavLink>
            <NavLink
              to="/operations/deliveries"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined text-lg leading-none">local_shipping</span>
              <span>Deliveries</span>
            </NavLink>
            <NavLink
              to="/operations/transfers"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined text-lg leading-none">sync_alt</span>
              <span>Transfers</span>
            </NavLink>
            <NavLink
              to="/operations/adjustments"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined text-lg leading-none">edit_note</span>
              <span>Adjustments</span>
            </NavLink>
          </div>

          {/* CATALOG */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mt-4 mb-1">
            CATALOG
          </div>
          <div className="flex flex-col gap-1">
            <NavLink to="/products" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span className="material-symbols-outlined text-lg leading-none">category</span>
              <span>Products</span>
            </NavLink>
            <NavLink to="/history" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span className="material-symbols-outlined text-lg leading-none">history</span>
              <span>Move History</span>
            </NavLink>
          </div>

          {/* SETTINGS */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mt-4 mb-1">
            SETTINGS
          </div>
          <div className="flex flex-col gap-1">
            <NavLink
              to="/settings/warehouses"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined text-lg leading-none">warehouse</span>
              <span>Warehouses</span>
            </NavLink>
          </div>
        </nav>
      </div>

      {/* User profile card */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary-container text-white font-bold text-xs flex items-center justify-center shrink-0">
            AV
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-white truncate">Alex Vance</span>
            <span className="text-[10px] text-slate-400 truncate">Warehouse Staff / Manager</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            title="Alex Vance Profile"
            type="button"
          >
            <span className="material-symbols-outlined text-lg leading-none">account_circle</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* 1. Left Sidebar (Fixed 260px, bg-slate-900, text-slate-300) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[260px] bg-slate-900 z-40 flex-col justify-between">
        {sidebarNav}
      </aside>

      {/* Mobile Slide-Over Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 z-50 shadow-2xl">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            {sidebarNav}
          </aside>
        </div>
      )}

      {/* 2. Top Bar (Height 64px, bg-white, border-slate-200) */}
      <header className="fixed top-0 left-0 lg:left-[260px] right-0 h-16 bg-white z-30 border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        {/* Left: Mobile hamburger + Global search field */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            type="button"
            aria-label="Toggle Navigation"
          >
            <span className="material-symbols-outlined text-xl leading-none">menu</span>
          </button>

          <div
            onClick={() => setGlobalSearchOpen(true)}
            className="relative w-full flex items-center cursor-pointer group"
          >
            <span className="material-symbols-outlined absolute left-3 text-slate-400 group-hover:text-indigo-600 leading-none transition-colors">
              search
            </span>
            <div className="w-full h-9 pl-10 pr-20 bg-slate-100/80 border border-slate-200 rounded-lg text-slate-500 group-hover:border-indigo-500 text-sm transition-colors flex items-center">
              <span className="truncate">Search SKU, document #, or location...</span>
            </div>
            <kbd className="absolute right-2 px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-400 font-mono text-[11px] select-none shadow-xs">
              Ctrl+K
            </kbd>
          </div>
        </div>

        {/* Right: Operational Status, Warehouse Dropdown, Notification Bell */}
        <div className="flex items-center gap-3 lg:gap-4 ml-3">
          {/* Operational Pulse */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[11px] text-slate-800 font-semibold">Operational</span>
          </div>

          {/* Warehouse Dropdown Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setWarehouseDropdownOpen(!warehouseDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs hover:bg-slate-50 transition-colors shadow-xs"
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span className="font-medium truncate max-w-[120px] sm:max-w-[160px]">
                {selectedWarehouse === 'All' ? 'All Warehouses' : selectedWarehouse}
              </span>
              <span className="material-symbols-outlined text-sm text-slate-400 leading-none">
                arrow_drop_down
              </span>
            </button>

            {warehouseDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Select Warehouse
                </div>
                {['All', 'Main Warehouse', 'Overflow Warehouse', 'Assembly Store', 'Cold Storage'].map(
                  (wh) => (
                    <button
                      key={wh}
                      onClick={() => {
                        setSelectedWarehouse(wh);
                        setWarehouseDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        selectedWarehouse === wh ? 'font-semibold text-indigo-600' : 'text-slate-700'
                      }`}
                    >
                      <span>{wh === 'All' ? 'All Warehouses (Global)' : wh}</span>
                      {selectedWarehouse === wh && (
                        <span className="material-symbols-outlined text-sm text-indigo-600">check</span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Notification Bell with dynamic red dot if low-stock items exist */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              type="button"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-xl leading-none">notifications</span>
              {hasLowStock && (
                <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                  {kpis.lowStockCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 text-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    System Notifications
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                    {kpis.lowStockCount} Critical
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {lowStockItems.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      All inventory levels are within normal parameters.
                    </div>
                  ) : (
                    lowStockItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/products');
                        }}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-2.5"
                      >
                        <span className="material-symbols-outlined text-rose-600 text-base mt-0.5">
                          warning
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{item.name}</span>
                            <span className="font-mono text-[11px] text-rose-700 bg-rose-50 px-1 rounded">
                              {item.sku}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Stock level:{' '}
                            <strong className="font-mono text-rose-600">
                              {item.currentStock} {item.uom}
                            </strong>{' '}
                            (Min threshold: {item.minStock})
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="lg:pl-[260px] pt-16 min-h-screen w-full transition-all">
        <div className="p-4 sm:p-6 w-full max-w-[1700px] mx-auto">
          <Outlet />
        </div>
      </main>

      {/* 3. Floating Toast Container in bottom-right */}
      <div
        id="toast-container"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          let borderClass = 'border-indigo-600';
          let icon = 'info';
          let iconColor = 'text-indigo-600';

          if (toast.type === 'success') {
            borderClass = 'border-emerald-500';
            icon = 'check_circle';
            iconColor = 'text-emerald-600';
          } else if (toast.type === 'error') {
            borderClass = 'border-rose-600';
            icon = 'error';
            iconColor = 'text-rose-600';
          } else if (toast.type === 'warning') {
            borderClass = 'border-amber-500';
            icon = 'warning';
            iconColor = 'text-amber-600';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-xl border-l-4 ${borderClass} bg-white text-slate-900 border border-slate-200 transition-all animate-in slide-in-from-bottom-2 duration-200`}
            >
              <span className={`material-symbols-outlined text-lg leading-none ${iconColor} mt-0.5`}>
                {icon}
              </span>
              <div className="flex-1 min-w-0 text-xs font-medium text-slate-800 leading-snug">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-0.5"
                type="button"
              >
                <span className="material-symbols-outlined text-sm leading-none">close</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Global Search Modal (Ctrl+K) */}
      {globalSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/60 backdrop-blur-xs p-4"
          onClick={() => setGlobalSearchOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3">
              <span className="material-symbols-outlined text-indigo-600 text-xl leading-none">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="w-full bg-transparent text-slate-900 font-sans text-sm placeholder:text-slate-400 focus:outline-none"
                placeholder="Search SKU, document # (REC-, DEL-, INT-), or product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs text-slate-400 font-mono">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-3 flex flex-col gap-3 text-xs">
              {!q && (
                <div className="py-6 text-center text-slate-500">
                  Type to search across products, active receipts, and deliveries.
                </div>
              )}

              {matchedProducts.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                    Products
                  </div>
                  {matchedProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setGlobalSearchOpen(false);
                        navigate('/products');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        <span className="font-mono text-[11px] bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">
                          {p.sku}
                        </span>
                      </div>
                      <span className="font-mono text-slate-700">
                        {p.currentStock} {p.uom}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {matchedOps.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                    Operations
                  </div>
                  {matchedOps.map((op) => (
                    <button
                      key={op.id}
                      onClick={() => {
                        setGlobalSearchOpen(false);
                        if (op.type === 'Receipt') {
                          navigate(`/operations/receipts/${op.refNo}`);
                        } else {
                          navigate('/operations/deliveries');
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600">{op.refNo}</span>
                        <span className="text-slate-700">{op.partner}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {op.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
