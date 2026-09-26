'use server';
/**
 * app/actions/products.js
 * ------------------------------------------------------------------
 * Product master + location catalog Server Actions.
 * RBAC: writes are Inventory Manager only; reads live in page
 * components (server-rendered) and are available to both roles.
 */
import { revalidatePath } from 'next/cache';

import rbacModule from '../../modules/auth/rbac.js';
import catalog from '../../modules/products/catalog.js';
import locationService from '../../modules/products/locations.js';
import errorHandlerModule from '../../modules/security/errorHandler.js';
import sanitizeModule from '../../modules/security/sanitize.js';
import { textField, numberField } from '../_lib/forms.js';

const { requireUser } = rbacModule;
const { withAction, AppError } = errorHandlerModule;
const { schemas, parseOrThrow } = sanitizeModule;

function revalidateCatalog() {
  revalidatePath('/products');
  revalidatePath('/stock');
  revalidatePath('/locations');
  revalidatePath('/');
}

export const createProductAction = withAction(async (_prevState, formData) => {
  await requireUser({ minRole: 'manager' });
  const input = parseOrThrow(schemas.productSchema, {
    name: textField(formData, 'name'),
    sku: textField(formData, 'sku'),
    category: textField(formData, 'category'),
    uom: textField(formData, 'uom'),
    minStockAlert: numberField(formData, 'minStockAlert') ?? 10,
  });
  const product = await catalog.createProduct(input);
  revalidateCatalog();
  return { message: `Product "${product.name}" (${product.sku}) added to the catalog.` };
});

export const updateProductAction = withAction(async (_prevState, formData) => {
  await requireUser({ minRole: 'manager' });
  const id = numberField(formData, 'id');
  if (!id) throw new AppError('Product id is required.', 400);

  const candidate = {
    name: textField(formData, 'name'),
    sku: textField(formData, 'sku'),
    category: textField(formData, 'category'),
    uom: textField(formData, 'uom'),
    minStockAlert: numberField(formData, 'minStockAlert'),
  };
  const patch = Object.fromEntries(
    Object.entries(candidate).filter(([, value]) => value !== undefined)
  );
  const input = parseOrThrow(schemas.productUpdateSchema, patch);
  const product = await catalog.updateProduct(id, input);
  revalidateCatalog();
  return { message: `Product "${product.name}" updated.` };
});

export const deleteProductAction = withAction(async (_prevState, formData) => {
  await requireUser({ minRole: 'manager' });
  const id = numberField(formData, 'id');
  if (!id) throw new AppError('Product id is required.', 400);
  await catalog.deleteProduct(id);
  revalidateCatalog();
  return { message: 'Product deleted.' };
});

export const createLocationAction = withAction(async (_prevState, formData) => {
  await requireUser({ minRole: 'manager' });
  const input = parseOrThrow(schemas.locationSchema, {
    name: textField(formData, 'name'),
    warehouseName: textField(formData, 'warehouseName') ?? 'Main Warehouse',
    type: textField(formData, 'type'),
  });
  const location = await locationService.createLocation(input);
  revalidateCatalog();
  return { message: `Location "${location.name}" created.` };
});
