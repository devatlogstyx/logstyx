//@ts-check
const { useMiddleware } = require("common/hooks")
const jwt = require("jsonwebtoken");
const DeviceDetector = require("device-detector-js");
const { logger: Log } = require("../../logger");
const { striptags } = require("striptags")

const {
    ValidateSignature,
    ValidateBearer,
    ValidateCookies,
    ValidateDevice,
    ExpressErrorHandler,
    ExpressNotFoundHandler,
    ExpressSuccessHandler
    // @ts-ignore
} = useMiddleware({
    Jwt: jwt,
    Log,
    Detector: DeviceDetector,
    Striptags: striptags

})

module.exports = { ExpressNotFoundHandler, ExpressSuccessHandler, ValidateSignature, ValidateBearer, ValidateCookies, ValidateDevice, ExpressErrorHandler }