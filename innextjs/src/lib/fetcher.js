import { fetchData, fetchDataWithHeaders, postData, postDataWithHeaders, userputData, userPutFormData, userPostFormData, deleteDataWithHeaders, putData, deleteData, fetchDataWithParams } from "./apiClient";
import axios from "axios";

// customer
export const getCustomersApi = async (page = 1, limit = 10, search = '', region = '') => {
  const params = { page, limit };
  if (search) params.search = search;
  if (region && region !== 'ALL') params.region = region;
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
export const getBrandsApi = async (page = 1, limit = 10, search = '', customerId = '') => {
  const params = { page, limit };
  if (search) params.search = search;
  if (customerId) params.customerId = customerId;
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
export const getCategoriesApi = async (page = 1, limit = 10, search = '', status = 'ALL') => {
  const params = { page, limit };
  if (search) params.search = search;
  if (status && status !== 'ALL') params.status = status;
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