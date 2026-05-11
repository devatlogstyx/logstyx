// @ts-check

const {
    HttpError,
    HttpResponse,
} = require("common/function")

const {
    NO_ACCESS_ERR_CODE,
    NO_ACCESS_ERR_MESSAGE,
    SUCCESS_ERR_CODE,
    SUCCESS_ERR_MESSAGE,
    BROWSER_CLIENT_TYPE,
    NOT_FOUND_ERR_CODE,
    NOT_FOUND_ERR_MESSAGE,
    FORBIDDEN_ERR_CODE,
    INVALID_INPUT_ERR_CODE,
    INVALID_INPUT_ERR_MESSAGE,

} = require("common/constant");
const { submitWriteLog } = require("../../shared/provider/mq-producer");
const { logTimelineByKey } = require("../service/logger");
const { getBucketFromCache, getProjectFromCache } = require("../../shared/cache");
const { validateOrigin, validateSignature } = require("../utils/helper");
const DEAD_PROJECT_IDS = new Set();
module.exports = {

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async LogWrite(req, res) {

        let origin = null;

        if (req?.device?.client?.type === BROWSER_CLIENT_TYPE) {
            if (req?.headers?.origin) {
                origin = req.headers.origin; // Keep the full origin
            } else if (req?.headers?.referer) {
                origin = new URL(req.headers.referer).origin; // Extract full origin from referer
            }
        }

        const { projectId, appid } = req?.body ?? {}
        const { deviceClientType, signature } = req?.headers ?? {}
        const onError = (e) => {
            // log the payload, do not throw erro cos it will trigger a queue by the fe
            console.error({
                ...e,
                ip: req?.ip
            })
            HttpResponse(res).json({
                error: SUCCESS_ERR_CODE,
                message: SUCCESS_ERR_MESSAGE,
            });

        }

        if (DEAD_PROJECT_IDS.has(projectId)) {
            return onError({ projectId, appid, deviceClientType, signature });
        }

        const project = await getProjectFromCache(projectId)
        if (!project) {
            DEAD_PROJECT_IDS.add(projectId);
            return onError({ projectId, appid, deviceClientType, signature });
        }

        if (deviceClientType == BROWSER_CLIENT_TYPE) {
            validateOrigin(project, origin)
        } else if (appid) {
            validateOrigin(project, appid)
        } else if (signature) {
            validateSignature(project, req?.headers, req?.body)
        } else {
            return onError({ projectId, appid, deviceClientType, signature })
        }

        submitWriteLog({
            headers: {
                signature: req?.headers?.signature,
                timestamp: req?.headers?.timestamp,
                origin,
                deviceClientType: req?.device?.client?.type
            },
            body: req?.body
        })

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async LogGetTimelineByKey(req, res) {


        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        let bucket = await getBucketFromCache(req?.params?.id)
        if (!bucket) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const data = await logTimelineByKey(req?.params?.id, req?.params?.key)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },
};
