'use server';
/**
 * app/actions/auth.js
 * ------------------------------------------------------------------
 * Authentication Server Actions (no REST endpoints — direct calls).
 * Every action returns a safe envelope:
 *   success -> { ok: true, data: {...} }
 *   failure -> { ok: false, error, fieldErrors? }
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import authService from '../../modules/auth/service.js';
import errorHandlerModule from '../../modules/security/errorHandler.js';
import sanitizeModule from '../../modules/security/sanitize.js';
import { textField, rawField, clientIp } from '../_lib/forms.js';

const { withAction } = errorHandlerModule;
const { schemas, parseOrThrow } = sanitizeModule;

export const loginAction = withAction(async (_prevState, formData) => {
  const input = parseOrThrow(schemas.loginSchema, {
    email: textField(formData, 'email'),
    password: rawField(formData, 'password'),
  });
  const user = await authService.login(input, { ip: await clientIp() });
  revalidatePath('/', 'layout');
  redirect('/');
});

export const signupAction = withAction(async (_prevState, formData) => {
  const input = parseOrThrow(schemas.signupSchema, {
    name: textField(formData, 'name'),
    email: textField(formData, 'email'),
    password: rawField(formData, 'password'),
    role: textField(formData, 'role') || 'staff',
  });
  await authService.signup(input, { ip: await clientIp() });
  revalidatePath('/', 'layout');
  redirect('/');
});

export const logoutAction = withAction(async () => {
  await authService.logout();
  revalidatePath('/', 'layout');
  redirect('/login');
});

export const requestOtpAction = withAction(async (_prevState, formData) => {
  const input = parseOrThrow(schemas.forgotPasswordSchema, {
    email: textField(formData, 'email'),
  });
  const result = await authService.requestPasswordOtp(input, { ip: await clientIp() });
  return {
    message: result.devCode
      ? `Demo mode: your reset code is shown below (valid ${result.ttlMinutes} minutes).`
      : 'If that email is registered, a reset code has been sent.',
    devCode: result.devCode,
  };
});

export const resetPasswordAction = withAction(async (_prevState, formData) => {
  const input = parseOrThrow(schemas.resetPasswordSchema, {
    email: textField(formData, 'email'),
    otp: textField(formData, 'otp'),
    password: rawField(formData, 'password'),
  });
  await authService.resetPassword(input, { ip: await clientIp() });
  return { message: 'Password updated. Switch to the Sign in tab and use your new password.' };
});
