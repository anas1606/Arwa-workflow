import { fetchData, fetchDataWithHeaders, postData, postDataWithHeaders, userputData, userPutFormData, userPostFormData, deleteDataWithHeaders, putData, deleteData, fetchDataWithParams } from "./apiClient";
import axios from "axios";

// customer
export const getCustomersApi = async (page = 1, limit = 10, search = '', region = '') => {
  return await fetchDataWithParams('customer', { page, limit, search, region });
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
  return await fetchDataWithParams('brand', { page, limit, search, customerId });
};

export const getBrandByIdApi = async (id) => {
  return await fetchData(`brand/${id}`);
};

export const createBrandApi = (payload) => postData("brand", payload);
export const updateBrandApi = async (id, payload) => {
  return await putData(`brand/${id}`, { id, ...payload });
};
export const deleteBrandApi = (id, deletedBy = null) => deleteData(`brand/${id}`, { data: { deletedBy } });
