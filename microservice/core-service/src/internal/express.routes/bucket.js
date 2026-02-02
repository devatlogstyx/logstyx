// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");
const { BucketCreate, BucketPaginate, BucketUpdate, BucketRemove } = require("../express.controller/bucket");

router.post("/", asyncHandler(BucketCreate));
router.get("/", asyncHandler(BucketPaginate));
router.put("/:id", asyncHandler(BucketUpdate));
router.delete("/:id", asyncHandler(BucketRemove));

module.exports = router;
