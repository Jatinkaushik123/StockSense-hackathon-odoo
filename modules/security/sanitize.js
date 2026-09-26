/**
 * modules/security/sanitize.js
 * ------------------------------------------------------------------
 * Zod-powered payload validation + sanitization for every Server Action.
 * Rejects negative / fractional values wherever integer counts are expected,
 * neutralizes XSS-prone characters in free-text fields, and always returns
 * parameterization-safe primitives for the SQL layer.
 */
const { z } = require('zod');

/** Strip angle brackets/control chars and collapse whitespace in free text. */
function cleanText(value) {
  return String(value)
    .replace(/[<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

const safeText = (min, max) =>
  z.string().transform(cleanText).pipe(z.string().min(min).max(max));

const SAFE_TEXT = safeText(1, 150);
const SAFE_TEXT_SHORT = safeText(1, 50);

/** Integer counts — rejects 1.5, "2", -3 and non-digits outright. */
const positiveInt = z
  .number({ message: 'Expected a whole number' })
  .int('Whole numbers only — fractional quantities are rejected')
  .positive('Value must be greater than zero')
  .max(1_000_000_000, 'Value is unreasonably large');

const nonNegativeInt = z
  .number({ message: 'Expected a whole number' })
  .int('Whole numbers only — fractional quantities are rejected')
  .nonnegative('Negative values are not allowed')
  .max(1_000_000_000, 'Value is unreasonably large');

/** Ledger quantities allow 2-decimal precision but never negatives. */
const positiveDecimal = z
  .number({ message: 'Expected a quantity' })
  .positive('Quantity must be greater than zero')
  .max(999_999_999.99, 'Value is unreasonably large');

const nonNegativeDecimal = z
  .number({ message: 'Expected a quantity' })
  .nonnegative('Negative values are not allowed')
  .max(999_999_999.99, 'Value is unreasonably large');

const emailSchema = z
  .string().transform(cleanText).pipe(
    z.string().toLowerCase().email('Enter a valid email address').max(150)
  );

const passwordSchema = z
  .string().min(8, 'Password must be at least 8 characters').max(72);

const otpSchema = z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits');

const roleSchema = z.enum(['manager', 'staff']);

const operationTypeSchema = z.enum(['receipt', 'delivery', 'internal', 'adjustment']);

const moveLineSchema = z.object({
  productId: positiveInt,
  quantity: positiveDecimal,
});

const moveLineIntSchema = z.object({
  productId: positiveInt,
  quantity: positiveInt,
});

// ---- Domain schemas ---------------------------------------------------------

const signupSchema = z.object({
  name: safeText(2, 100),
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(72),
});

const forgotPasswordSchema = z.object({ email: emailSchema });

const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  password: passwordSchema,
});

const productSchema = z.object({
  name: safeText(2, 150),
  sku: z.string().transform((v) => cleanText(v).toUpperCase().replace(/\s+/g, '-')).pipe(
    z.string().min(2).max(50).regex(/^[A-Z0-9._-]+$/, 'SKU may only contain A–Z, 0–9, dot, dash, underscore')
  ),
  category: safeText(2, 100),
  uom: SAFE_TEXT_SHORT,
  minStockAlert: nonNegativeInt.default(10),
});

const productUpdateSchema = productSchema.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: 'No fields to update' }
);

const locationSchema = z.object({
  name: safeText(2, 100),
  warehouseName: safeText(2, 100).default('Main Warehouse'),
  type: z.enum(['internal', 'vendor', 'customer', 'inventory_loss']),
});

const operationHeaderSchema = z.object({
  type: operationTypeSchema,
  partnerName: z.string().transform(cleanText).pipe(z.string().max(150)).optional(),
});

// ---- Document creation schemas ---------------------------------------------
// Movement quantities are INTEGER counts (fractional values are rejected).

const optionalPartnerName = z.string().transform(cleanText).pipe(z.string().max(150)).optional();

const moveLines = z
  .array(moveLineIntSchema)
  .min(1, 'At least one product line is required')
  .max(50, 'Maximum 50 lines per document');

const receiptCreateSchema = z.object({
  partnerName: optionalPartnerName,
  destLocationId: positiveInt,
  lines: moveLines,
});

const deliveryCreateSchema = z.object({
  partnerName: optionalPartnerName,
  sourceLocationId: positiveInt,
  lines: moveLines,
});

const transferCreateSchema = z.object({
  sourceLocationId: positiveInt,
  destLocationId: positiveInt,
  lines: moveLines,
}).refine((v) => v.sourceLocationId !== v.destLocationId, {
  message: 'Source and destination locations must differ',
  path: ['destLocationId'],
});

const adjustmentCreateSchema = z.object({
  locationId: positiveInt,
  lines: z.array(z.object({
    productId: positiveInt,
    countedQty: nonNegativeDecimal,
  })).min(1, 'Count at least one product').max(100),
});

// ---- Operation lifecycle schemas -------------------------------------------

const operationIdSchema = z.object({ operationId: positiveInt });

const statusTransitionSchema = z.object({
  operationId: positiveInt,
  targetStatus: z.enum(['Waiting', 'Ready', 'Canceled']),
});

const paginationSchema = z.object({
  page: nonNegativeInt.default(0),
  pageSize: z.number().int().min(5).max(100).default(10),
  filter: z.string().transform(cleanText).pipe(z.string().max(60)).optional(),
  type: operationTypeSchema.optional(),
});

/**
 * Parse + validate input against a schema. Throws a ValidationError
 * with an input-path -> message map for UI rendering.
 */
class ValidationError extends Error {
  constructor(fieldErrors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.status = 400;
    this.fieldErrors = fieldErrors;
  }
}

function parseOrThrow(schema, input) {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    const fieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    throw new ValidationError(fieldErrors);
  }
  return result.data;
}

module.exports = {
  z,
  cleanText,
  parseOrThrow,
  ValidationError,
  schemas: {
    signupSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    productSchema,
    productUpdateSchema,
    locationSchema,
    operationHeaderSchema,
    receiptCreateSchema,
    deliveryCreateSchema,
    transferCreateSchema,
    adjustmentCreateSchema,
    operationIdSchema,
    statusTransitionSchema,
    moveLineSchema,
    moveLineIntSchema,
    paginationSchema,
  },
};
