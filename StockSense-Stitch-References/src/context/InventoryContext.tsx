import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
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

  // Setters
  setSelectedWarehouse: (wh: string) => void;
  setGlobalSearchOpen: (open: boolean) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  removeToast: (id: string) => void;

  // Core Business Mutations
  validateReceipt: (refNo: string) => boolean;
  validateDelivery: (refNo: string) => boolean;
  applyAdjustment: (productId: string, location: string, physicalCount: number) => boolean;
  updateReceiptItem: (refNo: string, productId: string, receivedQty: number) => void;

  // Helper CRUD
  addProduct: (product: Omit<Product, 'id'>) => void;

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

// Initial Seed Products (7+ realistic industrial products)
const initialProducts: Product[] = [
  {
    id: 'prod-001',
    sku: 'BRK-001',
    barcode: '789123001',
    name: 'CNC Bracket High-Torque',
    category: 'Raw Materials',
    uom: 'pcs',
    currentStock: 98,
    minStock: 100,
    maxStock: 500,
    warehouse: 'Main Warehouse',
    location: 'Main Store - Zone A (Aisle 04 · Shelf 02)',
    unitCost: 24.5,
    status: 'Low Stock',
    spec: 'Cast Iron Heavy-Duty Fitting',
  },
  {
    id: 'prod-002',
    sku: 'BOLT-008',
    barcode: '789123008',
    name: 'Heat Bolt - M8 Stainless',
    category: 'Consumables',
    uom: 'pcs',
    currentStock: 500,
    minStock: 200,
    maxStock: 2000,
    warehouse: 'Main Warehouse',
    location: 'Fast-pick Bins (Zone F)',
    unitCost: 1.2,
    status: 'In Stock',
    spec: 'Grade 316 Marine Spec',
  },
  {
    id: 'prod-003',
    sku: 'CP-100',
    barcode: '789123100',
    name: 'Industrial Control Panel CP-100',
    category: 'Finished Goods',
    uom: 'pcs',
    currentStock: 20,
    minStock: 10,
    maxStock: 80,
    warehouse: 'Main Warehouse',
    location: 'Main Store - Rack B',
    unitCost: 185.0,
    status: 'In Stock',
    spec: 'PLC Module 24V DC Rated',
  },
  {
    id: 'prod-004',
    sku: 'LUB-024',
    barcode: '789123024',
    name: 'Synthetic Lubricant Grade A',
    category: 'Spare Parts',
    uom: 'box',
    currentStock: 52,
    minStock: 40,
    maxStock: 250,
    warehouse: 'Main Warehouse',
    location: 'Hazardous / Chemical Annex',
    unitCost: 14.0,
    status: 'In Stock',
    spec: 'ISO VG 68 Hydraulic Oil',
  },
  {
    id: 'prod-005',
    sku: 'MTR-200',
    barcode: '789123200',
    name: 'High-Torque Stepper Motor',
    category: 'Spare Parts',
    uom: 'pcs',
    currentStock: 12,
    minStock: 25,
    maxStock: 100,
    warehouse: 'Main Warehouse',
    location: 'Main Store - Rack B',
    unitCost: 89.0,
    status: 'Low Stock',
    spec: 'NEMA 34 Hybrid 8.5Nm',
  },
  {
    id: 'prod-006',
    sku: 'SNS-110',
    barcode: '789123110',
    name: 'Photoelectric Sensor Mini',
    category: 'Spare Parts',
    uom: 'pcs',
    currentStock: 110,
    minStock: 30,
    maxStock: 300,
    warehouse: 'Assembly Store',
    location: 'Component Kitting Rack',
    unitCost: 32.0,
    status: 'In Stock',
    spec: 'IR Laser 300mm Range',
  },
  {
    id: 'prod-007',
    sku: 'PSU-500',
    barcode: '789123500',
    name: 'Din-Rail Power Supply 500W',
    category: 'Finished Goods',
    uom: 'pcs',
    currentStock: 45,
    minStock: 15,
    maxStock: 120,
    warehouse: 'Main Warehouse',
    location: 'Main Store - Rack B',
    unitCost: 65.0,
    status: 'In Stock',
    spec: '24V DC 20A DIN Mount',
  },
  {
    id: 'prod-008',
    sku: 'WGT-001',
    barcode: '789123005',
    name: 'Widget Assembly Type A',
    category: 'Finished Goods',
    uom: 'pcs',
    currentStock: 0,
    minStock: 20,
    maxStock: 100,
    warehouse: 'Main Warehouse',
    location: 'Finished Goods Bay',
    unitCost: 45.0,
    status: 'Out of Stock',
    spec: 'Precision Machined Actuator Unit',
  },
];

