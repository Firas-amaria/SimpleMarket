import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import AdminLayout from "./admin/AdminLayout";
import Dashboard from "./admin/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          {/* <Route path="products" element={<ManageProducts />} /> */}
          {/* <Route path="orders" element={<ManageOrders />} /> */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
