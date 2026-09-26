export type UoM = 'kg' | 'pcs' | 'box' | 'meter';

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface Product {
  id: string;
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
  status: StockStatus;
  spec?: string;
}

export interface LineItem {
  productId: string;
  name: string;
  sku: string;
  expectedQty: number;
  receivedQty: number;
  variance: number;
  unitCost: number;
  barcode?: string;
  uom?: UoM;
  lotSerial?: string;
  qcStatus?: 'Passed' | 'Inspected' | 'Pending' | 'Failed';
}

export type OperationType = 'Receipt' | 'Delivery' | 'Transfer' | 'Adjustment';

export interface OperationDoc {
  id: string;
  refNo: string;
  type: OperationType;
  partner: string;
  sourceLocation: string;
  destLocation: string;
  date: string;
  status: string; // 'Draft' | 'Waiting' | 'Ready' | 'Picking' | 'In Transit' | 'Done' | 'Canceled'
  items: LineItem[];
  warehouse?: string;
  carrier?: string;
  notes?: string;
}

export interface StockMove {
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
  user: string;
  uom?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}