// Initial Operations including REC-2026-0084, DEL-2026-0041, INT-2026-0019
const initialOperations: OperationDoc[] = [
  {
    id: 'op-0084',
    refNo: 'REC-2026-0084',
    type: 'Receipt',
    partner: 'Vendor ABC Logistics Inc.',
    sourceLocation: 'Dock A (Inbound Dock 03)',
    destLocation: 'Main Store - Zone A (Aisle 04 · Shelf 02)',
    date: 'Apr 15, 2026 · 09:30 AM',
    status: 'Ready',
    warehouse: 'Main Warehouse',
    carrier: 'FedEx Freight',
    notes: 'Short-shipment noted on BOL #BOL-4491. Physical intake pending validation.',
    items: [
      {
        productId: 'prod-001',
        name: 'CNC Bracket High-Torque',
        sku: 'BRK-001',
        barcode: '789123001',
        expectedQty: 100,
        receivedQty: 98,
        variance: -2,
        unitCost: 24.5,
        uom: 'pcs',
        lotSerial: 'LOT-2026-B1',
        qcStatus: 'Passed',
      },
      {
        productId: 'prod-002',
        name: 'Heat Bolt - M8 Stainless',
        sku: 'BOLT-008',
        barcode: '789123008',
        expectedQty: 500,
        receivedQty: 500,
        variance: 0,
        unitCost: 1.2,
        uom: 'pcs',
        lotSerial: 'LOT-2026-S4',
        qcStatus: 'Passed',
      },
      {
        productId: 'prod-003',
        name: 'Industrial Control Panel CP-100',
        sku: 'CP-100',
        barcode: '789123100',
        expectedQty: 20,
        receivedQty: 20,
        variance: 0,
        unitCost: 185.0,
        uom: 'pcs',
        lotSerial: 'SN-2026-901..920',
        qcStatus: 'Inspected',
      },
      {
        productId: 'prod-004',
        name: 'Synthetic Lubricant Grade A',
        sku: 'LUB-024',
        barcode: '789123024',
        expectedQty: 50,
        receivedQty: 52,
        variance: 2,
        unitCost: 14.0,
        uom: 'box',
        lotSerial: 'LOT-LUB-09',
        qcStatus: 'Passed',
      },
    ],
  },
  {
    id: 'op-0041',
    refNo: 'DEL-2026-0041',
    type: 'Delivery',
    partner: 'Customer XYZ Corp',
    sourceLocation: 'Main Store - Rack B',
    destLocation: 'Dispatch Dock 3',
    date: 'Apr 15, 2026',
    status: 'Picking',
    warehouse: 'Main Warehouse',
    carrier: 'Swift Logistics',
    notes: 'Priority industrial dispatch.',
    items: [
      {
        productId: 'prod-007',
        name: 'Din-Rail Power Supply 500W',
        sku: 'PSU-500',
        barcode: '789123500',
        expectedQty: 10,
        receivedQty: 10,
        variance: 0,
        unitCost: 65.0,
        uom: 'pcs',
      },
      {
        productId: 'prod-003',
        name: 'Industrial Control Panel CP-100',
        sku: 'CP-100',
        barcode: '789123100',
        expectedQty: 5,
        receivedQty: 5,
        variance: 0,
        unitCost: 185.0,
        uom: 'pcs',
      },
    ],
  },
  {
    id: 'op-0019',
    refNo: 'INT-2026-0019',
    type: 'Transfer',
    partner: 'Internal Transfer',
    sourceLocation: 'Main Store - Zone A',
    destLocation: 'Assembly Line 2 (Plant 2)',
    date: 'Apr 15, 2026',
    status: 'In Transit',
    warehouse: 'Main Warehouse',
    notes: 'Internal replenishment move.',
    items: [
      {
        productId: 'prod-001',
        name: 'CNC Bracket High-Torque',
        sku: 'BRK-001',
        barcode: '789123001',
        expectedQty: 25,
        receivedQty: 25,
        variance: 0,
        unitCost: 24.5,
        uom: 'pcs',
      },
    ],
  },
  {
    id: 'op-0011',
    refNo: 'ADJ-2026-0011',
    type: 'Adjustment',
    partner: 'Inventory Audit Q1',
    sourceLocation: 'Main Store - Zone B',
    destLocation: '—',
    date: 'Apr 14, 2026',
    status: 'Done',
    warehouse: 'Main Warehouse',
    notes: 'Audit variance reconciliation.',
    items: [
      {
        productId: 'prod-004',
        name: 'Synthetic Lubricant Grade A',
        sku: 'LUB-024',
        expectedQty: 48,
        receivedQty: 52,
        variance: 4,
        unitCost: 14.0,
        uom: 'box',
      },
    ],
  },
  {
    id: 'op-0085',
    refNo: 'REC-2026-0085',
    type: 'Receipt',
    partner: 'Global Microtech Inc.',
    sourceLocation: 'Air Freight Terminal',
    destLocation: 'High-Value Vault',
    date: 'Apr 15, 2026',
    status: 'Waiting',
    warehouse: 'Main Warehouse',
    items: [
      {
        productId: 'prod-006',
        name: 'Photoelectric Sensor Mini',
        sku: 'SNS-110',
        expectedQty: 50,
        receivedQty: 0,
        variance: -50,
        unitCost: 32.0,
        uom: 'pcs',
      },
    ],
  },
  {
    id: 'op-0042',
    refNo: 'DEL-2026-0042',
    type: 'Delivery',
    partner: 'Apex Assembly Inc',
    sourceLocation: 'Main Store - Rack B',
    destLocation: 'Loading Bay 1',
    date: 'Apr 16, 2026',
    status: 'Packing',
    warehouse: 'Main Warehouse',
    items: [
      {
        productId: 'prod-005',
        name: 'High-Torque Stepper Motor',
        sku: 'MTR-200',
        expectedQty: 5,
        receivedQty: 5,
        variance: 0,
        unitCost: 89.0,
        uom: 'pcs',
      },
    ],
  },
];

