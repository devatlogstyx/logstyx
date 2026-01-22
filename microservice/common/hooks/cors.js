//@ts-check

const { decryptSecret } = require("../function/encryptor");
const { BROWSER_CLIENT_TYPE } = require("./../constant/auth");
const ALLOWED_ORIGIN = decryptSecret(process?.env?.ENC_ALLOWED_ORIGIN)?.split(",") ?? []

/**
 * 
 * @param {object} param0
 * @param {*} param0.Detector
 * @param {*} param0.Cors
 * @param {string | string[] | function} [param0.allowedOrigins]
 * @returns 
 */
const useCors = ({ Detector, Cors, allowedOrigins = ALLOWED_ORIGIN }) => {
  const deviceDetector = new Detector();

  return async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const origin = req.headers.origin || "";
    const device = deviceDetector.parse(userAgent);

    const resolvedOrigins = typeof allowedOrigins === 'function'
      ? await allowedOrigins()
      : allowedOrigins;


    const corsOptions = {
      credentials: true,
      origin: false // Default to deny
    };


    if (resolvedOrigins === "*") {
      corsOptions.origin = true;
    } else {
      if (origin) {
        // Validate origin header against allowlist
        corsOptions.origin = resolvedOrigins.includes(origin) ? origin : false;
      } else {
        // Fallback to referer for browsers without origin header
        const referer = req.headers.referer || req.headers.referrer || "";
        if (referer && device?.client?.type === BROWSER_CLIENT_TYPE) {
          try {
            const refererOrigin = new URL(referer).origin;
            corsOptions.origin = resolvedOrigins.includes(refererOrigin) ? refererOrigin : false;
          } catch {
            corsOptions.origin = false;
          }
        } else {
          // Allow non-browser clients (mobile apps, etc)
          corsOptions.origin = true;
        }
      }
    }

    return Cors(corsOptions)(req, res, next);
  };
};


module.exports = { useCors }