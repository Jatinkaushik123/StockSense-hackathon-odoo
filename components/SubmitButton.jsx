'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitButton({
  label,
  variant = 'primary',
  small = false,
  full = false,
  className = '',
}) {
  const { pending } = useFormStatus();
  const classes = [
    'btn',
    `btn-${variant}`,
    small ? 'btn-sm' : '',
    full ? 'btn-block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type="submit" className={classes} disabled={pending} aria-busy={pending}>
      {pending ? 'Working…' : label}
    </button>
  );
}
