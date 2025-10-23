//@ts-check

const { UNKNOWN_ERR_MESSAGE, UNKNOWN_ERR_CODE } = require("./../constant");

const buildError = ({ error, message, showError = false }) => {
    const err = new Error(message || UNKNOWN_ERR_MESSAGE)
    err.error = error?.code || error || UNKNOWN_ERR_CODE;
    err.showError = showError
    return err;
}

const HttpError = (error, message) => {

    if (error && typeof error === 'object' && 'error' in error) {
        return buildError(error);
    }

    let msg = message || UNKNOWN_ERR_MESSAGE

    if (typeof message === typeof {}) {
        let key = Object.keys(message)[0];
        msg = message[key].message
    }

    const code = parseInt(error, 10);
    const status = isNaN(code) || code < 200 ? 500 : code;

    return buildError({ error: status, message: msg, showError: true });
}

const parseError = (e) => {

    const message = e?.showError ? (e?.response?.data?.message || e?.response?.data || e?.data || e?.message || e?.stack || e || UNKNOWN_ERR_MESSAGE) : UNKNOWN_ERR_MESSAGE
    const error = e?.error || e?.name || e?.constructor?.name || UNKNOWN_ERR_CODE
    return {
        error,
        message
    }
}


const normalizeError = (e) => {
    if (e instanceof Error) {
        let m = parseError(e)
        return {
            title: m?.error,
            message: m?.message,
            stack: e?.stack || null
        };
    } else if (typeof e === 'string') {
        return {
            title: e,
            message: ''
        };
    } else {
        return {
            title: e?.title || 'Unknown Error',
            message: e?.message || JSON.stringify(e)
        };
    }
};

module.exports = {
    HttpError,
    parseError,
    normalizeError,
}