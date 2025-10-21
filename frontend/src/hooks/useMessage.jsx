// @ts-check
import React, { useCallback } from "react";
import { FaTimes, FaCheck } from "react-icons/fa";
import { showNotification } from "@mantine/notifications";
import { UNKNOWN_ERR_MESSAGE } from "../utils/constant";
import { parseError } from "../utils/function";

export const useErrorMessage = () => {
    return useCallback((e) => {
        let err = parseError(e);
        showNotification({
            message: err?.message || UNKNOWN_ERR_MESSAGE,
            autoClose: 3000,
            color: "red",
            withBorder: true,
            classNames: {
                root: "!rounded-xl flex justify-center",
            },
            icon: <FaTimes className="text-white" />,
        });
    }, []);
};


export const useSuccessMessage = () => {
    return useCallback((message) => {
        showNotification({
            message,
            autoClose: 3000,
            color: "green",
            withBorder: true,
            classNames: {
                root: "!rounded-xl flex justify-center",
            },
            icon: <FaCheck className="text-white" />,
        });
    }, []);
};
