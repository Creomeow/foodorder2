import { Routes, Route, Navigate } from 'react-router-dom';
import TableEntry from './pages/TableEntry';
import Takeaway from './pages/Takeaway';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Pay from './pages/Pay';
import OrderTracking from './pages/OrderTracking';
import Landing from './pages/Landing';

export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-white shadow-sm">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/table/:qrToken" element={<TableEntry />} />
        <Route path="/takeaway" element={<Takeaway />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pay/:orderId" element={<Pay />} />
        <Route path="/order/:orderId" element={<OrderTracking />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
