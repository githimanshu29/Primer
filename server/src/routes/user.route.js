import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  updateApiKeys,
  testApiKey,
  uploadAvatar,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/api-keys", protect, updateApiKeys);
router.post("/test-api-key", protect, testApiKey);
router.post("/upload-avatar", protect, uploadAvatar);

export default router;
