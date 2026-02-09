//@ts-check

const { decryptSecret } = require("../function/encryptor");
const {
    BEARER_MIDDLEWARE_VALIDATION_SOURCE,
    ADMIN_TOKEN_COOKIE_NAME,
    COOKIE_MIDDLEWARE_VALIDATION_SOURCE,
    USER_TOKEN_COOKIE_NAME,
    BROWSER_CLIENT_TYPE,
    CLEAR_COOKIE_OPTION,
    CREATE_COOKIE_OPTION,
    SIGNATURE_MIDDLEWARE_VALIDATION_SOURCE,
    SUCCESS_LOG_LEVEL,
    ERROR_LOG_LEVEL,
    NOT_FOUND_ERR_CODE,
    NOT_FOUND_ERR_MESSAGE,
    ALLOWED_HTML_TAGS,
} = require("./../constant");

const { HttpResponse } = require("./../function/response");
const { redactObject, sanitizeForHTML } = require("./../function/string");

const ADMIN_AUTHENTICATION_JWT_SECRET = decryptSecret(process?.env?.ENC_ADMIN_AUTHENTICATION_JWT_SECRET)
const USER_AUTHENTICATION_JWT_SECRET = decryptSecret(process?.env?.ENC_USER_AUTHENTICATION_JWT_SECRET)

const isAdmin = (token, Jwt) => {

    try {

        return Jwt.verify(token, ADMIN_AUTHENTICATION_JWT_SECRET);
    } catch (e) {
        return null
    }
};

const isUser = (token, Jwt) => {
    try {

        return Jwt.verify(token, USER_AUTHENTICATION_JWT_SECRET);
    } catch (e) {
        return null
    }
};

const ValidateBearer = (req, res, next, Jwt, Log) => {
    try {

        if (req?.admin || req?.user) {
            next()
            return
        }

        const { authorization } = req.headers;

        if (!authorization) {
            next()
            return
        }

        if (
            !authorization ||
            authorization.split(" ").length < 1 ||
            authorization.split(" ")[0] !== "Bearer"
        ) {
            next()
            return
        }

        const token = authorization.split(" ")[1];

        let admin = isAdmin(token, Jwt);
        if (admin) {

            req.admin = admin;
            req.validationSource = BEARER_MIDDLEWARE_VALIDATION_SOURCE
            next();
            return;
        }

        let user = isUser(token, Jwt);
        if (user) {

            req.user = user;
            req.validationSource = BEARER_MIDDLEWARE_VALIDATION_SOURCE
            next();
            return;
        }


        next();
    } catch (e) {
        Log?.error?.(e)
        HttpResponse(res).error(e)
    }
    return;
}

const shouldRefreshToken = (token, Jwt, bufferInSeconds = 600) => {
    try {
        const decoded = Jwt.decode(token);
        const now = Math.floor(Date.now() / 1000);
        return decoded?.exp && decoded.exp - now < bufferInSeconds;
    } catch {
        return false;
    }
};

const processAuthCookies = ({
    token,
    validator,
    signSecret,
    cookieName,
    setReqProp,
    req,
    res,
    Jwt
}) => {
    const entity = validator(token, Jwt);
    if (!entity) return false;

    req[setReqProp] = entity;
    req.validationSource = COOKIE_MIDDLEWARE_VALIDATION_SOURCE;

    if (shouldRefreshToken(token, Jwt)) {
        const { exp, ...payloadWithoutExp } = entity;
        const newToken = Jwt.sign(payloadWithoutExp, signSecret, { expiresIn: 60 * 60 });
        res?.cookie?.(cookieName, newToken, CREATE_COOKIE_OPTION);
    }

    return true;
};

const ValidateCookies = async (req, res, next, Jwt, Log) => {
    if (req?.admin || req?.user) return next();

    const adminToken = req?.cookies?.[ADMIN_TOKEN_COOKIE_NAME];
    const userToken = req?.cookies?.[USER_TOKEN_COOKIE_NAME];

    try {

        if (adminToken) {
            const adminValidated = processAuthCookies({
                token: adminToken,
                validator: isAdmin,
                signSecret: ADMIN_AUTHENTICATION_JWT_SECRET,
                cookieName: ADMIN_TOKEN_COOKIE_NAME,
                setReqProp: "admin",
                req,
                res,
                Jwt
            });
            if (adminValidated) return next();
            res?.clearCookie?.(ADMIN_TOKEN_COOKIE_NAME);
        }

        if (userToken) {
            const userValidated = userToken && processAuthCookies({
                token: userToken,
                validator: isUser,
                signSecret: USER_AUTHENTICATION_JWT_SECRET,
                cookieName: USER_TOKEN_COOKIE_NAME,
                setReqProp: "user",
                req,
                res,
                Jwt
            });

            if (userValidated) return next();
            res?.clearCookie?.(USER_TOKEN_COOKIE_NAME);

        }
        next();
    } catch (e) {
        adminToken && res?.clearCookie?.(ADMIN_TOKEN_COOKIE_NAME);
        userToken && res?.clearCookie?.(USER_TOKEN_COOKIE_NAME);
        Log?.error?.(e);
        HttpResponse(res).error(e);
    }
};


