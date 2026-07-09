import { Route, Routes } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RequireAdmin } from './components/auth/RequireAdmin';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { UnitsPage } from './components/units/UnitsPage';
import { BillTypesManager } from './components/catalogs/BillTypesManager';
import { PaymentMethodsManager } from './components/catalogs/PaymentMethodsManager';
import { ResponsiblesManager } from './components/catalogs/ResponsiblesManager';
import { UsersManager } from './components/users/UsersManager';

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
                <Route path="/" element={<DashboardView />} />
                <Route path="/unidades" element={<UnitsPage />} />
                <Route
                  path="/configuracion/tipos-recibo"
                  element={
                    <RequireAdmin>
                      <BillTypesManager />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/configuracion/medios-pago"
                  element={
                    <RequireAdmin>
                      <PaymentMethodsManager />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/configuracion/responsables"
                  element={
                    <RequireAdmin>
                      <ResponsiblesManager />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <RequireAdmin>
                      <UsersManager />
                    </RequireAdmin>
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
