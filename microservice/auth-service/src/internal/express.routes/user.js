// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");

const { UserGetMe, UserPaginate, UserRemove, UserLogin, UserLogout } = require("../express.controller/user");

router.get("/", asyncHandler(UserPaginate));
router.post("/login", asyncHandler(UserLogin));
router.post("/logout", asyncHandler(UserLogout));

router.get("/me", asyncHandler(UserGetMe));
router.delete("/:id", asyncHandler(UserRemove));


module.exports = router;
