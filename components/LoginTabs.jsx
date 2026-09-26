'use client';

import { useActionState, useState } from 'react';
import SubmitButton from './SubmitButton.jsx';
import {
  loginAction,
  signupAction,
  requestOtpAction,
  resetPasswordAction,
} from '../app/actions/auth.js';

function ErrorList({ state }) {
  const fieldErrors = state?.fieldErrors ? Object.values(state.fieldErrors) : [];
  return (
    <>
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
    </>
  );
}

function SignInForm() {
  const [state, formAction] = useActionState(loginAction, null);
  return (
    <form action={formAction} className="form">
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required minLength={1} />
      </label>
      <ErrorList state={state} />
      <SubmitButton label="Sign in" full />
    </form>
  );
}

function SignUpForm() {
  const [state, formAction] = useActionState(signupAction, null);
  return (
    <form action={formAction} className="form">
      <label className="field">
        <span>Full name</span>
        <input name="name" required maxLength={100} placeholder="Ava Stone" autoComplete="name" />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
      </label>
      <label className="field">
        <span>Password (min 8 characters)</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </label>
      <label className="field">
        <span>Requested role</span>
        <select name="role" defaultValue="staff">
          <option value="staff">Warehouse Staff</option>
          <option value="manager">Inventory Manager</option>
        </select>
      </label>
      <p className="hint">
        Manager role is granted automatically only to the first account of an empty database —
        later signups are provisioned as Warehouse Staff.
      </p>
      <ErrorList state={state} />
      <SubmitButton label="Create account" full />
    </form>
  );
}

function ForgotForm() {
  const [otpState, otpAction] = useActionState(requestOtpAction, null);
  const [resetState, resetAction] = useActionState(resetPasswordAction, null);
  const devCode = otpState?.ok ? otpState?.data?.devCode : null;

  return (
    <div className="stack">
      <form action={otpAction} className="form">
        <label className="field">
          <span>Account email</span>
          <input name="email" type="email" required placeholder="you@company.com" />
        </label>
        <ErrorList state={otpState} />
        {otpState?.ok && otpState?.data?.message ? (
          <p className="form-success">{otpState.data.message}</p>
        ) : null}
        {devCode ? (
          <p className="otp-code">
            OTP: <strong>{devCode}</strong>
          </p>
        ) : null}
        <SubmitButton label="Send reset code" />
      </form>

      {otpState?.ok ? (
        <form action={resetAction} className="form">
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required placeholder="you@company.com" />
          </label>
          <label className="field">
            <span>6-digit code</span>
            <input name="otp" inputMode="numeric" pattern="\d{6}" maxLength={6} required placeholder="123456" />
          </label>
          <label className="field">
            <span>New password (min 8 characters)</span>
            <input name="password" type="password" required minLength={8} maxLength={72} />
          </label>
          <ErrorList state={resetState} />
          {resetState?.ok && resetState?.data?.message ? (
            <p className="form-success">{resetState.data.message}</p>
          ) : null}
          <SubmitButton label="Reset password" />
        </form>
      ) : null}
    </div>
  );
}

export default function LoginTabs() {
  const [tab, setTab] = useState('signin');

  return (
    <div className="tabs-block">
      <div className="tabs" role="tablist">
        {[
          { key: 'signin', label: 'Sign in' },
          { key: 'signup', label: 'Create account' },
          { key: 'forgot', label: 'Forgot password' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? 'tab active' : 'tab'}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'signin' ? <SignInForm /> : null}
      {tab === 'signup' ? <SignUpForm /> : null}
      {tab === 'forgot' ? <ForgotForm /> : null}

      <div className="demo-creds">
        <p className="demo-title">Demo accounts</p>
        <p>
          <strong>Manager</strong> manager@stocksense.dev · Manager@123
        </p>
        <p>
          <strong>Staff</strong> staff@stocksense.dev · Staff@123
        </p>
      </div>
    </div>
  );
}
