import { fetchData, fetchDataWithHeaders, postData, postDataWithHeaders, userputData, userPutFormData, userPostFormData, deleteDataWithHeaders, putData, deleteData, fetchDataWithParams } from "./apiClient";
import axios from "axios";

// customer
export const getSettingsListApi = async (page = 1, limit = 10, search = '') => {
  const params = { page, limit };
  if (search) params.search = search;
  return await fetchDataWithParams('settings', params);
};
export const createSettingApi = (payload) => postData('settings', payload);
export const updateSettingApi = async (id, payload) => await putData(`settings/${id}`, payload);
export const deleteSettingApi = (id) => deleteData(`settings/${id}`);
export const getSettingByIdApi = async (id) => await fetchData(`settings/${id}`);
export const getCustomersApi = async (page = 1, limit = 10, search = '', region = '', minimal = false) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (region && region !== 'ALL') params.region = region;
  if (minimal) params.minimal = true;
  return await fetchDataWithParams('customer', params);
};

export const getCustomerByIdApi = async (id) => {
  return await fetchData(`customer/${id}`);
};

export const createCustomerApi = (payload) => postData("customer", payload);
export const updateCustomerApi = async (id, payload) => {
  return await putData(`customer/${id}`, { id, ...payload });
};
export const deleteCustomerApi = (id, deletedBy = null) => deleteData(`customer/${id}`, { data: { deletedBy } });

// brand
export const getBrandsApi = async (page = 1, limit = 10, search = '', customerId = '', minimal = false) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (customerId && customerId !== 'ALL') params.customerId = customerId;
  if (minimal) params.minimal = true;
  return await fetchDataWithParams('brand', params);
};


export const getBrandsByCustomerIdApi = async (customerId) => {
  return await fetchData(`brand/by-customer/${customerId}`);
};

export const getBrandByIdApi = async (id) => {
  return await fetchData(`brand/${id}`);
};

export const createBrandApi = (payload) => postData("brand", payload);
export const updateBrandApi = async (id, payload) => {
  return await putData(`brand/${id}`, { id, ...payload });
};
export const deleteBrandApi = (id, deletedBy = null) => deleteData(`brand/${id}`, { data: { deletedBy } });



// sticker
export const getStickersApi = async (page = 1, limit = 10, search = '', brandId = '') => {
  return await fetchDataWithParams('sticker', { page, limit, search, brandId });
};

export const getStickersByBrandIdApi = async (brandId) => {
  return await fetchData(`sticker/by-brand/${brandId}`);
};

export const getStickerByIdApi = async (id) => {
  return await fetchData(`sticker/${id}`);
};

export const createStickerApi = (payload) => postData("sticker", payload);

export const deleteStickerApi = (id, deletedBy = null) => deleteData(`sticker/${id}`, { data: { deletedBy } });

// category
export const getCategoriesApi = async (page = 1, limit = 10, search = '', status = 'ALL', parentId = undefined, minimal = false) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (status && status !== 'ALL') params.status = status;
  if (parentId !== undefined) params.parentId = parentId;
  if (minimal) params.minimal = true;
  return await fetchDataWithParams('category', params);
};

export const getCategoryByIdApi = async (id) => {
  return await fetchData(`category/${id}`);
};

export const createCategoryApi = (payload) => postData("category", payload);

export const updateCategoryApi = async (id, payload) => {
  return await putData(`category/${id}`, { id, ...payload });
};

export const deleteCategoryApi = (id, deletedBy = null) => deleteData(`category/${id}`, { data: { deletedBy } });

export const getCategoryKpisApi = async () => {
  return await fetchData('category/kpi');
};


// unit
export const getUnitsApi = async (page = 1, limit = 10, search = '', status = 'ALL') => {
  const params = { page, limit };
  if (search) params.search = search;
  if (status && status !== 'ALL') params.status = status;
  return await fetchDataWithParams('unit', params);
};

export const getUnitByIdApi = async (id) => {
  return await fetchData(`unit/${id}`);
};

export const createUnitApi = (payload) => postData("unit", payload);

export const updateUnitApi = async (id, payload) => {
  return await putData(`unit/${id}`, { id, ...payload });
};

export const deleteUnitApi = (id, deletedBy = null) => deleteData(`unit/${id}`, { data: { deletedBy } });

// product
export const getProductsApi = async (page = 1, limit = 10, search = '', status = 'ALL', categoryId = 'ALL', stock = 'ALL', unitId = 'ALL', minimal = false) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (status && status !== 'ALL') params.status = status;
  if (categoryId && categoryId !== 'ALL') params.categoryId = categoryId;
  if (stock && stock !== 'ALL') params.stock = stock;
  if (unitId && unitId !== 'ALL') params.unitId = unitId;
  if (minimal) params.minimal = true;
  return await fetchDataWithParams('product', params);
};

export const getProductByIdApi = async (id) => {
  return await fetchData(`product/${id}`);
};

export const createProductApi = (payload) => postData("product", payload);

export const updateProductApi = async (id, payload) => {
  return await putData(`product/${id}`, { id, ...payload });
};

export const deleteProductApi = (id, deletedBy = null) => deleteData(`product/${id}`, { data: { deletedBy } });

export const getProductKpisApi = async () => {
  return await fetchData('product/kpi');
};

export const getBodyDesignsApi = async (page = 1, limit = 10, search = '', productId = 'ALL', minimal = false) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (productId && productId !== 'ALL') params.productId = productId;
  if (minimal) params.minimal = true;
  return await fetchDataWithParams('product/body-design', params);
};

