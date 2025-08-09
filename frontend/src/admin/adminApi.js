import api from "../api";

// Dashboard
export const adminGetDashboardStats = () =>
  api.get("/api/admin/getDashboardStats");

// Products
export const adminListProducts = (params) =>
  api.get("/api/admin/listProducts", { params });

export const adminGetProduct = (id) => api.get(`/api/admin/getProduct/${id}`);

export const adminCreateProduct = (data) =>
  api.post("/api/admin/createProduct", data);

export const adminUpdateProduct = (id, data) =>
  api.put(`/api/admin/updateProduct/${id}`, data);

export const adminDeleteProduct = (id) =>
  api.delete(`/api/admin/deleteProduct/${id}`);

// Orders
export const adminListOrders = (params) =>
  api.get("/api/admin/listOrders", { params });

export const adminUpdateOrderStatus = (id, payload) =>
  api.patch(`/api/admin/updateOrderStatus/${id}`, payload);

// Users
export const adminListUsers = (params) =>
  api.get("/api/admin/listUsers", { params });
