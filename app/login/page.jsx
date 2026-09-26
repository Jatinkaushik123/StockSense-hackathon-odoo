import { redirect } from 'next/navigation';
import sessionModule from '../../modules/auth/session.js';
import LoginTabs from '../../components/LoginTabs.jsx';

const { getSessionUser } = sessionModule;

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in — StockSense' };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect('/');

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          ◧ StockSense
          <span>Inventory Management System</span>
        </div>
        <LoginTabs />
      </div>
      <p className="login-foot">
        Double-entry stock ledger · Receipts · Deliveries · Internal transfers · Adjustments
      </p>
    </div>
  );
}