// Initial Move History (3+ historical records)
const initialMoveHistory: StockMove[] = [
  {
    id: 'mh-001',
    timestamp: '2026-04-14 16:30:00',
    refNo: 'REC-2026-0083',
    type: 'Receipt',
    productId: 'prod-002',
    productName: 'Heat Bolt - M8 Stainless',
    sku: 'BOLT-008',
    sourceLocation: 'Vendor Apex Fasteners',
    destLocation: 'Fast-pick Bins (Zone F)',
    quantity: 500,
    user: 'Alex Vance',
    uom: 'pcs',
  },
  {
    id: 'mh-002',
    timestamp: '2026-04-14 14:15:00',
    refNo: 'DEL-2026-0040',
    type: 'Delivery',
    productId: 'prod-003',
    productName: 'Industrial Control Panel CP-100',
    sku: 'CP-100',
    sourceLocation: 'Main Store - Rack B',
    destLocation: 'Customer AeroTech Systems',
    quantity: 4,
    user: 'Alex Vance',
    uom: 'pcs',
  },
  {
    id: 'mh-003',
    timestamp: '2026-04-13 11:20:00',
    refNo: 'ADJ-2026-0010',
    type: 'Adjustment',
    productId: 'prod-005',
    productName: 'High-Torque Stepper Motor',
    sku: 'MTR-200',
    sourceLocation: 'Inventory Audit Gain',
    destLocation: 'Main Store - Rack B',
    quantity: 2,
    user: 'Alex Vance',
    uom: 'pcs',
  },
];

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [operations, setOperations] = useState<OperationDoc[]>(initialOperations);
  const [moveHistory, setMoveHistory] = useState<StockMove[]>(initialMoveHistory);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
  const [globalSearchOpen, setGlobalSearchOpen] = useState<boolean>(false);

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

  // Helper: compute status based on stock level
  const computeStatus = (stock: number, min: number): Product['status'] => {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= min) return 'Low Stock';
    return 'In Stock';
  };

  // Action 1: validateReceipt(refNo)
  // Atomically sets receipt status to 'Done', increments target product's currentStock,
  // logs a new record in moveHistory (Vendor -> Destination), and triggers a success toast.
  const validateReceipt = useCallback(
    (refNo: string): boolean => {
      const receipt = operations.find((op) => op.refNo === refNo && op.type === 'Receipt');
      if (!receipt) {
        addToast('error', `Receipt ${refNo} not found.`);
        return false;
      }
      if (receipt.status === 'Done') {
        addToast('info', `Receipt ${refNo} has already been validated.`);
        return true;
      }

      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // Increment matching product's currentStock
      setProducts((prev) => {
        const next = [...prev];
        receipt.items.forEach((item) => {
          const idx = next.findIndex((p) => p.id === item.productId || p.sku === item.sku);
          if (idx !== -1) {
            const newStock = next[idx].currentStock + item.receivedQty;
            next[idx] = {
              ...next[idx],
              currentStock: newStock,
              status: computeStatus(newStock, next[idx].minStock),
            };
          }
        });
        return next;
      });

      // Log new records in moveHistory (Vendor -> Destination)
      const newMoves: StockMove[] = receipt.items.map((item, i) => ({
        id: `mh-${Date.now()}-${i}`,
        timestamp,
        refNo: receipt.refNo,
        type: 'Receipt',
        productId: item.productId,
        productName: item.name,
        sku: item.sku,
        sourceLocation: receipt.partner || 'Vendor Intake',
        destLocation: receipt.destLocation,
        quantity: item.receivedQty,
        user: 'Alex Vance',
        uom: item.uom || 'pcs',
      }));
      setMoveHistory((prev) => [...newMoves, ...prev]);

      // Set receipt status to Done
      setOperations((prev) =>
        prev.map((op) => (op.refNo === refNo ? { ...op, status: 'Done' } : op))
      );

      addToast('success', `Receipt ${refNo} validated successfully. Physical stock intake posted to ledger.`);
      return true;
    },
    [operations, addToast]
  );

  // Action 2: validateDelivery(refNo)
  // Verifies if current stock is sufficient. If insufficient, triggers an error toast and blocks validation.
  // If sufficient, sets status to 'Done', decrements stock, logs to moveHistory, and fires a success toast.
  const validateDelivery = useCallback(
    (refNo: string): boolean => {
      const delivery = operations.find((op) => op.refNo === refNo && op.type === 'Delivery');
      if (!delivery) {
        addToast('error', `Delivery order ${refNo} not found.`);
        return false;
      }
      if (delivery.status === 'Done') {
        addToast('info', `Delivery order ${refNo} is already validated.`);
        return true;
      }

      // Check stock sufficiency for every item
      for (const item of delivery.items) {
        const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
        const avail = prod ? prod.currentStock : 0;
        if (item.expectedQty > avail) {
          addToast(
            'error',
            `Insufficient stock for ${item.sku}. Requested: ${item.expectedQty}, Available: ${avail}. Dispatch blocked.`
          );
          return false;
        }
      }

      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // Decrement stock
      setProducts((prev) => {
        const next = [...prev];
        delivery.items.forEach((item) => {
          const idx = next.findIndex((p) => p.id === item.productId || p.sku === item.sku);
          if (idx !== -1) {
            const newStock = Math.max(0, next[idx].currentStock - item.expectedQty);
            next[idx] = {
              ...next[idx],
              currentStock: newStock,
              status: computeStatus(newStock, next[idx].minStock),
            };
          }
        });
        return next;
      });

      // Log moves in moveHistory
      const newMoves: StockMove[] = delivery.items.map((item, i) => ({
        id: `mh-${Date.now()}-${i}`,
        timestamp,
        refNo: delivery.refNo,
        type: 'Delivery',
        productId: item.productId,
        productName: item.name,
        sku: item.sku,
        sourceLocation: delivery.sourceLocation,
        destLocation: `${delivery.partner} (${delivery.destLocation})`,
        quantity: item.expectedQty,
        user: 'Alex Vance',
        uom: item.uom || 'pcs',
      }));
      setMoveHistory((prev) => [...newMoves, ...prev]);

      // Set status to Done
      setOperations((prev) =>
        prev.map((op) => (op.refNo === refNo ? { ...op, status: 'Done' } : op))
      );

      addToast('success', `Delivery ${refNo} validated and dispatched. Inventory decremented.`);
      return true;
    },
    [operations, products, addToast]
  );

  // Action 3: applyAdjustment(productId, location, physicalCount)
  // Calculates delta = physicalCount - currentStock, updates stock,
  // logs an adjustment move to moveHistory, and recalculates low-stock badges.
  const applyAdjustment = useCallback(
    (productId: string, location: string, physicalCount: number): boolean => {
      const prod = products.find((p) => p.id === productId || p.sku === productId);
      if (!prod) {
        addToast('error', 'Product not found for adjustment.');
        return false;
      }

      const delta = physicalCount - prod.currentStock;
      const refNo = `ADJ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // 1. Update product stock and status
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === prod.id) {
            return {
              ...p,
              currentStock: physicalCount,
              status: computeStatus(physicalCount, p.minStock),
            };
          }
          return p;
        })
      );

      // 2. Log compensating move in moveHistory
      const sourceLocation = delta >= 0 ? 'Inventory Audit Count Gain' : location;
      const destLocation = delta >= 0 ? location : 'Inventory Audit Scrap / Loss';
      const newMove: StockMove = {
        id: `mh-${Date.now()}`,
        timestamp,
        refNo,
        type: 'Adjustment',
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        sourceLocation,
        destLocation,
        quantity: Math.abs(delta),
        user: 'Alex Vance',
        uom: prod.uom,
      };
      setMoveHistory((prev) => [newMove, ...prev]);

      // 3. Add to operations list
      const newOp: OperationDoc = {
        id: `op-${Date.now()}`,
        refNo,
        type: 'Adjustment',
        partner: 'Physical Inventory Audit',
        sourceLocation,
        destLocation,
        date: 'Just now',
        status: 'Done',
        warehouse: prod.warehouse,
        items: [
          {
            productId: prod.id,
            name: prod.name,
            sku: prod.sku,
            expectedQty: prod.currentStock,
            receivedQty: physicalCount,
            variance: delta,
            unitCost: prod.unitCost,
            uom: prod.uom,
          },
        ],
      };
      setOperations((prev) => [newOp, ...prev]);

      addToast(
        'success',
        `Adjusted ${prod.sku}: Delta ${delta >= 0 ? '+' : ''}${delta} ${prod.uom}. New stock: ${physicalCount}.`
      );
      return true;
    },
    [products, addToast]
  );

  // Action 4: updateReceiptItem(refNo, productId, receivedQty)
  // Dynamically recalculates variance = receivedQty - expectedQty in real time.
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

  // Helper CRUD
  const addProduct = useCallback(
    (data: Omit<Product, 'id'>) => {
      const id = `prod-${Date.now()}`;
      const newProd: Product = {
        ...data,
        id,
        status: computeStatus(data.currentStock, data.minStock),
      };
      setProducts((prev) => [...prev, newProd]);
      addToast('success', `Product ${newProd.name} (${newProd.sku}) created.`);
    },
    [addToast]
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
      (op) => op.type === 'Receipt' && (op.status === 'Ready' || op.status === 'Waiting')
    ).length;

    const pendingDeliveriesCount = activeOps.filter(
      (op) => op.type === 'Delivery' && (op.status === 'Picking' || op.status === 'Packing')
    ).length;

    const scheduledTransfersCount = activeOps.filter(
      (op) => op.type === 'Transfer' && (op.status === 'In Transit' || op.status === 'Waiting')
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
