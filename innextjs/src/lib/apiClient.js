// lib/apiClient.js
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

const apiClient = axios.create({
  baseURL: baseURL,
  timeout: 120000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  paramsSerializer: {
    serialize: (params) => {
      const parts = [];
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value)) {
          value.forEach(v => {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
          });
        } else if (typeof value === 'object' && value !== null) {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`);
        } else {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
      }
      return parts.join('&');
    }
  }
});

// Add request interceptor to attach token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle 401 Unauthorized (expired/changed token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't auto-redirect to login if it's an authentication endpoint or already on an auth page
    const isAuthEndpoint = error.config?.url?.includes('auth/');
    const isAuthPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth');

    if (error.response?.status === 401) {
      const isWishlistEndpoint = error.config?.url?.includes('wishlist/');
      if (typeof window !== 'undefined' && !isAuthEndpoint && !isAuthPage && !isWishlistEndpoint) {
        try {
          // Tell the backend to explicitly clear the invalid/expired cookie
          await apiClient.post('auth/logout');
        } catch (e) {
          // Ignore error on logout
        }

        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const handleResponse = (promise) =>
  promise
    .then((res) => ({ data: res.data, error: null }))
    .catch((err) => {
      console.error("API Error:", err?.message || "Unknown error", err?.response?.data);
      const resData = err.response?.data;
      
      // If the backend provided a specific error details (like Zod validation errors) in resData.error
      // or a generic message in resData.message
      const errorMessage = resData?.error || resData?.message || "Something went wrong";
      
      return {
        data: null,
        error: {
          status: err.response?.status || 500,
          message: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        },
      };
    });

export const fetchData = (path, config = {}) => {
  return handleResponse(apiClient.get(path, config));
}

export const fetchDataWithHeaders = (path, config = {}) => {
  return handleResponse(apiClient.get(path, config));
};

export const postData = (path, payload, config = {}) =>
  handleResponse(apiClient.post(path, payload, config));

export const postDataWithHeaders = (path, payload, config = {}) => {
  return handleResponse(apiClient.post(path, payload, config));
};

export const putData = (path, payload, config = {}) =>
  handleResponse(apiClient.put(path, payload, config));

export const userputData = (path, payload, config = {}) => {
  return handleResponse(apiClient.put(path, payload, config));
};

export const userPutFormData = (path, formData, config = {}) => {
  const customConfig = {
    ...config,
    headers: {
      "Content-Type": undefined,
      ...config.headers,
    },
  };
  return handleResponse(apiClient.put(path, formData, customConfig));
};

export const userPostFormData = (path, formData, config = {}) => {
  const customConfig = {
    ...config,
    headers: {
      "Content-Type": undefined,
      ...config.headers,
    },
  };
  return handleResponse(apiClient.post(path, formData, customConfig));
};

export const userpassowrdpatchData = (path, payload, config = {}) => {
  return handleResponse(apiClient.patch(path, payload, config));
};

export const fetchDataWithParams = (path, params = {}, config = {}) =>
  handleResponse(apiClient.get(path, { params, ...config }));

export const deleteDataWithHeaders = (path, payload, config = {}) => {
  return handleResponse(apiClient.delete(path, payload, config));
};

export const deleteData = (path, config = {}) =>
  handleResponse(apiClient.delete(path, config));
