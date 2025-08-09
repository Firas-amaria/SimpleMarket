import api from "../api";

// Dashboard
export const adminGetDashboardStats = () => api.get("/admin/getDashboardStats");

// Products
export const adminListProducts = (params) =>
  api.get("/admin/listProducts", { params });

export const adminGetProduct = (id) => api.get(`/admin/getProduct/${id}`);

export const adminCreateProduct = (data) =>
  api.post("/admin/createProduct", data);

export const adminUpdateProduct = (id, data) =>
  api.put(`/admin/updateProduct/${id}`, data);

export const adminDeleteProduct = (id) =>
  api.delete(`/admin/deleteProduct/${id}`);

// Orders
export const adminListOrders = (params) =>
  api.get("/admin/listOrders", { params });

export const adminUpdateOrderStatus = (id, payload) =>
  api.patch(`/admin/updateOrderStatus/${id}`, payload);

// Users
export const adminListUsers = (params) =>
  api.get("/admin/listUsers", { params });
