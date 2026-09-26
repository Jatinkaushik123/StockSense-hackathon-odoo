'use client';

import { useActionState, useEffect, useRef } from 'react';
import SubmitButton from './SubmitButton.jsx';

/**
 * Wraps any Server Action with:
 *  - useActionState envelope handling ({ ok, data, error, fieldErrors })
 *  - inline validation + success messaging
 *  - optional confirm dialog and post-success reset
 */
export default function ActionForm({
  action,
  children,
  submitLabel = 'Save',
  variant = 'primary',
  resetOnSuccess = false,
  confirmMessage = null,
  hiddenFields = null,
  className = '',
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok && !pending) formRef.current?.reset();
  }, [state, pending, resetOnSuccess]);

  const fieldErrors = state?.fieldErrors ? Object.values(state.fieldErrors) : [];

  return (
    <form
      ref={formRef}
      action={formAction}
      className={`form ${className}`.trim()}
      onSubmit={
        confirmMessage
          ? (event) => {
              if (!window.confirm(confirmMessage)) event.preventDefault();
            }
          : undefined
      }
    >
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={String(value)} />
          ))
        : null}
      {children}
      {fieldErrors.length > 0 ? (
        <ul className="form-error" role="alert">
          {fieldErrors.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      ) : null}
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok && state?.data?.message ? (
        <p className="form-success" role="status">
          {state.data.message}
        </p>
      ) : null}
      <SubmitButton label={submitLabel} variant={variant} />
    </form>
  );
}
