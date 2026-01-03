// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");
const { ProbeCreate, ProbeList, ProbeUpdate, ProbeRemove, ProbeGet } = require("../express.controller/probe");

router.post("/", asyncHandler(ProbeCreate));
router.get("/", asyncHandler(ProbeList));
router.put("/:id", asyncHandler(ProbeUpdate));
router.delete("/:id", asyncHandler(ProbeRemove));
router.get("/:id", asyncHandler(ProbeGet));

module.exports = router;
