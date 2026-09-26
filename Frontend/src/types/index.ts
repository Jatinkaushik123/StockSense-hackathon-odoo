export type UoM = 'kg' | 'pcs' | 'box' | 'meter' | 'liters';

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: 'Raw Materials' | 'Finished Goods' | 'Consumables' | 'Spare Parts';
  uom: UoM;
  currentStock: number;
  minStock: number;
  maxStock: number;
  warehouse: string;
  location: string;
  unitCost: number;
  status: StockStatus;
  description?: string;
  spec?: string;
}

export interface WarehouseZone {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  unit: string;
  isHazardous?: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  zones: WarehouseZone[];
}

export type OperationType = 'receipt' | 'delivery' | 'transfer' | 'adjustment';

export type ReceiptStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';
export type DeliveryStatus = 'Draft' | 'Picking' | 'Packing' | 'In Transit' | 'Done' | 'Canceled';
export type TransferStatus = 'Draft' | 'Waiting' | 'In Transit' | 'Done' | 'Canceled';
export type AdjustmentStatus = 'Draft' | 'In Review' | 'Done' | 'Canceled';

export interface ReceiptLineItem {
  id: string;
  productId: string;
  productName: string;
  spec?: string;
  sku: string;
  barcode: string;
  uom: UoM;
  expectedQty: number;
  receivedQty: number;
  variance: number;
  unitCost: number;
  subtotal: number;
  lotSerial: string;
  qcStatus: 'Passed' | 'Inspected' | 'Pending' | 'Failed';
}

export interface Receipt {
  id: string;
  refNo: string;
  supplier: string;
  sourcePo: string;
  contact: string;
  warehouse: string;
  destinationLocation: string;
  stowageLocation: string;
  receivingDock: string;
  carrier: string;
  trackingNo: string;
  leadInspector: string;
  receiptTime: string;
  status: ReceiptStatus;
  stage: 1 | 2 | 3 | 4; // 1: Draft, 2: Waiting, 3: Ready, 4: Done
  items: ReceiptLineItem[];
  operationalNotes: string;
  shortfallAlert?: {
    sku: string;
    productName: string;
    shortfallQty: number;
    bolNo: string;
    acknowledged: boolean;
  };
  freightSurcharge: number;
  totalInboundValue: number;
}

export interface DeliveryLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  uom: UoM;
  requestedQty: number;
  pickedQty: number;
  availableStock: number;
  unitCost: number;
  subtotal: number;
}

export interface DeliveryOrder {
  id: string;
  refNo: string;
  customer: string;
  sourceLocation: string;
  destinationLocation: string;
  warehouse: string;
  scheduledDate: string;
  status: DeliveryStatus;
  items: DeliveryLineItem[];
  carrier: string;
  trackingNo?: string;
  notes?: string;
}

export interface TransferLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  uom: UoM;
  quantity: number;
  availableStock: number;
}

export interface InternalTransfer {
  id: string;
  refNo: string;
  sourceWarehouse: string;
  sourceLocation: string;
  destWarehouse: string;
  destLocation: string;
  scheduledDate: string;
  status: TransferStatus;
  items: TransferLineItem[];
  notes?: string;
}

export interface StockAdjustment {
  id: string;
  refNo: string;
  warehouse: string;
  location: string;
  productId: string;
  productName: string;
  sku: string;
  recordedCount: number;
  physicalCount: number;
  delta: number;
  reason: string;
  date: string;
  operator: string;
  status: AdjustmentStatus;
}

export interface MoveHistoryItem {
  id: string;
  timestamp: string;
  refNo: string;
  type: OperationType;
  productId: string;
  productName: string;
  sku: string;
  sourceLocation: string;
  destLocation: string;
  quantity: number;
  uom: UoM;
  user: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  unread: boolean;
  link: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}
