//@ts-check

const { ALLOWED_ORIGIN, BROWSER_CLIENT_TYPE } = require("./../constant/auth");

const useCors = ({ Detector, Cors }) => {
  const deviceDetector = new Detector();

  return Cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const device = deviceDetector.parse(origin);
      if (ALLOWED_ORIGIN.includes(origin)) return callback(null, origin);

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  });
};



module.exports = { useCors }