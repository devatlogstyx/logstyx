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
      // Backend says session expired - kick them out
      window.location.href = '/logout';
    }
    return Promise.reject(error);
  }
);


export default Axios