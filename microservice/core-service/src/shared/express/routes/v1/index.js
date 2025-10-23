// @ts-check

const express = require("express");
const router = express.Router();

router.use("/projects", require("../../../../internal/express.routes/project"));
router.use("/logs", require("../../../../internal/express.routes/log"));

module.exports = router;