import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import Payables from './pages/Payables';
import PayableDetail from './pages/PayableDetail';
import Receivables from './pages/Receivables';
import ReceivableDetail from './pages/ReceivableDetail';
import Users from './pages/Users';
import Settings from './pages/Settings';

function Protected({ children, adminOnly }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/olvide-password" element={<ForgotPassword />} />
      <Route path="/restablecer-password" element={<ResetPassword />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/ventas" element={<Protected><Sales /></Protected>} />
      <Route path="/facturas" element={<Protected><Invoices /></Protected>} />
      <Route path="/facturas/:id" element={<Protected><InvoiceDetail /></Protected>} />
      <Route path="/inventario" element={<Protected><Products /></Protected>} />
      <Route path="/clientes" element={<Protected><Customers /></Protected>} />
      <Route path="/proveedores" element={<Protected><Suppliers /></Protected>} />
      <Route path="/compras" element={<Protected><PurchaseOrders /></Protected>} />
      <Route path="/compras/:id" element={<Protected><PurchaseOrderDetail /></Protected>} />
      <Route path="/cuentas-por-pagar" element={<Protected><Payables /></Protected>} />
      <Route path="/cuentas-por-pagar/:id" element={<Protected><PayableDetail /></Protected>} />
      <Route path="/cuentas-por-cobrar" element={<Protected><Receivables /></Protected>} />
      <Route path="/cuentas-por-cobrar/:id" element={<Protected><ReceivableDetail /></Protected>} />
      <Route path="/usuarios" element={<Protected adminOnly><Users /></Protected>} />
      <Route path="/configuracion" element={<Protected adminOnly><Settings /></Protected>} />
    </Routes>
  );
}
