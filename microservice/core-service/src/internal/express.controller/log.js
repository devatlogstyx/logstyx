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

} = require("common/constant");
const { submitWriteLog } = require("../../shared/provider/mq-producer");
const { logTimeline } = require("../service/logger");
const { findProjectBySlug, findProjectById, canUserReadProject } = require("../service/project");

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
    async LogGetTimeline(req, res) {


        if (!req?.user) {
            throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        let project = await findProjectBySlug(req?.params?.id)
        if (!project) {
            project = await findProjectById(req?.params?.id)
        }

        if (!project) {
            throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
        }

        const canAccess = await canUserReadProject(req?.user?.id, project?.id)
        if (!canAccess) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const data = await logTimeline(req?.params?.id, req?.params?.key)

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
            data
        });
    },
};
