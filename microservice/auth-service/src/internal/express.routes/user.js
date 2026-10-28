// @ts-check

const express = require("express");

const router = express.Router();
const { asyncHandler } = require("common/function");

const {
    UserGetMe, UserPaginate, UserRemove, UserLogin, UserLogout, UserUpdate, UserListProject, UserUpdateProfile, UserPatchPassword, UserListBucket, UserGetMyProjectStats, UserGetMyBucketStats, UserSeed,
    UserLoginMfa, UserLoginMfaSetup, UserLoginMfaEnable,
    UserMfaSetup, UserMfaEnable, UserMfaDisable, UserMfaRecoveryCodes, UserMfaReset,
} = require("../express.controller/user");

router.get("/", asyncHandler(UserPaginate));
router.post("/seed", asyncHandler(UserSeed));
router.post("/login", asyncHandler(UserLogin));
router.post("/logout", asyncHandler(UserLogout));

// public, but only with the mfaToken from a correct password
router.post("/login/2fa", asyncHandler(UserLoginMfa));
router.post("/login/2fa/setup", asyncHandler(UserLoginMfaSetup));
router.post("/login/2fa/enable", asyncHandler(UserLoginMfaEnable));

router.get("/me", asyncHandler(UserGetMe));
router.get("/me/project-stats", asyncHandler(UserGetMyProjectStats));
router.get("/me/bucket-stats", asyncHandler(UserGetMyBucketStats));
router.get("/me/projects", asyncHandler(UserListProject));
router.get("/me/buckets", asyncHandler(UserListBucket));
router.put("/me", asyncHandler(UserUpdateProfile));
router.patch("/me/password", asyncHandler(UserPatchPassword));
router.post("/me/2fa/setup", asyncHandler(UserMfaSetup));
router.post("/me/2fa/enable", asyncHandler(UserMfaEnable));
router.post("/me/2fa/disable", asyncHandler(UserMfaDisable));
router.post("/me/2fa/recovery-codes", asyncHandler(UserMfaRecoveryCodes));

router.delete("/:id/2fa", asyncHandler(UserMfaReset));
router.delete("/:id", asyncHandler(UserRemove));
router.put("/:id", asyncHandler(UserUpdate));

module.exports = router;
