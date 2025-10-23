//@ts-check

const { INVALID_INPUT_ERR_CODE, SUCCESS_ERR_CODE } = require("./../constant/error");
const { parseError } = require("./error");

exports.HttpResponse = (res) => {

    return {
        error: (e) => {
            res.status(e?.error || INVALID_INPUT_ERR_CODE).json(parseError(e));
        },
        json: (e) => {
            res.status(SUCCESS_ERR_CODE).json(e);
        },
        end: (e) => {
            res.status(SUCCESS_ERR_CODE).end(e);
        }
    }
}
