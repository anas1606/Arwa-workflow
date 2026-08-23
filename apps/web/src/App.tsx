import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CreateOrderPage } from './pages/CreateOrderPage';
import { OrderConfigPage } from './pages/OrderConfigPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductionPage } from './pages/ProductionPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="orders/new" element={<CreateOrderPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/by-product" element={<OrdersPage />} />
        <Route path="orders/by-order-type" element={<OrdersPage />} />
        <Route path="orders/customisation" element={<OrderConfigPage />} />
        <Route
          path="orders/config"
          element={<Navigate to="/orders/customisation" replace />}
        />
        <Route path="production" element={<ProductionPage />} />
        <Route
          path="bom"
          element={
            <PlaceholderPage
              title="BOM"
              subtitle="Bill of materials — structure UI later."
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
