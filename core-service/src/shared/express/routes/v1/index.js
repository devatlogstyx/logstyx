// @ts-check

const express = require("express");
const router = express.Router();

router.use("/projects", require("../../../../internal/express.routes/project"));

module.exports = router;