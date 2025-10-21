// hooks/mongoose.js

const {
    ERROR_LOG_LEVEL,
    INFO_LOG_LEVEL,
    CRITICAL_LOG_LEVEL,
    WARNING_LOG_LEVEL,
} = require("../constant");
const { normalizeError } = require("../function");

//@ts-check
const useLogger = ({
    Sender
}) => {
    return {
        error: (e) => {
            const { title, message, stack } = normalizeError(e)
            return Sender({
                level: ERROR_LOG_LEVEL,
                title,
                message,
                context: { stack },
            })
        },
        info: (e) => {
            const { title, message, stack } = normalizeError(e)
            return Sender({
                level: INFO_LOG_LEVEL,
                title,
                message,
                context: null,
            })
        },
        critical: (e) => {
            const { title, message, stack } = normalizeError(e)
            return Sender({
                level: CRITICAL_LOG_LEVEL,
                title,
                message,
                context: { stack },
            })
        },
        warn: (e) => {
            const { title, message, stack } = normalizeError(e)
            return Sender({
                level: WARNING_LOG_LEVEL,
                title,
                message,
                context: null,
            })
        },
        custom: (level, {
            title,
            message,
            context
        }) => {
            return Sender({
                level,
                title,
                message,
                context,
            })
        },
    }
}

module.exports = { useLogger };
