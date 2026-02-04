// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");
const { BucketCreate, BucketPaginate, BucketUpdate, BucketRemove, BucketGet, BucketGetLogStatistic, BucketListDistinctValues, BucketPaginateLogs, BucketListTimeline } = require("../express.controller/bucket");
const { LogGetTimelineByKey } = require("../express.controller/log");

router.post("/", asyncHandler(BucketCreate));
router.get("/", asyncHandler(BucketPaginate));
router.get("/:id", asyncHandler(BucketGet));
router.put("/:id", asyncHandler(BucketUpdate));
router.delete("/:id", asyncHandler(BucketRemove));
router.get("/:id/logs-statistic", asyncHandler(BucketGetLogStatistic));
router.get("/:id/logs/field-values", asyncHandler(BucketListDistinctValues));
router.get("/:id/logs", asyncHandler(BucketPaginateLogs));
router.get("/:id/logs/timeline", asyncHandler(BucketListTimeline));
router.get("/:id/logs/:key/timeline", asyncHandler(LogGetTimelineByKey));

module.exports = router;
