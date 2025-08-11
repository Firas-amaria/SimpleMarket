import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

import ProtectedAdminRoute from "./ProtectedAdminRoute";
import AdminLayout from "./admin/components/AdminLayout";
import Dashboard from "./admin/Dashboard";
import Products from "./admin/Products";
import Orders from "./admin/Orders";
import Users from "./admin/Users";
import Stocks from "./admin/Stocks";

export default function App() {
  return (
    <Routes>
      {/* public site */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Index />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* admin area (role-guarded) */}
      <Route element={<ProtectedAdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="users" element={<Users />} />
          <Route path="stocks" element={<Stocks />} />
          {/* products/orders/users will go here */}
        </Route>
      </Route>
    </Routes>
  );
}
