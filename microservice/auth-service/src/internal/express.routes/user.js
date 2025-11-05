// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");

const { UserGetMe, UserPaginate, UserRemove, UserLogin, UserLogout, UserGetMyDashboardProjectStats, UserUpdate, UserListProject } = require("../express.controller/user");

router.get("/", asyncHandler(UserPaginate));
router.post("/login", asyncHandler(UserLogin));
router.post("/logout", asyncHandler(UserLogout));

router.get("/me", asyncHandler(UserGetMe));
router.get("/me/dashboard-project-stats", asyncHandler(UserGetMyDashboardProjectStats));
router.get("/me/projects", asyncHandler(UserListProject));


router.delete("/:id", asyncHandler(UserRemove));
router.put("/:id", asyncHandler(UserUpdate));

module.exports = router;
