// @ts-check

const express = require("express");
const router = express.Router();

router.use("/webhooks", require("../../../../internal/express.routes/webhook"));
router.use("/alerts", require("../../../../internal/express.routes/alert"));

module.exports = router;
