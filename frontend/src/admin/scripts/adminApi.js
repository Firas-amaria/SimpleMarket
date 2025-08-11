import api from "../../utils/api"; // axios instance with token interceptor

// ---------------- Dashboard ----------------
export const adminGetDashboardStats = async () => {
  const res = await api.get("/admin/dashboardStats");
  return res.data; // { cards: [...] }
};

// ---------------- Products ----------------
export const adminListProducts = async (params) => {
  const res = await api.get("/admin/listProducts", { params });
  return res.data; // { items, total, page, pages }
};

export const adminGetProduct = async (id) => {
  const res = await api.get(`/admin/getProduct/${id}`);
  return res.data; // product object
};

export const adminCreateProduct = async (data) => {
  const res = await api.post("/admin/createProduct", data);
  return res.data; // created product
};

export const adminUpdateProduct = async (id, data) => {
  const res = await api.put(`/admin/updateProduct/${id}`, data);
  return res.data; // updated product
};

export const adminDeleteProduct = async (id) => {
  const res = await api.delete(`/admin/deleteProduct/${id}`);
  return res.data; // { message, deletedId, images }
};

// ---------------- Orders ----------------
export const adminListOrders = async (params) => {
  const res = await api.get("/admin/listOrders", { params });
  return res.data; // { items, total, page, pages }
};

export const adminUpdateOrderStatus = async (id, payload) => {
  const res = await api.patch(`/admin/updateOrderStatus/${id}`, payload);
  return res.data; // updated order
};

// ---------------- Users ----------------
export const adminListUsers = async (params) => {
  const res = await api.get("/admin/listUsers", { params });
  return res.data; // { items, total, page, pages }
};

export const adminDeleteUser = async (id) => {
  const res = await api.delete(`/admin/deleteUser/${id}`);
  return res.data; // { message, deletedId }
};

// ---------------- Stocks ----------------
export const adminListStocks = async (params) => {
  const res = await api.get("/admin/listStocks", { params });
  return res.data; // { items, total, page, pages }
};

export const adminCreateStock = async (data) => {
  const res = await api.post("/admin/createStock", data);
  return res.data; // created stock
};

export const adminUpdateStockQty = async (id, payload) => {
  const res = await api.patch(`/admin/updateStockQty/${id}`, payload);
  return res.data; // updated stock
};

export const adminDeleteStock = async (id) => {
  const res = await api.delete(`/admin/deleteStock/${id}`);
  return res.data; // { message, deletedId }
};

export const adminGetOrderById = async (id) => {
  const res = await api.get(`/admin/getOrderById/${id}`);
  return res.data; // populated order
};
