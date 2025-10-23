import { UNKNOWN_ERR_CODE, UNKNOWN_ERR_MESSAGE } from "./constant";

export const parseError = (e) => {
    return {
        error: e.error || UNKNOWN_ERR_CODE,
        message: e?.response?.data?.message || e.message || UNKNOWN_ERR_MESSAGE,
    };
};