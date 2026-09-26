import ActionForm from './ActionForm.jsx';
import StatusBadge from './StatusBadge.jsx';
import {
  advanceOperationAction,
  validateReceiptAction,
  validateDeliveryAction,
  validateTransferAction,
  validateAdjustmentAction,
} from '../app/actions/operations.js';

const VALIDATE_ACTION_BY_KIND = {
  receipt: validateReceiptAction,
  delivery: validateDeliveryAction,
  transfer: validateTransferAction,
  adjustment: validateAdjustmentAction,
};

const VALIDATE_LABEL_BY_KIND = {
  receipt: 'Validate receipt (stock in)',
  delivery: 'Dispatch (stock out)',
  transfer: 'Execute transfer',
  adjustment: 'Reconcile count',
};

const NEXT_STEP = { Draft: 'Waiting', Waiting: 'Ready' };
const NEXT_LABEL = { Waiting: 'Waiting (confirmed)', Ready: 'Ready (picked & packed)' };
const STEPS = ['Draft', 'Waiting', 'Ready', 'Done'];

function WorkflowSteps({ status }) {
  if (status === 'Canceled') {
    return <p className="steps-canceled">Document canceled — no stock was moved.</p>;
  }
  const currentIndex = STEPS.indexOf(status);
  return (
    <ol className="steps">
      {STEPS.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
        return (
          <li key={step} className={`step ${state}`}>
            <span className="step-dot" aria-hidden="true" />
            {step}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Generic document board shared by the four operation pages.
 * Server component: RBAC gate renders manager-only validate forms.
 */
export default function OperationsBoard({ kind, operations, user }) {
  const validateAction = VALIDATE_ACTION_BY_KIND[kind];
  const isManager = user.role === 'manager';

  if (!operations.length) {
    return <p className="empty">No documents yet — create the first one above.</p>;
  }

  return (
    <ul className="op-list">
      {operations.map((operation) => {
        const nextStep = NEXT_STEP[operation.status];
        const totalQuantity = Number(operation.total_quantity);
        return (
          <li key={operation.id} className="op-card">
            <div className="op-head">
              <div>
                <p className="op-ref">{operation.reference_no}</p>
                <p className="op-meta">
                  {operation.partner_name ? <span>{operation.partner_name} · </span> : null}
                  {operation.line_count} line{operation.line_count === 1 ? '' : 's'} ·{' '}
                  {totalQuantity.toLocaleString()} units · by {operation.created_by_name || 'system'}
                </p>
              </div>
              <StatusBadge status={operation.status} />
            </div>

            <WorkflowSteps status={operation.status} />

            <div className="op-actions">
              {nextStep ? (
                <ActionForm
                  action={advanceOperationAction}
                  hiddenFields={{ operationId: operation.id, targetStatus: nextStep }}
                  submitLabel={nextStep === 'Waiting' ? 'Confirm ✓' : 'Mark picked & packed ✓'}
                  variant="secondary"
                  confirmMessage={`Move ${operation.reference_no} to ${NEXT_LABEL[nextStep]}?`}
                />
              ) : null}

              {operation.status === 'Ready' ? (
                isManager ? (
                  <ActionForm
                    action={validateAction}
                    hiddenFields={{ operationId: operation.id }}
                    submitLabel={VALIDATE_LABEL_BY_KIND[kind]}
                    confirmMessage={`Post ${operation.reference_no} to the ledger? Stock moves immediately and cannot be undone.`}
                  />
                ) : (
                  <p className="locked-note">Manager approval required to validate ✅</p>
                )
              ) : null}

              {/* Cancel is manager-only (enforced again server-side). */}
              {isManager && operation.status !== 'Done' && operation.status !== 'Canceled' ? (
                <ActionForm
                  action={advanceOperationAction}
                  hiddenFields={{ operationId: operation.id, targetStatus: 'Canceled' }}
                  submitLabel="Cancel ✕"
                  variant="ghost"
                  confirmMessage={`Cancel ${operation.reference_no}? No stock will be moved.`}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
