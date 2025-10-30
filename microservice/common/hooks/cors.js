//@ts-check

const { ALLOWED_ORIGIN, BROWSER_CLIENT_TYPE } = require("./../constant/auth");

const useCors = ({ Detector, Cors }) => {
  const deviceDetector = new Detector();

  return (req, res, next) => {
    // Allow preflight OPTIONS requests quickly
    if (req.method === 'OPTIONS') {
      return Cors({
        origin: true,
        credentials: true // <--- ADD THIS HERE TOO
      })(req, res, next);
    }

    const userAgent = req.headers['user-agent'] || '';
    const origin = req.headers.origin || "";

    const device = deviceDetector.parse(userAgent);

    const corsOptions = {
      credentials: true
    };

    if (!origin) {
      // No origin, likely non-browser client (Postman, curl)
      corsOptions.origin = true;
    } else if (device?.client?.type === BROWSER_CLIENT_TYPE) {
      // Browser client
      if (ALLOWED_ORIGIN.includes(origin)) {
        corsOptions.origin = origin;
      } else {
        corsOptions.origin = false; // Block disallowed origin
      }
    } else {
      // Non-browser client, allow all origins
      corsOptions.origin = true;
    }

    Cors(corsOptions)(req, res, next);
  };
};



module.exports = { useCors }