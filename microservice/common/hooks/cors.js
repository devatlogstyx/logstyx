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
    if (req.method === 'OPTIONS') {
      return Cors({
        origin: true,
        credentials: true
      })(req, res, next);
    }

    const userAgent = req.headers['user-agent'] || '';
    const origin = req.headers.origin || "";
    const device = deviceDetector.parse(userAgent);

    const corsOptions = {
      credentials: true
    };

    if (!origin) {
      corsOptions.origin = true;
    } else if (device?.client?.type === BROWSER_CLIENT_TYPE) {
      // Browser client - use custom allowedOrigins
      if (allowedOrigins === '*' || allowedOrigins.includes(origin)) {
        corsOptions.origin = origin;
      } else {
        corsOptions.origin = false;
      }
    } else {
      corsOptions.origin = true;
    }

    Cors(corsOptions)(req, res, next);
  };
};


module.exports = { useCors }