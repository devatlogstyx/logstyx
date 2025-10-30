// hooks/mongoose.js

const {
    ERROR_LOG_LEVEL,
    INFO_LOG_LEVEL,
    CRITICAL_LOG_LEVEL,
    WARNING_LOG_LEVEL,
} = require("../constant");
const { normalizeError, decryptSecret, createSlug } = require("../function");
const os = require("os");

//@ts-check
const useLogger = ({
    Context = {},
    Sender,
}) => {

    const device = {
        type: "node",
        origin: null,
        os: os.type(),
        platform: os.platform(),
        browser: null,
        screen: null
    };

    const projectTitle = decryptSecret(process?.env?.ENC_SELF_PROJECT_TITLE)
    const projectId = createSlug(projectTitle || "")

    return {
        error: (e) => {
            const { error, message, stack } = normalizeError(e)
            return Sender({
                timestamp: new Date().toISOString(),
                level: ERROR_LOG_LEVEL,
                projectId,
                device,
                context: Context,
                data: {
                    error,
                    message,
                    stack,
                }
            })
        },
        info: (e) => {
            const { error, message } = normalizeError(e)
            return Sender({
                timestamp: new Date().toISOString(),
                level: INFO_LOG_LEVEL,
                projectId,
                device,
                context: Context,
                data: {
                    error,
                    message,
                }
            })
        },
        critical: (e) => {
            const { error, message, stack } = normalizeError(e)
            return Sender({
                timestamp: new Date().toISOString(),
                level: CRITICAL_LOG_LEVEL,
                projectId,
                device,
                context: Context,
                data: {
                    error,
                    message,
                    stack,
                }
            })
        },
        warn: (e) => {
            const { error, message, stack } = normalizeError(e)
            return Sender({
                timestamp: new Date().toISOString(),
                level: WARNING_LOG_LEVEL,
                projectId,
                device,
                context: Context,
                data: {
                    error,
                    message,
                    stack,
                }
            })
        },
        custom: (level, {
            error,
            message,
            context
        }) => {
            return Sender({
                timestamp: new Date().toISOString(),
                level,
                projectId,
                device,
                context: {
                    ...Context,
                    context
                },
                data: {
                    error,
                    message,
                }
            })
        },
    }
}

module.exports = { useLogger };