const ValidateDevice = async (req, res, next, Detector, Log) => {
    try {

        const deviceDetector = new Detector();
        const device = deviceDetector.parse(req?.get?.('User-Agent'));

        req.device = device

        next();
    } catch (e) {
        Log?.error?.(e);
        HttpResponse(res).error(e)
    }
    return;
}

const ValidateSignature = async (req, res, next, Signature, Log) => {
    try {
        if (req?.admin || req?.user) return next();

        const { appid, signature } = req.headers;

        if (!appid || !signature) {
            next()
            return
        }

        const payload = {
            headers: req?.headers ?? {},
            body: req?.body ?? {},
            query: req?.query ?? {},
            path: req?.path
        }

        let admin = await Signature?.admin?.(payload);

        if (admin) {
            req.admin = admin;
            req.validationSource = SIGNATURE_MIDDLEWARE_VALIDATION_SOURCE;
            return next();
        }

        let user = await Signature?.user?.(payload);
        if (user) {
            req.user = user;
            req.validationSource = SIGNATURE_MIDDLEWARE_VALIDATION_SOURCE;
            return next();
        }

        return next();
    } catch (e) {
        Log?.error?.(e);
        return res.status(500).json({ error: e.message || 'Internal server error' });
    }
};

const useMiddleware = ({
    Jwt,
    Log,
    Detector,
    Signature,
    Striptags
}) => {
    return {
        ValidateSignature: (req, res, next) => {
            return ValidateSignature(req, res, next, Signature)
        },
        ValidateBearer: (req, res, next) => {
            return ValidateBearer(req, res, next, Jwt, Log)
        },
        ValidateCookies: (req, res, next) => {
            return ValidateCookies(req, res, next, Jwt, Log)
        },
        ValidateDevice: (req, res, next) => {
            return ValidateDevice(req, res, next, Detector, Log)
        },
        ExpressSuccessHandler: (req, res, next) => {
            const methods = ["send", "json", "end"];
            const originals = {};
            let logged = false;

            methods.forEach((m) => {
                originals[m] = res[m];
                res[m] = ((method) => {
                    return function (...args) {
                        // Sanitize response data before sending
                        if (args.length > 0 && (method === "json" || method === "send")) {
                            if (args[0] !== null && args[0] !== undefined) {
                                try {
                                    args[0] = sanitizeForHTML(args[0], Striptags);
                                } catch (error) {
                                    console.error('Sanitization error:', error);
                                }
                            }
                        }

                        // Existing logging logic
                        if (
                            !logged &&
                            res.statusCode >= 200 &&
                            res.statusCode < 300 &&
                            ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
                        ) {
                            logged = true;
                            if (typeof Log.custom === "function") {
                                Log?.custom?.(SUCCESS_LOG_LEVEL, {
                                    title: `${req.method} ${req.path}`,
                                    message: "Request completed successfully",
                                    query: redactObject(req.query),
                                    body: redactObject(req.body),
                                    admin: redactObject(req.admin),
                                    user: redactObject(req.user),
                                    response: method === "json" || method === "send" ? redactObject(args[0]) : null
                                });
                            }
                        }

                        return originals[method].apply(this, args);
                    };
                })(m);
            });

            next();
        },
        ExpressNotFoundHandler: (req, res, next) => {
            next({ error: NOT_FOUND_ERR_CODE, message: NOT_FOUND_ERR_MESSAGE });
        },
        ExpressErrorHandler: (err, req, res, next) => {
            HttpResponse(res).error(err);
            Log?.custom?.(ERROR_LOG_LEVEL, {
                title: `${req.method} ${req.path}`,
                message: err?.message,
                stack: err?.stack,
                query: redactObject(req.query),
                body: redactObject(req.body),
                admin: redactObject(req.admin),
                user: redactObject(req.user),
            });
        }
    }
}


module.exports = {
    useMiddleware
}