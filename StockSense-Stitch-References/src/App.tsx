import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { InventoryProvider } from './context/InventoryContext';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './routes/Dashboard';
import { ReceiptsList } from './routes/ReceiptsList';
import { ReceiptDetail } from './routes/ReceiptDetail';
import { DeliveriesList } from './routes/DeliveriesList';
import { TransfersList } from './routes/TransfersList';
import { AdjustmentsList } from './routes/AdjustmentsList';
import { ProductsList } from './routes/ProductsList';
import { MoveHistoryList } from './routes/MoveHistoryList';
import { WarehousesList } from './routes/WarehousesList';

export const App: React.FC = () => {
  return (
    <HashRouter>
      <InventoryProvider>
        <Routes>
          <Route path="/" element={<AppShell />}>
            {/* DASHBOARD */}
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />

            {/* OPERATIONS */}
            <Route path="operations/receipts" element={<ReceiptsList />} />
            <Route path="operations/receipts/:id" element={<ReceiptDetail />} />
            <Route path="operations/deliveries" element={<DeliveriesList />} />
            <Route path="operations/transfers" element={<TransfersList />} />
            <Route path="operations/adjustments" element={<AdjustmentsList />} />

            {/* CATALOG */}
            <Route path="products" element={<ProductsList />} />
            <Route path="history" element={<MoveHistoryList />} />

            {/* SETTINGS */}
            <Route path="settings/warehouses" element={<WarehousesList />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </InventoryProvider>
    </HashRouter>
  );
};

export default App;
