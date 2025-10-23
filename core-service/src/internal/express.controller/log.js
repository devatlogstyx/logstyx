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

} = require("common/constant");
const { createProject, canUserModifyProject, removeProject, paginateProject, addUserToProject, removeUserFromProject, listUserFromProject, updateProject } = require("../service/project");
const { submitWriteLog } = require("../../shared/provider/mq-producer");

module.exports = {

    /**
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async LogWrite(req, res) {

        let origin = null;

        if (req?.headers?.origin) {
            origin = new URL(req.headers.origin).hostname;
            // "https://example.com" → "example.com"
        } else if (req?.headers?.referer) {
            origin = new URL(req.headers.referer).hostname;
            // "https://example.com/page?query=1" → "example.com"
        }

        submitWriteLog({
            headers: {
                signature: req?.headers?.signature,
                timestamp: req?.headers?.timestamp,
                origin,
            },
            body: req?.body
        })

        HttpResponse(res).json({
            error: SUCCESS_ERR_CODE,
            message: SUCCESS_ERR_MESSAGE,
        });
    },
};
