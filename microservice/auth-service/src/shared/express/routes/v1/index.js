// @ts-check

const express = require("express");
const router = express.Router();

router.use("/users", require("../../../../internal/express.routes/user"));
router.use("/user-invitations", require("../../../../internal/express.routes/user.invitation"));

module.exports = router;