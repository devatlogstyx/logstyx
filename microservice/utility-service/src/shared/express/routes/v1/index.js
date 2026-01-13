// @ts-check

const express = require("express");
const router = express.Router();

router.use("/webhooks",  require("../../../../internal/express.routes/webhook"));

module.exports = router;
