import { Route, Routes } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { UnitsPage } from './components/units/UnitsPage';
import { BillTypesManager } from './components/catalogs/BillTypesManager';
import { PaymentMethodsManager } from './components/catalogs/PaymentMethodsManager';
import { ResponsiblesManager } from './components/catalogs/ResponsiblesManager';

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
                <Route path="/configuracion/tipos-recibo" element={<BillTypesManager />} />
                <Route path="/configuracion/medios-pago" element={<PaymentMethodsManager />} />
                <Route path="/configuracion/responsables" element={<ResponsiblesManager />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