export const getColoursApi = async (page = 1, limit = 10, search = '', productId = 'ALL', minimal = false) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (productId && productId !== 'ALL') params.productId = productId;
  if (minimal) params.minimal = true;
  return await fetchDataWithParams('product/colour', params);
};

// Users
export const getUsersApi = async (page = 1, limit = 10, search = '') => {
  return await fetchDataWithParams('user', { page, limit, search });
};
export const getUserByIdApi = async (id) => fetchData(`user/${id}`);
export const createUserApi = (payload) => postData('user', payload);
export const updateUserApi = async (id, payload) => putData(`user/${id}`, { id, ...payload });
export const deleteUserApi = (id, deletedBy = null) => deleteData(`user/${id}`, { data: { deletedBy } });

// Security Roles
export const getSecurityRolesApi = async (page = 1, limit = 10, search = '') => {
  return await fetchDataWithParams('security_role', { page, limit, search });
};
export const getSecurityRoleOptionsApi = async (search = '') => {
  return await fetchDataWithParams('security_role/options', { search });
};
export const getSecurityRoleByIdApi = async (id) => fetchData(`security_role/${id}`);
export const createSecurityRoleApi = (payload) => postData('security_role', payload);
export const updateSecurityRoleApi = async (id, payload) => putData(`security_role/${id}`, { id, ...payload });
export const deleteSecurityRoleApi = (id, deletedBy = null) => deleteData(`security_role/${id}`, { data: { deletedBy } });

// Modules
export const getModulesApi = async () => fetchData('module');

// packaging
export const getPackagingsApi = async (page = 1, limit = 10, search = '', customerId = 'ALL', minimal = false) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (customerId && customerId !== 'ALL') params.customerId = customerId;
  if (minimal) params.minimal = true;
  return await fetchDataWithParams('packaging', params);
};

export const getPackagingByIdApi = async (id) => {
  return await fetchData(`packaging/${id}`);
};

export const createPackagingApi = (payload) => postData("packaging", payload);

export const updatePackagingApi = async (id, payload) => {
  return await putData(`packaging/${id}`, { id, ...payload });
};

export const deletePackagingApi = (id, deletedBy = null) => deleteData(`packaging/${id}`, { data: { deletedBy } });

// customisation
export const getCustomisationsApi = async (page = 1, limit = 10, search = '', category = 'ALL') => {
  const params = { page, limit };
  if (search) params.search = search;
  if (category && category !== 'ALL') params.category = category;
  return await fetchDataWithParams('customisation', params);
};

export const getCustomisationByIdApi = async (id) => {
  return await fetchData(`customisation/${id}`);
};

export const getCustomisationKpisApi = async () => {
  return await fetchData('customisation/kpi');
};


// order
export const getOrdersApi = async (page = 1, limit = 10, search = '', filters = {}) => {
  return await fetchDataWithParams('order', { page, limit, search, ...filters });
};

export const getOrdersByProductApi = async (page = 1, limit = 10, search = '', filters = {}) => {
  return await fetchDataWithParams('order/by-product', { page, limit, search, ...filters });
};

export const getOrderFiltersApi = async (type = '', search = '') => {
  return await fetchDataWithParams('order/filters', { type, search });
};


export const getOrderByIdApi = async (id) => {
  return await fetchData(`order/${id}`);
};

export const createOrderApi = (payload) => postData("order", payload);

export const updateOrderApi = async (id, payload) => {
  return await putData(`order/${id}`, { id, ...payload });
};

export const deleteOrderApi = (id, deletedBy = null) => deleteData(`order/${id}`, { data: { deletedBy } });

// Box (Godown)
export const getBoxesApi = async (page = 1, limit = 10, search = '') => {
  return await fetchDataWithParams('box', { page, limit, search });
};

export const getBoxByIdApi = async (id) => {
  return await fetchData(`box/${id}`);
};

export const createBoxApi = (payload) => postData("box", payload);

export const updateBoxApi = async (id, payload) => {
  return await putData(`box/${id}`, { id, ...payload });
};

export const deleteBoxApi = (id, deletedBy = null) => deleteData(`box/${id}`, { data: { deletedBy } });

export const getBoxKpisApi = async () => {
  return await fetchData('box/kpi');
};

// Section
export const getSectionsApi = async (page = 1, limit = 10, search = '', boxId = null) => {
  const params = { page, limit, search };
  if (boxId) params.boxId = boxId;
  return await fetchDataWithParams('section', params);
};

export const getSectionByIdApi = async (id) => {
  return await fetchData(`section/${id}`);
};

export const createSectionApi = (payload) => postData("section", payload);

export const updateSectionApi = async (id, payload) => {
  return await putData(`section/${id}`, { id, ...payload });
};

export const deleteSectionApi = (id, deletedBy = null) => deleteData(`section/${id}`, { data: { deletedBy } });

// Tray
export const getTraysApi = async (page = 1, limit = 10, search = '', sectionId = null) => {
  const params = { page, limit, search };
  if (sectionId) params.sectionId = sectionId;
  return await fetchDataWithParams('tray', params);
};

export const getTrayByIdApi = async (id) => {
  return await fetchData(`tray/${id}`);
};

export const createTrayApi = (payload) => postData("tray", payload);

export const updateTrayApi = async (id, payload) => {
  return await putData(`tray/${id}`, { id, ...payload });
};

export const deleteTrayApi = (id, deletedBy = null) => deleteData(`tray/${id}`, { data: { deletedBy } });

// stock
export const updateStockApi = (payload) => putData('stock', payload);