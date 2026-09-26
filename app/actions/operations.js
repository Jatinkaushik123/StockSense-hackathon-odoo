'use server';
/**
 * app/actions/operations.js
 * ------------------------------------------------------------------
 * Inventory document Server Actions.
 *  - create*   : Draft documents with line items (staff + manager)
 *  - advance   : Draft -> Waiting -> Ready (staff + manager)
 *  - validate* : posts stock + ledger, sets Done (MANAGER ONLY)
 * All stock mutations happen inside runInTransaction() in the engines;
 * these actions only validate input, enforce RBAC and refresh the UI.
 */
import { revalidatePath } from 'next/cache';

import rbacModule from '../../modules/auth/rbac.js';
import errorHandlerModule from '../../modules/security/errorHandler.js';
import sanitizeModule from '../../modules/security/sanitize.js';
import engineShared from '../../modules/engine/shared.js';
import receiptEngine from '../../modules/engine/receiptEngine.js';
import deliveryEngine from '../../modules/engine/deliveryEngine.js';
import transferEngine from '../../modules/engine/transferEngine.js';
import adjustmentEngine from '../../modules/engine/adjustmentEngine.js';
import { textField, numberField, linesFrom } from '../_lib/forms.js';

const { requireUser } = rbacModule;
const { withAction } = errorHandlerModule;
const { schemas, parseOrThrow } = sanitizeModule;
const { advanceStatus } = engineShared;

function revalidateInventory() {
  revalidatePath('/');
  revalidatePath('/receipts');
  revalidatePath('/deliveries');
  revalidatePath('/transfers');
  revalidatePath('/adjustments');
  revalidatePath('/stock');
  revalidatePath('/history');
}

const partner = (formData) => {
  const value = textField(formData, 'partnerName');
  return value === undefined ? null : value;
};

// ---- Receipts ---------------------------------------------------------------

export const createReceiptAction = withAction(async (_prevState, formData) => {
  const user = await requireUser({ minRole: 'staff' });
  const input = parseOrThrow(schemas.receiptCreateSchema, {
    partnerName: partner(formData),
    destLocationId: numberField(formData, 'destLocationId'),
    lines: linesFrom(formData, 'quantity'),
  });
  const operation = await receiptEngine.createReceipt({ ...input, user });
  revalidateInventory();
  return {
    message: `${operation.reference_no} created as Draft — advance it to Ready, then validate to post stock in.`,
  };
});

export const validateReceiptAction = withAction(async (_prevState, formData) => {
  const user = await requireUser({ minRole: 'manager' });
  const { operationId } = parseOrThrow(schemas.operationIdSchema, {
    operationId: numberField(formData, 'operationId'),
  });
  const result = await receiptEngine.validateReceipt({ operationId, user });
  revalidateInventory();
  return {
    message: `${result.operation.reference_no} validated: ${result.lines} line(s), ${result.totalUnits} unit(s) received into stock.`,
  };
});

// ---- Deliveries -------------------------------------------------------------

export const createDeliveryAction = withAction(async (_prevState, formData) => {
  const user = await requireUser({ minRole: 'staff' });
  const input = parseOrThrow(schemas.deliveryCreateSchema, {
    partnerName: partner(formData),
    sourceLocationId: numberField(formData, 'sourceLocationId'),
    lines: linesFrom(formData, 'quantity'),
  });
  const operation = await deliveryEngine.createDelivery({ ...input, user });
  revalidateInventory();
  return {
    message: `${operation.reference_no} created as Draft — pick & pack (Ready), then validate to dispatch.`,
  };
});

export const validateDeliveryAction = withAction(async (_prevState, formData) => {
  const user = await requireUser({ minRole: 'manager' });
  const { operationId } = parseOrThrow(schemas.operationIdSchema, {
    operationId: numberField(formData, 'operationId'),
  });
  const result = await deliveryEngine.validateDelivery({ operationId, user });
  revalidateInventory();
  return {
    message: `${result.operation.reference_no} dispatched: ${result.totalUnits} unit(s) deducted from stock.`,
  };
});

// ---- Internal transfers -----------------------------------------------------

export const createTransferAction = withAction(async (_prevState, formData) => {
  const user = await requireUser({ minRole: 'staff' });
  const input = parseOrThrow(schemas.transferCreateSchema, {
    sourceLocationId: numberField(formData, 'sourceLocationId'),
    destLocationId: numberField(formData, 'destLocationId'),
    lines: linesFrom(formData, 'quantity'),
  });
  const operation = await transferEngine.createTransfer({ ...input, user });
  revalidateInventory();
  return { message: `${operation.reference_no} created as Draft — validate to move the stock.` };
});

export const validateTransferAction = withAction(async (_prevState, formData) => {
  const user = await requireUser({ minRole: 'manager' });
  const { operationId } = parseOrThrow(schemas.operationIdSchema, {
    operationId: numberField(formData, 'operationId'),
  });
  const result = await transferEngine.validateTransfer({ operationId, user });
  revalidateInventory();
  return {
    message: `${result.operation.reference_no} executed: ${result.totalUnits} unit(s) moved between zones.`,
  };
});

// ---- Stock adjustments ------------------------------------------------------

export const createAdjustmentAction = withAction(async (_prevState, formData) => {
  const user = await requireUser({ minRole: 'manager' });
  const input = parseOrThrow(schemas.adjustmentCreateSchema, {
    locationId: numberField(formData, 'locationId'),
    lines: linesFrom(formData, 'countedQty'),
  });
  const operation = await adjustmentEngine.createAdjustment({ ...input, user });
  revalidateInventory();
  return {
    message: `${operation.reference_no} recorded as Draft — validate to reconcile the counted quantities.`,
  };
});

export const validateAdjustmentAction = withAction(async (_prevState, formData) => {
  const user = await requireUser({ minRole: 'manager' });
  const { operationId } = parseOrThrow(schemas.operationIdSchema, {
    operationId: numberField(formData, 'operationId'),
  });
  const result = await adjustmentEngine.validateAdjustment({ operationId, user });
  revalidateInventory();
  return {
    message: `${result.operation.reference_no} reconciled: ${result.movements} compensating ledger movement(s) posted.`,
  };
});

// ---- Workflow transitions (shared by all four pages) ------------------------

export const advanceOperationAction = withAction(async (_prevState, formData) => {
  const user = await requireUser({ minRole: 'staff' });
  const { operationId, targetStatus } = parseOrThrow(schemas.statusTransitionSchema, {
    operationId: numberField(formData, 'operationId'),
    targetStatus: textField(formData, 'targetStatus'),
  });
  const operation = await advanceStatus({ operationId, targetStatus, user });
  revalidateInventory();
  const labels = { Waiting: 'Waiting (confirmed)', Ready: 'Ready (picked & packed)', Canceled: 'Canceled' };
  return { message: `${operation.reference_no} → ${labels[targetStatus] || targetStatus}.` };
});
