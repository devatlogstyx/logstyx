//@ts-check
import axios from "axios"
import { API_HOST } from "../utils/constant";

const Axios = axios.create({
    baseURL: API_HOST,
    withCredentials: true,
});


export const getCurrentUser = async () => {
    let { data } = await Axios.get("/v1/user/me");
    return data?.data;
}