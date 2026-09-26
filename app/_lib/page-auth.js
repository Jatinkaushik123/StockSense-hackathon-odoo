import { redirect } from 'next/navigation';
import sessionModule from '../../modules/auth/session.js';

const { getSessionUser } = sessionModule;

/**
 * Guard for server-rendered pages: returns the DB-validated session user
 * or redirects to the sign-in screen. Every page renders through this.
 */
export async function requirePageUser() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}
