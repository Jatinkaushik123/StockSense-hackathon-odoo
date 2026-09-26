import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import {
  Product,
  OperationDoc,
  StockMove,
  ToastMessage,
  LineItem,
} from '../types/inventory';

interface InventoryContextType {
  // State
  products: Product[];
  operations: OperationDoc[];
  moveHistory: StockMove[];
  toasts: ToastMessage[];
  selectedWarehouse: string;
  globalSearchOpen: boolean;
  loading: boolean;
  refreshData: () => Promise<void>;

  // Setters
  setSelectedWarehouse: (wh: string) => void;
  setGlobalSearchOpen: (open: boolean) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  removeToast: (id: string) => void;

  // Core Business Mutations
  validateReceipt: (refNo: string) => Promise<boolean>;
  validateDelivery: (refNo: string) => Promise<boolean>;
  applyAdjustment: (productId: string, location: string, physicalCount: number) => Promise<boolean>;
  updateReceiptItem: (refNo: string, productId: string, receivedQty: number) => void;

  // Helper CRUD
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;

  // KPIs
  kpis: {
    totalProducts: number;
    lowStockCount: number;
    pendingReceiptsCount: number;
    pendingDeliveriesCount: number;
    scheduledTransfersCount: number;
  };
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Initial fallback products if backend is loading
const fallbackProducts: Product[] = [
  {
    id: '1',
    sku: 'SKU-HELMET-001',
    barcode: '789123001',
    name: 'Industrial Safety Helmet',
    category: 'Safety Equipment',
    uom: 'pcs',
    currentStock: 120,
    minStock: 25,
    maxStock: 500,
    warehouse: 'Main Warehouse',
    location: 'Main Store',
    unitCost: 35.0,
    status: 'In Stock',
  },
  {
    id: '2',
    sku: 'SKU-DRILL-002',
    barcode: '789123002',
    name: 'Cordless Drill 18V',
    category: 'Power Tools',
    uom: 'pcs',
    currentStock: 42,
    minStock: 8,
    maxStock: 100,
    warehouse: 'Main Warehouse',
    location: 'Main Store',
    unitCost: 120.0,
    status: 'In Stock',
  },
];

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [operations, setOperations] = useState<OperationDoc[]>([]);
  const [moveHistory, setMoveHistory] = useState<StockMove[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
  const [globalSearchOpen, setGlobalSearchOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Self-dismissing toast notification engine (auto-removes after 4 seconds)
  const addToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Compute status based on stock level
  const computeStatus = (stock: number, min: number): Product['status'] => {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= min) return 'Low Stock';
    return 'In Stock';
  };

async function safeParseJson(res: Response): Promise<{ ok: boolean; [key: string]: any }> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : { ok: res.ok };
  } catch {
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${text || res.statusText || 'Internal Server Error'}`);
    }
    return { ok: true };
  }
}

  // Fetch real data from backend
  const refreshData = useCallback(async () => {
    try {
      const [prodRes, opsRes, histRes] = await Promise.all([
        fetch('/api/products', { credentials: 'include' }),
        fetch('/api/operations', { credentials: 'include' }),
        fetch('/api/history', { credentials: 'include' }),
      ]);

      if (prodRes.ok) {
        const prodData = await safeParseJson(prodRes);
        if (prodData.ok && Array.isArray(prodData.products)) {
          const mappedProds: Product[] = prodData.products.map((p: any) => {
            const stock = Number(p.onHand ?? p.on_hand ?? 0);
            const min = Number(p.min_stock_alert ?? p.minStock ?? 10);
            return {
              id: String(p.id),
              sku: p.sku,
              barcode: p.barcode || `78912300${p.id}`,
              name: p.name,
              category: p.category || 'General',
              uom: p.uom || 'pcs',
              currentStock: stock,
              minStock: min,
              maxStock: min * 5 || 200,
              warehouse: 'Main Warehouse',
              location: 'Main Store',
              unitCost: Number(p.unitCost || 25),
              status: computeStatus(stock, min),
            };
          });
          setProducts(mappedProds);
        }
      }

      if (opsRes.ok) {
        const opsData = await safeParseJson(opsRes);
        if (opsData.ok && Array.isArray(opsData.operations)) {
          setOperations(opsData.operations);
        }
      }

      if (histRes.ok) {
        const histData = await safeParseJson(histRes);
        if (histData.ok && Array.isArray(histData.moves)) {
          setMoveHistory(histData.moves);
        }
      }
    } catch (err) {
      console.warn('Failed to load inventory data from backend', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Action 1: validateReceipt(refNo)
  const validateReceipt = useCallback(
    async (refNo: string): Promise<boolean> => {
      const receipt = operations.find((op) => op.refNo === refNo || op.id === refNo);
      if (!receipt) {
        addToast('error', `Receipt ${refNo} not found.`);
        return false;
      }
      if (receipt.status === 'Done') {
        addToast('info', `Receipt ${refNo} has already been validated.`);
        return true;
      }

      try {
        const res = await fetch(`/api/operations/${receipt.id}/validate`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await safeParseJson(res);
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Failed to validate receipt.');
        }

        addToast('success', data.message || `Receipt ${refNo} validated successfully.`);
        await refreshData();
        return true;
      } catch (err: any) {
        addToast('error', err.message || 'Receipt validation failed.');
        return false;
      }
    },
    [operations, addToast, refreshData]
  );

  // Action 2: validateDelivery(refNo)
  const validateDelivery = useCallback(
    async (refNo: string): Promise<boolean> => {
      const delivery = operations.find((op) => op.refNo === refNo || op.id === refNo);
      if (!delivery) {
        addToast('error', `Delivery order ${refNo} not found.`);
        return false;
      }
      if (delivery.status === 'Done') {
        addToast('info', `Delivery order ${refNo} is already validated.`);
        return true;
      }

      try {
        const res = await fetch(`/api/operations/${delivery.id}/validate`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await safeParseJson(res);
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Failed to validate delivery order.');
        }

        addToast('success', data.message || `Delivery ${refNo} dispatched and posted to ledger.`);
        await refreshData();
        return true;
      } catch (err: any) {
        addToast('error', err.message || 'Delivery validation failed.');
        return false;
      }
    },
    [operations, addToast, refreshData]
  );

  // Action 3: applyAdjustment(productId, location, physicalCount)
  const applyAdjustment = useCallback(
    async (productId: string, location: string, physicalCount: number): Promise<boolean> => {
      const prod = products.find((p) => p.id === productId || p.sku === productId);
      const targetId = prod ? prod.id : productId;

      try {
        const res = await fetch('/api/operations/adjustments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            productId: targetId,
            physicalCount,
            location,
          }),
        });

        const data = await safeParseJson(res);
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Adjustment failed.');
        }

        addToast('success', data.message || 'Stock count adjusted and reconciled.');
        await refreshData();
        return true;
      } catch (err: any) {
        addToast('error', err.message || 'Failed to apply adjustment.');
        return false;
      }
    },
    [products, addToast, refreshData]
  );

  // Action 4: updateReceiptItem(refNo, productId, receivedQty)
  const updateReceiptItem = useCallback(
    (refNo: string, productId: string, receivedQty: number) => {
      setOperations((prev) =>
        prev.map((op) => {
          if (op.refNo === refNo) {
            const updatedItems: LineItem[] = op.items.map((it) => {
              if (it.productId === productId || it.sku === productId) {
                const variance = receivedQty - it.expectedQty;
                return {
                  ...it,
                  receivedQty,
                  variance,
                };
              }
              return it;
            });
            return {
              ...op,
              items: updatedItems,
            };
          }
          return op;
        })
      );
    },
    []
  );

  // Helper CRUD: addProduct
  const addProduct = useCallback(
    async (data: Omit<Product, 'id'>) => {
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: data.name,
            sku: data.sku,
            category: data.category,
            uom: data.uom,
            minStockAlert: data.minStock,
            initialStock: data.currentStock,
            location: data.location,
          }),
        });

        const resData = await safeParseJson(res);
        if (!res.ok || !resData.ok) {
          throw new Error(resData.error || `Failed to add product (${res.status}).`);
        }

        addToast('success', resData.message || `Product ${data.name} created.`);
        await refreshData();
      } catch (err: any) {
        addToast('error', err.message || 'Product creation failed.');
      }
    },
    [addToast, refreshData]
  );

  // Computed live KPIs
  const kpis = useMemo(() => {
    const activeProducts =
      selectedWarehouse === 'All'
        ? products
        : products.filter((p) => p.warehouse === selectedWarehouse);

    const activeOps =
      selectedWarehouse === 'All'
        ? operations
        : operations.filter((op) => !op.warehouse || op.warehouse === selectedWarehouse);

    const lowStockCount = activeProducts.filter(
      (p) => p.status === 'Low Stock' || p.status === 'Out of Stock'
    ).length;

    const pendingReceiptsCount = activeOps.filter(
      (op) => op.type === 'Receipt' && (op.status === 'Ready' || op.status === 'Waiting' || op.status === 'Draft')
    ).length;

    const pendingDeliveriesCount = activeOps.filter(
      (op) => op.type === 'Delivery' && (op.status === 'Ready' || op.status === 'Picking' || op.status === 'Packing' || op.status === 'Draft')
    ).length;

    const scheduledTransfersCount = activeOps.filter(
      (op) => op.type === 'Transfer' && (op.status === 'In Transit' || op.status === 'Waiting' || op.status === 'Draft' || op.status === 'Ready')
    ).length;

    return {
      totalProducts: activeProducts.length,
      lowStockCount,
      pendingReceiptsCount,
      pendingDeliveriesCount,
      scheduledTransfersCount,
    };
  }, [products, operations, selectedWarehouse]);

  return (
    <InventoryContext.Provider
      value={{
        products,
        operations,
        moveHistory,
        toasts,
        selectedWarehouse,
        globalSearchOpen,
        loading,
        refreshData,
        setSelectedWarehouse,
        setGlobalSearchOpen,
        addToast,
        removeToast,
        validateReceipt,
        validateDelivery,
        applyAdjustment,
        updateReceiptItem,
        addProduct,
        kpis,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
