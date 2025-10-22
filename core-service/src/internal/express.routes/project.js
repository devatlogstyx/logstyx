// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");
const { ProjectCreate, ProjectRemove, ProjectPaginate, ProjectAddUser, ProjectRemoveUser, ProjectListUser } = require("../express.controller/project");


router.post("/", asyncHandler(ProjectCreate));
router.delete("/:id", asyncHandler(ProjectRemove));
router.get("/", asyncHandler(ProjectPaginate));

router.patch("/:id/users/:userId", asyncHandler(ProjectAddUser));
router.delete("/:id/users/:userId", asyncHandler(ProjectRemoveUser));
router.get("/:id/users", asyncHandler(ProjectListUser));

module.exports = router;
