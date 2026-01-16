// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");
const { AlertCreate, AlertPaginate, AlertUpdate, AlertRemove, AlertGet } = require("../express.controller/alert");

router.post("/", asyncHandler(AlertCreate));
router.get("/", asyncHandler(AlertPaginate));

router.put("/:id", asyncHandler(AlertUpdate));
router.delete("/:id", asyncHandler(AlertRemove));
router.get("/:id", asyncHandler(AlertGet));

module.exports = router;
