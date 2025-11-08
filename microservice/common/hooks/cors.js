//@ts-check

const { decryptSecret } = require("../function/encryptor");
const { BROWSER_CLIENT_TYPE } = require("./../constant/auth");
const ALLOWED_ORIGIN = decryptSecret(process?.env?.ENC_ALLOWED_ORIGIN)?.split(",") ?? []
/**
 * 
 * @param {object} param0
 * @param {*} param0.Detector
 * @param {*} param0.Cors
 * @param {string | string[]} [param0.allowedOrigins]
 * @returns 
 */
const useCors = ({ Detector, Cors, allowedOrigins = ALLOWED_ORIGIN }) => {
  const deviceDetector = new Detector();

  return (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const origin = req.headers.origin || "";
    const device = deviceDetector.parse(userAgent);

    const corsOptions = {
      credentials: true,
      origin: false // Default to deny
    };

    if (origin) {
      // Validate origin header against allowlist
      corsOptions.origin = allowedOrigins.includes(origin) ? origin : false;
    } else {
      // Fallback to referer for browsers without origin header
      const referer = req.headers.referer || req.headers.referrer || "";
      if (referer && device?.client?.type === BROWSER_CLIENT_TYPE) {
        try {
          const refererOrigin = new URL(referer).origin;
          corsOptions.origin = allowedOrigins.includes(refererOrigin) ? refererOrigin : false;
        } catch {
          corsOptions.origin = false;
        }
      } else {
        // Allow non-browser clients (mobile apps, etc)
        corsOptions.origin = true;
      }
    }

    Cors(corsOptions)(req, res, next);
  };
};


module.exports = { useCors }