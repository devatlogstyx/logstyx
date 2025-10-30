//@ts-check
import axios from "axios"
import { API_HOST } from "../utils/constant";

const Axios = axios.create({
    baseURL: API_HOST,
    withCredentials: true,
});

/**
 * 
 * @param {*} signal 
 * @returns 
 */
export const getCurrentUser = async (signal) => {
    let { data } = await Axios.get("/v1/users/me", {
        signal
    });
    return data?.data;
}