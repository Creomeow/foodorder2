import { Navigate, Route, Routes } from 'react-router-dom';
import { Role } from '@foodorder/shared';
import { useAuth } from './store/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import KDS from './pages/KDS';
import MenuManage from './pages/MenuManage';
import Categories from './pages/Categories';
import Modifiers from './pages/Modifiers';
import Tables from './pages/Tables';
import Settings from './pages/Settings';
import Outlets from './pages/Outlets';
import Brands from './pages/Brands';
import Users from './pages/Users';
import Coupons from './pages/Coupons';
import Loyalty from './pages/Loyalty';
import Reports from './pages/Reports';

function RequireAuth({ children }: { children: JSX.Element }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ roles, children }: { roles: Role[]; children: JSX.Element }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* KDS is full-screen, outside the sidebar layout. */}
      <Route
        path="/kds"
        element={
          <RequireAuth>
            <KDS />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/menu" element={<MenuManage />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/modifiers" element={<Modifiers />} />
        <Route path="/tables" element={<Tables />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route
          path="/loyalty"
          element={
            <RequireRole roles={[Role.SUPER_ADMIN, Role.MANAGER]}>
              <Loyalty />
            </RequireRole>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireRole roles={[Role.SUPER_ADMIN, Role.MANAGER]}>
              <Reports />
            </RequireRole>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireRole roles={[Role.SUPER_ADMIN, Role.MANAGER]}>
              <Settings />
            </RequireRole>
          }
        />
        <Route
          path="/outlets"
          element={
            <RequireRole roles={[Role.SUPER_ADMIN, Role.MANAGER]}>
              <Outlets />
            </RequireRole>
          }
        />
        <Route
          path="/brands"
          element={
            <RequireRole roles={[Role.SUPER_ADMIN]}>
              <Brands />
            </RequireRole>
          }
        />
        <Route
          path="/users"
          element={
            <RequireRole roles={[Role.SUPER_ADMIN, Role.MANAGER]}>
              <Users />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
