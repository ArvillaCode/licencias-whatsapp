import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RequirePermission } from './components/auth/RequirePermission';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { UnitsPage } from './components/units/UnitsPage';
import { BillTypesManager } from './components/catalogs/BillTypesManager';
import { PaymentMethodsManager } from './components/catalogs/PaymentMethodsManager';
import { ResponsiblesManager } from './components/catalogs/ResponsiblesManager';
import { UsersManager } from './components/users/UsersManager';
import { useAuth } from './contexts/AuthContext';

function HomeLanding() {
  const { can, isAdmin } = useAuth();
  if (can('dashboard')) return <DashboardView />;
  if (can('units') || can('bills')) return <Navigate to="/unidades" replace />;
  if (can('catalogs')) return <Navigate to="/configuracion/tipos-recibo" replace />;
  if (isAdmin) return <Navigate to="/usuarios" replace />;
  return (
    <div style={{ color: 'var(--color-text-secondary)', padding: '2rem 0' }}>
      No tienes secciones asignadas todavía. Contacta al administrador.
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomeLanding />} />
                <Route
                  path="/unidades"
                  element={
                    <RequirePermission anyOf={['units', 'bills']}>
                      <UnitsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/configuracion/tipos-recibo"
                  element={
                    <RequirePermission permission="catalogs">
                      <BillTypesManager />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/configuracion/medios-pago"
                  element={
                    <RequirePermission permission="catalogs">
                      <PaymentMethodsManager />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/configuracion/responsables"
                  element={
                    <RequirePermission permission="catalogs">
                      <ResponsiblesManager />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <RequirePermission adminOnly>
                      <UsersManager />
                    </RequirePermission>
                  }
                />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
