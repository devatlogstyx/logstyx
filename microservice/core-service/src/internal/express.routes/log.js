// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");
const { LogWrite, LogGetTimeline } = require("../express.controller/log");


router.post("/", asyncHandler(LogWrite));

module.exports = router;
