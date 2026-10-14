import User from "../models/User.js";
import Course from "../models/Course.js";
import Quiz from "../models/Quiz.js";
import Enrollment from "../models/Enrollment.js";
import { testApiKeyConnection, AVAILABLE_MODELS } from "../lib/groq.js";
import { uploadToCloudinary, isCloudinaryConfigured } from "../lib/cloudinary.js";

const maskApiKey = (key) => {
  if (!key || key.length < 8) return "";
  const prefix = key.slice(0, 4);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
};

// ── GET /api/user/profile ──────────────────────────────────────────────
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -refreshToken",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ── Check Admin Status ──────────────────────────────────────────
    const adminEmail = (process.env.ADMIN_EMAIL || "himanshu@gmail.com").toLowerCase().trim();
    const isAdmin =
      user.role === "admin" ||
      (user.email && user.email.toLowerCase().trim() === adminEmail);

    // ── Aggregate Stats (Strictly exclude Preview Courses) ───────────
    const [coursesGenerated, quizzesPassed, coursesEnrolled, completedCourses, quizzesAttempted, scoreAgg] =
      await Promise.all([
        Course.countDocuments({
          createdBy: req.user._id,
          previewCourse: { $nin: [true, "true"] },
        }),
        Quiz.countDocuments({ userId: req.user._id, passed: true }),
        Enrollment.countDocuments({ userId: req.user._id }),
        Enrollment.countDocuments({ userId: req.user._id, progress: 100 }),
        Quiz.countDocuments({ userId: req.user._id, attempted: true }),
        Quiz.aggregate([
          { $match: { userId: req.user._id, attempted: true } },
          { $group: { _id: null, avgScore: { $avg: "$score" } } },
        ]),
      ]);

    const averageQuizScore = scoreAgg[0]?.avgScore
      ? Math.round(scoreAgg[0].avgScore)
      : 0;

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        avatar: user.avatar,
        createdAt: user.createdAt,
        role: isAdmin ? "admin" : (user.role || "user"),
        isAdmin: Boolean(isAdmin),
      },
      apiKeys: {
        hasGroqKey: Boolean(user.apiKeys?.groq),
        maskedGroqKey: maskApiKey(user.apiKeys?.groq),
        hasGeminiKey: Boolean(user.apiKeys?.gemini),
        maskedGeminiKey: maskApiKey(user.apiKeys?.gemini),
      },
      stats: {
        coursesGenerated,
        quizzesPassed,
        coursesEnrolled,
        completedCourses,
        quizzesAttempted,
        averageQuizScore,
      },
      availableModels: AVAILABLE_MODELS,
      isCloudinaryConfigured: isCloudinaryConfigured(),
    });
  } catch (error) {
    console.error("getUserProfile error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error.message,
    });
  }
};

// ── PUT /api/user/profile ──────────────────────────────────────────────
export const updateUserProfile = async (req, res) => {
  try {
    const { name, gender, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name) user.name = name.trim();
    if (gender) user.gender = gender;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("updateUserProfile error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// ── PUT /api/user/api-keys ─────────────────────────────────────────────
export const updateApiKeys = async (req, res) => {
  try {
    const { groqKey, geminiKey } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.apiKeys) {
      user.apiKeys = { groq: "", gemini: "" };
    }

    if (groqKey !== undefined) {
      user.apiKeys.groq = (groqKey || "").trim();
    }

    if (geminiKey !== undefined) {
      user.apiKeys.gemini = (geminiKey || "").trim();
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "API keys updated successfully",
      apiKeys: {
        hasGroqKey: Boolean(user.apiKeys.groq),
        maskedGroqKey: maskApiKey(user.apiKeys.groq),
        hasGeminiKey: Boolean(user.apiKeys.gemini),
        maskedGeminiKey: maskApiKey(user.apiKeys.gemini),
      },
    });
  } catch (error) {
    console.error("updateApiKeys error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update API keys",
      error: error.message,
    });
  }
};

// ── POST /api/user/test-api-key ────────────────────────────────────────
export const testApiKey = async (req, res) => {
  try {
    const { provider = "groq", apiKey, model } = req.body;

    let keyToTest = apiKey;

    // If key not provided in body, check if user has one saved in DB
    if (!keyToTest) {
      const user = await User.findById(req.user._id);
      keyToTest = user?.apiKeys?.[provider];
    }

    if (!keyToTest) {
      return res.status(400).json({
        success: false,
        message: `No ${provider.toUpperCase()} API key provided to test`,
      });
    }

    const testResult = await testApiKeyConnection({
      provider,
      apiKey: keyToTest,
      model,
    });

    if (testResult.success) {
      return res.status(200).json(testResult);
    } else {
      return res.status(400).json(testResult);
    }
  } catch (error) {
    console.error("testApiKey error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to run API key test",
      error: error.message,
    });
  }
};

// ── POST /api/user/upload-avatar ───────────────────────────────────────
export const uploadAvatar = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "No image data provided for upload",
      });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        success: false,
        message:
          "Cloudinary credentials are not configured in server/.env. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env",
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(image, {
      folder: "learnova_avatars",
    });

    // Update user in MongoDB
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.avatar = uploadResult.url;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully to Cloudinary",
      avatar: uploadResult.url,
    });
  } catch (error) {
    console.error("uploadAvatar error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload avatar to Cloudinary",
      error: error.message,
    });
  }
};

