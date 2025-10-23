export const API_HOST = import.meta.env.VITE_API_HOST;
export const THIS_HOST = import.meta.env.VITE_THIS_HOST;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

export const SUCCESS_ERR_CODE = 200;
export const SUCCESS_ERR_MESSAGE = "Success";

export const UNKNOWN_ERR_CODE = 500;
export const UNKNOWN_ERR_MESSAGE = "Unknown Error";

export const NOT_FOUND_ERR_CODE = 404;
export const NOT_FOUND_ERR_MESSAGE = "Not Found";

export const NO_ACCESS_ERR_CODE = 401;
export const NO_ACCESS_ERR_MESSAGE = "No Access";

export const INVALID_INPUT_ERR_CODE = 400;
export const INVALID_INPUT_ERR_MESSAGE = "Bad Request";

export const EMAIL_PASSWORD_LOGIN_TYPE = "EMAIL_PASSWORD"

export const PENDING_FLASH_SALE_STATUS = "PENDING"
export const ACTIVE_FLASH_SALE_STATUS = "ACTIVE"
export const FINISHED_FLASH_SALE_STATUS = "FINISHED"

export const ORDER_RESULT_SOCKETIO_CHANNEL="ORDER_RESULT"