import Axios from "./AxiosClient";

/**
 * 
 * @param {*} signal 
 * @param {*} params 
 * @returns 
 */
export const listMyBucket = async (signal) => {
    let { data } = await Axios.get(`/v1/users/me/buckets`, {
        signal,
    });
    return data?.data;
}
