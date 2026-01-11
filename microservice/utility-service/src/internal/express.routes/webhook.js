// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");
const { WebhookCreate, WebhookList, WebhookTestConnection, WebhookUpdate, WebhookRemove, WebhookGet } = require("../express.controller/webhook");

router.post("/", asyncHandler(WebhookCreate));
router.get("/", asyncHandler(WebhookList));

router.post("/test-connection", asyncHandler(WebhookTestConnection));
router.put("/:id", asyncHandler(WebhookUpdate));
router.delete("/:id", asyncHandler(WebhookRemove));
router.get("/:id", asyncHandler(WebhookGet));

module.exports = router;
