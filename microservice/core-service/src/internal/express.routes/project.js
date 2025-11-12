// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");
const { ProjectCreate, ProjectRemove, ProjectPaginate, ProjectAddUser, ProjectRemoveUser, ProjectListUser, ProjectUpdate, ProjectGet, ProjectGetLogStatistic, ProjectPaginateLogs, ProjectListDistinctValues } = require("../express.controller/project");
const { LogGetTimeline } = require("../express.controller/log");


router.post("/", asyncHandler(ProjectCreate));
router.get("/", asyncHandler(ProjectPaginate));
router.put("/:id", asyncHandler(ProjectUpdate));
router.delete("/:id", asyncHandler(ProjectRemove));
router.get("/:id", asyncHandler(ProjectGet));

router.patch("/:id/users/:userId", asyncHandler(ProjectAddUser));
router.delete("/:id/users/:userId", asyncHandler(ProjectRemoveUser));
router.get("/:id/users", asyncHandler(ProjectListUser));
router.get("/:id/logs-statistic", asyncHandler(ProjectGetLogStatistic));
router.get("/:id/logs/field-values", asyncHandler(ProjectListDistinctValues));
router.get("/:id/logs", asyncHandler(ProjectPaginateLogs));
router.get("/:id/logs/:key/timeline", asyncHandler(LogGetTimeline));


module.exports = router;
