// @ts-check
const express = require("express");
const router = express.Router();
const { asyncHandler } = require("common/function");
const {
  ReportCreate,
  ReportPaginate,
  ReportGetBySlug,
  ReportUpdate,
  ReportRemove,
  WidgetCreate,
  WidgetList,
  WidgetUpdate,
  WidgetRemove,
  WidgetData
} = require("../express.controller/report");

router.post("/", asyncHandler(ReportCreate));
router.get("/", asyncHandler(ReportPaginate));
router.get("/:slug", asyncHandler(ReportGetBySlug));
router.put("/:id", asyncHandler(ReportUpdate));
router.delete("/:id", asyncHandler(ReportRemove));

router.post("/:reportId/widgets", asyncHandler(WidgetCreate));
router.get("/:reportId/widgets", asyncHandler(WidgetList));
router.put("/widgets/:id", asyncHandler(WidgetUpdate));
router.delete("/widgets/:id", asyncHandler(WidgetRemove));
router.get("/:slug/widgets/:widgetId/data", asyncHandler(WidgetData));

module.exports = router;
