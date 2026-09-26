import { logoutAction } from '../app/actions/auth.js';

const NAV_ITEMS = [
  { key: 'dashboard', href: '/', label: 'Dashboard', icon: '◧' },
  { key: 'stock', href: '/stock', label: 'Stock', icon: '▦' },
  { key: 'receipts', href: '/receipts', label: 'Receipts', icon: '▼' },
  { key: 'deliveries', href: '/deliveries', label: 'Deliveries', icon: '▲' },
  { key: 'transfers', href: '/transfers', label: 'Transfers', icon: '⇄' },
  { key: 'adjustments', href: '/adjustments', label: 'Adjustments', icon: '⚖' },
  { key: 'products', href: '/products', label: 'Products', icon: '❖' },
  { key: 'locations', href: '/locations', label: 'Locations', icon: '⌂' },
  { key: 'history', href: '/history', label: 'Ledger', icon: '≡' },
];

export default function AppShell({ user, active, children }) {
  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">◧</span>
          <span className="brand-text">
            StockSense
            <em>Inventory Management</em>
          </span>
        </a>
        <div className="topbar-right">
          <span className="user-chip">
            <span className="user-name">{user.name}</span>
            <span className={`role-badge role-${user.role}`}>
              {user.role === 'manager' ? 'Manager' : 'Staff'}
            </span>
          </span>
          <form action={logoutAction} className="logout-form">
            <button type="submit" className="btn btn-ghost btn-sm">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="shell-body">
        <nav className="nav-desktop" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={active === item.key ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <main className="main">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={active === item.key ? 'nav-item active' : 'nav-item'}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
