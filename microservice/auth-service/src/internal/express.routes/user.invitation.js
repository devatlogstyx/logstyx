// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");
const { UserInvitationPaginate, UserInvitationCreate, UserInvitationRemove, UserInvitationUpdate, UserInvitationValidate } = require("../express.controller/user.invitation");


router.get("/", asyncHandler(UserInvitationPaginate));
router.post("/", asyncHandler(UserInvitationCreate));
router.put("/:id", asyncHandler(UserInvitationUpdate));
router.delete("/:id", asyncHandler(UserInvitationRemove));
router.post("/:id/validate", asyncHandler(UserInvitationValidate));

module.exports = router;
