// @ts-check

const express = require("express");
const router = express.Router();

router.use("/users", require("../../../../internal/express.routes/user"));

module.exports = router;