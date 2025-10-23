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

} = require("common/constant");
const { submitWriteLog } = require("../../shared/provider/mq-producer");

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
                origin = new URL(req.headers.origin).hostname;
            } else if (req?.headers?.referer) {
                origin = new URL(req.headers.referer).hostname;
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
};
