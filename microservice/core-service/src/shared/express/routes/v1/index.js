// @ts-check

const express = require("express");
const router = express.Router();
const { useCors } = require("common/hooks");
const cors = require("cors");
const DeviceDetector = require("device-detector-js")


const privateMiddleware = useCors({
    Detector: DeviceDetector,
    Cors: cors,
});

// For PUBLIC routes (with CORS)
const publicMiddleware = useCors({
    Detector: DeviceDetector,
    Cors: cors,
    allowedOrigins: '*'
});


router.use("/projects", privateMiddleware, require("../../../../internal/express.routes/project"));
router.use("/probes", privateMiddleware, require("../../../../internal/express.routes/probe"));
router.use("/logs", publicMiddleware, require("../../../../internal/express.routes/log"));
router.use("/reports", publicMiddleware, require("../../../../internal/express.routes/report"));

module.exports = router;
