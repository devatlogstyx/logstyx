// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");

const { UserGetMe, UserPaginate, UserRemove, UserLogin, UserLogout, UserUpdate, UserListProject, UserUpdateProfile, UserPatchPassword, UserListBucket, UserGetMyProjectStats, UserGetMyBucketStats, UserSeed } = require("../express.controller/user");

router.get("/", asyncHandler(UserPaginate));
router.post("/seed", asyncHandler(UserSeed));
router.post("/login", asyncHandler(UserLogin));
router.post("/logout", asyncHandler(UserLogout));

router.get("/me", asyncHandler(UserGetMe));
router.get("/me/project-stats", asyncHandler(UserGetMyProjectStats));
router.get("/me/bucket-stats", asyncHandler(UserGetMyBucketStats));
router.get("/me/projects", asyncHandler(UserListProject));
router.get("/me/buckets", asyncHandler(UserListBucket));
router.put("/me", asyncHandler(UserUpdateProfile));
router.patch("/me/password", asyncHandler(UserPatchPassword));


router.delete("/:id", asyncHandler(UserRemove));
router.put("/:id", asyncHandler(UserUpdate));

module.exports = router;
