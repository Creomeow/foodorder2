import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Role } from '@foodorder/shared';
import { useAuth } from '../store/auth';
import { useTenant } from '../store/tenant';
import { useRestaurants } from '../lib/hooks';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: Role[];
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/orders', label: 'Orders', icon: '🧾' },
  { to: '/kds', label: 'Kitchen (KDS)', icon: '👨‍🍳' },
  { to: '/menu', label: 'Menu', icon: '🍜' },
  { to: '/categories', label: 'Categories', icon: '🗂️' },
  { to: '/modifiers', label: 'Modifiers', icon: '⚙️' },
  { to: '/tables', label: 'Tables & QR', icon: '🪑' },
  { to: '/coupons', label: 'Coupons', icon: '🎟️' },
  { to: '/loyalty', label: 'Loyalty', icon: '⭐', roles: [Role.SUPER_ADMIN, Role.MANAGER] },
  { to: '/reports', label: 'Reports', icon: '📈', roles: [Role.SUPER_ADMIN, Role.MANAGER] },
  { to: '/outlets', label: 'Outlets', icon: '🏪', roles: [Role.SUPER_ADMIN, Role.MANAGER] },
  { to: '/brands', label: 'Brands', icon: '🏢', roles: [Role.SUPER_ADMIN] },
  { to: '/users', label: 'Users', icon: '👥', roles: [Role.SUPER_ADMIN, Role.MANAGER] },
  { to: '/settings', label: 'Settings', icon: '🔧', roles: [Role.SUPER_ADMIN, Role.MANAGER] },
];

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { restaurantId, restaurantName, setRestaurant } = useTenant();
  const { data: restaurants } = useRestaurants();
  const [open, setOpen] = useState(false);

  // Pick a default outlet once the list loads.
  useEffect(() => {
    if (!restaurantId && restaurants && restaurants.length > 0) {
      const preferred = user?.restaurantId
        ? restaurants.find((r) => r.id === user.restaurantId)
        : restaurants[0];
      const r = preferred ?? restaurants[0];
      setRestaurant(r.id, r.name, r.currency);
    }
  }, [restaurantId, restaurants, user, setRestaurant]);

  const items = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 transform bg-gray-900 text-gray-200 transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center gap-2 px-5 text-lg font-bold text-white">
          🍽️ FoodAdmin
        </div>
        <nav className="space-y-1 px-3 py-2">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand text-white' : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <span>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setOpen(true)}>
              ☰
            </button>
            {/* Tenant switcher */}
            <select
              value={restaurantId ?? ''}
              onChange={(e) => {
                const r = restaurants?.find((x) => x.id === e.target.value);
                if (r) setRestaurant(r.id, r.name, r.currency);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium"
            >
              {!restaurants?.length && <option>{restaurantName ?? 'Loading…'}</option>}
              {restaurants?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight">{user?.name}</p>
              <p className="text-[11px] text-gray-500">{user?.role}</p>
            </div>
            <button
              onClick={onLogout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
