import axios from "axios"
import { API_HOST } from "../utils/constant";

const Axios = axios.create({
  baseURL: API_HOST,
  withCredentials: true,
});

Axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      // Don't redirect if already on login or logout pages
      if (currentPath?.includes("/dashboard")) {
        window.location.href = '/logout';
      }
    }


    return Promise.reject(error);
  }
);

export const createAPI = (baseUrl, signal) => {
  return {
    list: async () => {
      let { data } = await Axios.get(baseUrl, { signal });
      return data?.data;
    },
    get: async (id) => {
      let { data } = await Axios.get(`${baseUrl}/${id}`, { signal });
      return data?.data;
    },
    post: async (payload) => {
      let { data } = await Axios.post(baseUrl, payload, { signal });
      return data?.data;
    },
    put: async (id, payload) => {
      let { data } = await Axios.put(`${baseUrl}/${id}`, payload, { signal });
      return data?.data;
    },
    paginate: async (params) => {
      let { data } = await Axios.get(baseUrl, { signal, params });
      return data?.data;
    },
    delete: async (id) => {
      let { data } = await Axios.delete(`${baseUrl}/${id}`, { signal });
      return data?.data;
    },
    upload: async (file, onUploadProgress) => {
      const formData = new FormData();
      formData.append('file', file);

      let { data } = await Axios.post(baseUrl, formData, {
        signal,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      });
      return data?.data;
    },
    listAll: async (params = {}) => {
      // Fetch first page
      const firstPage = await Axios.get(baseUrl, {
        signal,
        params: { ...params, page: 1, limit: params.limit || 50 }
      });

      const firstPageData = firstPage.data?.data;

      if (!firstPageData?.results) {
        return [];
      }

      const results = [...firstPageData.results];
      const totalPages = firstPageData.totalPages || 1;

      // Fetch remaining pages in parallel
      if (totalPages > 1) {
        const pagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
          pagePromises.push(
            Axios.get(baseUrl, {
              signal,
              params: { ...params, page, limit: params.limit || 50 }
            })
          );
        }

        const remainingPages = await Promise.all(pagePromises);
        remainingPages.forEach(response => {
          const pageData = response.data?.data;
          if (pageData?.results?.length) {
            results.push(...pageData.results);
          }
        });
      }

      return results;
    },
    custom: async (httpMethod, path, options = {}) => {
      const { params, body } = options;
      const config = { signal, params };
      const url = `${baseUrl}${path}`;

      const { data } = httpMethod === 'get' || httpMethod === 'delete'
        ? await Axios[httpMethod](url, config)
        : await Axios[httpMethod](url, body, config);

      return data?.data;
    }
  }
}