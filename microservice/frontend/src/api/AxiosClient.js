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


export default Axios